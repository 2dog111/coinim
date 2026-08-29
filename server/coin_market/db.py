from __future__ import annotations

import json
import os
import shutil
import sqlite3
from contextlib import contextmanager
from datetime import timedelta
from pathlib import Path
from typing import Iterator, Optional

from .config import Settings
from .core import iso, parse_iso, utc_now


class Database:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.path = settings.database_path

    def connect(self) -> sqlite3.Connection:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        fresh = not self.path.exists()
        connection = sqlite3.connect(self.path, timeout=15, isolation_level=None)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA journal_mode = WAL")
        connection.execute("PRAGMA synchronous = FULL")
        connection.execute("PRAGMA busy_timeout = 15000")
        if fresh:
            os.chmod(self.path, 0o600)
        return connection

    @contextmanager
    def transaction(self, *, immediate: bool = True) -> Iterator[sqlite3.Connection]:
        connection = self.connect()
        try:
            connection.execute("BEGIN IMMEDIATE" if immediate else "BEGIN")
            yield connection
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()

    def migrate(self) -> list[str]:
        applied: list[str] = []
        migration_root = Path(__file__).with_name("migrations")
        with self.transaction() as connection:
            connection.execute(
                "CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)"
            )
            known = {
                row[0]
                for row in connection.execute("SELECT version FROM schema_migrations").fetchall()
            }
            for source in sorted(migration_root.glob("*.sql")):
                version = source.stem
                if version in known:
                    continue
                script = source.read_text(encoding="utf-8")
                for statement in split_sql_script(script):
                    connection.execute(statement)
                connection.execute(
                    "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
                    (version, iso(utc_now())),
                )
                applied.append(version)
        return applied

    def backup(self, destination_root: Path) -> Optional[Path]:
        if not self.path.exists():
            return None
        destination_root.mkdir(parents=True, exist_ok=True)
        stamp = utc_now().strftime("%Y%m%dT%H%M%SZ")
        destination = destination_root / f"market-{stamp}.sqlite3"
        source = sqlite3.connect(self.path)
        target = sqlite3.connect(destination)
        try:
            source.backup(target)
        finally:
            target.close()
            source.close()
        os.chmod(destination, 0o600)
        return destination

    def cleanup_expired_locks(self, *, mutate: bool = True, now=None) -> list[str]:
        now_text = iso(now or utc_now())
        with self.transaction() as connection:
            rows = connection.execute(
                """SELECT l.intent_id
                   FROM takeover_locks l
                   JOIN payment_intents i ON i.id = l.intent_id
                   WHERE l.expires_at <= ?
                     AND i.status IN ('created', 'payment_found')""",
                (now_text,),
            ).fetchall()
            intent_ids = [row["intent_id"] for row in rows]
            if mutate and intent_ids:
                placeholders = ",".join("?" for _ in intent_ids)
                connection.execute(
                    f"UPDATE payment_intents SET status = 'expired' WHERE id IN ({placeholders}) AND status IN ('created', 'payment_found')",
                    intent_ids,
                )
                connection.execute(
                    f"DELETE FROM takeover_locks WHERE intent_id IN ({placeholders})",
                    intent_ids,
                )
                for intent_id in intent_ids:
                    insert_event(connection, None, "takeover_quote_expired", {"intentId": intent_id})
            return intent_ids


def split_sql_script(script: str) -> list[str]:
    statements: list[str] = []
    buffer: list[str] = []
    for line in script.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("--"):
            continue
        buffer.append(line)
        if stripped.endswith(";"):
            statements.append("\n".join(buffer).rstrip().removesuffix(";"))
            buffer = []
    if buffer:
        statements.append("\n".join(buffer))
    return statements


def insert_event(connection: sqlite3.Connection, reign_id: Optional[int], event_type: str, payload: dict) -> int:
    cursor = connection.execute(
        "INSERT INTO live_events (reign_id, type, payload_json, created_at) VALUES (?, ?, ?, ?)",
        (reign_id, event_type, json.dumps(payload, ensure_ascii=False, separators=(",", ":")), iso(utc_now())),
    )
    return int(cursor.lastrowid)


def insert_outbox(connection: sqlite3.Connection, job_type: str, payload: dict, key: str) -> None:
    now_text = iso(utc_now())
    connection.execute(
        """INSERT OR IGNORE INTO outbox
           (type, payload_json, idempotency_key, status, attempts, next_attempt_at, created_at)
           VALUES (?, ?, ?, 'pending', 0, ?, ?)""",
        (job_type, json.dumps(payload, ensure_ascii=False, separators=(",", ":")), key, now_text, now_text),
    )


def active_reign(connection: sqlite3.Connection) -> Optional[sqlite3.Row]:
    return connection.execute(
        """SELECT r.*, m.slug, m.message, m.signature, m.location, m.url, m.cta_label,
                  m.status AS message_status
           FROM reigns r JOIN messages m ON m.id = r.message_id
           WHERE r.status = 'active' LIMIT 1"""
    ).fetchone()


def wall_slot_reign(connection: sqlite3.Connection, slot_number: int) -> Optional[sqlite3.Row]:
    return connection.execute(
        """SELECT r.*, m.slug, m.message, m.signature, m.location, m.url, m.cta_label,
                  m.status AS message_status, m.wall_slot_number
           FROM reigns r JOIN messages m ON m.id = r.message_id
           WHERE m.wall_slot_number = ?
           ORDER BY r.started_at DESC, r.id DESC LIMIT 1""",
        (slot_number,),
    ).fetchone()


def reign_by_public_id(connection: sqlite3.Connection, public_id: str) -> Optional[sqlite3.Row]:
    return connection.execute(
        """SELECT r.*, m.slug, m.message, m.signature, m.location, m.url, m.cta_label,
                  m.status AS message_status, m.wall_slot_number
           FROM reigns r JOIN messages m ON m.id = r.message_id
           WHERE r.public_id = ?""",
        (public_id,),
    ).fetchone()


def payments_for_reign(connection: sqlite3.Connection, reign_id: int) -> list[sqlite3.Row]:
    return connection.execute(
        "SELECT * FROM payments WHERE reign_id = ? ORDER BY confirmed_at, id", (reign_id,)
    ).fetchall()


def metrics_for_reign(connection: sqlite3.Connection, reign_id: int) -> dict[str, int]:
    row = connection.execute(
        """SELECT COALESCE(SUM(unique_visitors), 0), COALESCE(SUM(verified_readers), 0),
                  COALESCE(SUM(outbound_clicks), 0), COALESCE(MAX(countries_count), 0),
                  COALESCE(SUM(share_arrivals), 0)
           FROM message_metrics_daily WHERE reign_id = ?""",
        (reign_id,),
    ).fetchone()
    return {
        "uniqueVisitors": int(row[0]),
        "verifiedReaders": int(row[1]),
        "outboundClicks": int(row[2]),
        "countries": int(row[3]),
        "shareArrivals": int(row[4]),
    }


def snapshot_by_public_id(connection: sqlite3.Connection, public_id: str) -> Optional[sqlite3.Row]:
    return connection.execute(
        "SELECT * FROM result_snapshots WHERE public_id = ?", (public_id,)
    ).fetchone()
