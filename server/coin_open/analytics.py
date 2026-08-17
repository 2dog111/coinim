"""Учёт посетителей и нажатий на кнопки.

Отдельный модуль: приём файлов о нём ничего не знает, и любая ошибка здесь
не должна мешать основной работе сервиса.

Что храним. Идентификатор посетителя это HMAC от IP и User-Agent на соли,
которая меняется каждые сутки. Ни адрес, ни User-Agent в базу не попадают,
а вчерашние идентификаторы сегодня уже не сходятся, поэтому связать визиты
между днями нельзя. Этого хватает, чтобы считать уникальных за день, и не
хватает, чтобы следить за человеком.

Кого не считаем. Маяк отправляется скриптом, поэтому обычные краулеры и
большинство ИИ-обходчиков отсекаются сами: они не исполняют JavaScript.
Сверх этого отсекаем по User-Agent известных ботов и пустые значения.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import re
import sqlite3
from datetime import UTC, datetime, timedelta
from pathlib import Path

DB_NAME = "analytics.sqlite3"
MAX_TEXT = 120

BOT_RE = re.compile(
    r"bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|"
    r"headless|phantomjs|python-requests|curl|wget|httpx|axios|scrapy|"
    r"gptbot|oai-searchbot|chatgpt-user|claudebot|claude-web|anthropic|perplexity|"
    r"ccbot|bytespider|amazonbot|applebot|google-extended|meta-externalagent",
    re.I,
)


def db_path(data_root: Path) -> Path:
    return data_root / DB_NAME


def connect(data_root: Path) -> sqlite3.Connection:
    path = db_path(data_root)
    fresh = not path.exists()
    conn = sqlite3.connect(path, timeout=5)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute(
        """CREATE TABLE IF NOT EXISTS visits (
            day TEXT NOT NULL,
            visitor TEXT NOT NULL,
            page TEXT NOT NULL,
            first_seen TEXT NOT NULL,
            hits INTEGER NOT NULL DEFAULT 1,
            PRIMARY KEY (day, visitor, page)
        )"""
    )
    conn.execute(
        """CREATE TABLE IF NOT EXISTS clicks (
            at TEXT NOT NULL,
            day TEXT NOT NULL,
            visitor TEXT NOT NULL,
            page TEXT NOT NULL,
            target TEXT NOT NULL
        )"""
    )
    conn.execute("CREATE INDEX IF NOT EXISTS clicks_day ON clicks (day)")
    conn.commit()
    if fresh:
        os.chmod(path, 0o600)
    return conn


def clean(value: object, limit: int = MAX_TEXT) -> str:
    if not isinstance(value, str):
        return ""
    value = value.strip().replace("\n", " ")[:limit]
    return "".join(ch for ch in value if ch.isprintable())


def visitor_id(key: bytes, ip: str, agent: str, day: str) -> str:
    salt = hashlib.sha256(key + day.encode()).digest()
    return hmac.new(salt, f"{ip}|{agent}".encode(), hashlib.sha256).hexdigest()[:32]


def is_bot(agent: str) -> bool:
    return not agent or bool(BOT_RE.search(agent))


def record(data_root: Path, key: bytes, ip: str, agent: str, payload: dict) -> None:
    """Записывает просмотр или нажатие. Ошибки гасим у вызывающего."""
    if is_bot(agent):
        return
    now = datetime.now(UTC)
    day = now.strftime("%Y-%m-%d")
    visitor = visitor_id(key, ip, agent, day)
    page = clean(payload.get("page")) or "/"
    kind = clean(payload.get("type"), 16)

    conn = connect(data_root)
    try:
        if kind == "click":
            target = clean(payload.get("target"), 60)
            if not target:
                return
            conn.execute(
                "INSERT INTO clicks (at, day, visitor, page, target) VALUES (?, ?, ?, ?, ?)",
                (now.isoformat(timespec="seconds"), day, visitor, page, target),
            )
        else:
            conn.execute(
                """INSERT INTO visits (day, visitor, page, first_seen, hits)
                   VALUES (?, ?, ?, ?, 1)
                   ON CONFLICT (day, visitor, page)
                   DO UPDATE SET hits = hits + 1""",
                (day, visitor, page, now.isoformat(timespec="seconds")),
            )
        conn.commit()
    finally:
        conn.close()


def summary(data_root: Path, days: int = 30) -> dict:
    since = (datetime.now(UTC) - timedelta(days=days)).strftime("%Y-%m-%d")
    conn = connect(data_root)
    try:
        rows = conn.execute(
            """SELECT day, COUNT(DISTINCT visitor) AS people, SUM(hits) AS views
               FROM visits WHERE day >= ? GROUP BY day ORDER BY day DESC""",
            (since,),
        ).fetchall()
        pages = conn.execute(
            """SELECT page, COUNT(DISTINCT visitor) AS people, SUM(hits) AS views
               FROM visits WHERE day >= ? GROUP BY page ORDER BY people DESC""",
            (since,),
        ).fetchall()
        clicks = conn.execute(
            """SELECT target, page, COUNT(*) AS presses, COUNT(DISTINCT visitor) AS people
               FROM clicks WHERE day >= ? GROUP BY target, page ORDER BY presses DESC""",
            (since,),
        ).fetchall()
        recent = conn.execute(
            """SELECT at, page, target FROM clicks WHERE day >= ?
               ORDER BY at DESC LIMIT 40""",
            (since,),
        ).fetchall()
        total_people = conn.execute(
            "SELECT COUNT(DISTINCT visitor) FROM visits WHERE day >= ?", (since,)
        ).fetchone()[0]
    finally:
        conn.close()
    return {
        "days": days,
        "total_people": total_people,
        "by_day": rows,
        "by_page": pages,
        "clicks": clicks,
        "recent": recent,
    }


def escape(value: object) -> str:
    return (
        str(value)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def panel_html(data: dict) -> str:
    def table(caption: str, headers: list[str], rows: list) -> str:
        head = "".join(f"<th>{escape(h)}</th>" for h in headers)
        body = "".join(
            "<tr>" + "".join(f"<td>{escape(cell)}</td>" for cell in row) + "</tr>"
            for row in rows
        ) or f'<tr><td colspan="{len(headers)}">пока пусто</td></tr>'
        return (
            f"<h2>{escape(caption)}</h2>"
            f"<table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table>"
        )

    parts = [
        table("По дням", ["День", "Люди", "Просмотры"], data["by_day"]),
        table("По страницам", ["Страница", "Люди", "Просмотры"], data["by_page"]),
        table("Кнопки", ["Кнопка", "Страница", "Нажатий", "Людей"], data["clicks"]),
        table("Последние нажатия", ["Когда", "Страница", "Кнопка"], data["recent"]),
    ]
    return f"""<!doctype html>
<html lang="ru"><head><meta charset="utf-8">
<meta name="robots" content="noindex, nofollow">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>coin.im, посещаемость</title>
<style>
  body {{ margin: 0 auto; padding: 2.5rem 1.25rem 6rem; max-width: 60rem;
         background: #f8f4ee; color: #241f1b;
         font: 400 16px/1.6 Georgia, "Times New Roman", serif; }}
  h1 {{ font-size: 1.6rem; font-weight: 400; margin: 0 0 0.35rem; }}
  h2 {{ font-size: 1.1rem; font-weight: 400; margin: 2.75rem 0 0.6rem; }}
  p.note {{ margin: 0 0 1rem; color: #6f665e; font-size: 0.86rem; }}
  table {{ width: 100%; border-collapse: collapse;
           font: 400 0.84rem/1.5 ui-monospace, "SF Mono", Menlo, monospace; }}
  th, td {{ padding: 0.45rem 0.6rem; text-align: left;
            border-bottom: 1px solid #e3d9cc; }}
  th {{ color: #6f665e; font-weight: 400; }}
  td:nth-child(n+2) {{ font-variant-numeric: tabular-nums; }}
</style></head><body>
<h1>Посещаемость coin.im</h1>
<p class="note">За {escape(data['days'])} дней. Уникальных людей: {escape(data['total_people'])}.
Боты и обходчики не считаются: маяк отправляет скрипт, а известные краулеры отсекаются по User-Agent.
Адреса и User-Agent не хранятся, идентификатор посетителя это хеш на соли, которая меняется каждые сутки.</p>
{''.join(parts)}
</body></html>"""
