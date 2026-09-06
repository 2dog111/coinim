from __future__ import annotations

import argparse
import json
import os
import smtplib
import sys
from datetime import timedelta
from email.message import EmailMessage
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen

from .config import Settings
from .capture_client import service_health
from .core import MarketError, parse_iso, utc_now
from .db import Database
from .market import MarketService
from .payments import PaymentPending, provider_from_settings


def runtime() -> tuple[Settings, Database, MarketService]:
    settings = Settings.from_env()
    database = Database(settings)
    database.migrate()
    provider = provider_from_settings(settings)
    return settings, database, MarketService(settings, database, provider)


def verify_environment(settings: Settings, *, production: bool) -> dict:
    checks = {
        "siteUrl": settings.site_url.startswith("https://") if production else bool(settings.site_url),
        "sessionSecret": len(settings.session_secret) >= 32,
        "adminPassword": len(settings.admin_password) >= 12,
        "databaseParent": settings.database_path.parent.exists() and os.access(settings.database_path.parent, os.W_OK),
        "provider": (
            settings.tron_provider == "trongrid"
            if production and settings.market_enabled
            else settings.tron_provider in {"trongrid", "mock", "disabled"}
        ),
        "receiveAddress": bool(settings.receive_address) if settings.market_enabled else True,
        "contractAddress": bool(settings.contract_address) if settings.market_enabled else True,
        "tronGridKey": bool(settings.trongrid_api_key) if settings.market_enabled and settings.tron_provider == "trongrid" else True,
        "mockNotProduction": not (production and settings.tron_provider == "mock"),
        "linearDecay24h": settings.power_lifetime_seconds == 86400,
        "quoteSevenMinutes": settings.quote_seconds == 420,
        "noProtectedPremiere": settings.protection_seconds == 0 and settings.incoming_countdown_seconds == 0,
        "screenshotService": service_health(settings.screenshot_service_url) if production and settings.market_enabled else True,
    }
    return {"ok": all(checks.values()), "marketEnabled": settings.market_enabled, "checks": checks}


def reconcile_payments(service: MarketService, *, apply: bool) -> dict:
    service.database.cleanup_expired_locks(mutate=True)
    discovery_since = (utc_now() - timedelta(days=7)).isoformat(timespec="seconds").replace("+00:00", "Z")
    connection = service.database.connect()
    try:
        rows = connection.execute(
            """SELECT id, submitted_txid, status, created_at, requested_amount_micro
               FROM payment_intents
               WHERE status IN ('created', 'payment_found')
                  OR (status = 'expired' AND submitted_txid IS NOT NULL AND created_at >= ?)""",
            (discovery_since,),
        ).fetchall()
    finally:
        connection.close()
    result = {"checked": len(rows), "applied": 0, "pending": 0, "errors": []}
    for row in rows:
        if not apply:
            continue
        try:
            if row["submitted_txid"]:
                transfer = service.provider.verify(row["submitted_txid"], intent_created_at=parse_iso(row["created_at"]))
            else:
                matches = service.provider.find_matching_transfers(
                    intent_created_at=parse_iso(row["created_at"]),
                    amount_micro=int(row["requested_amount_micro"]),
                )
                if not matches:
                    result["pending"] += 1
                    continue
                if len(matches) > 1:
                    with service.database.transaction() as transaction:
                        transaction.execute(
                            "UPDATE payment_intents SET status = 'requires_review' WHERE id = ?",
                            (row["id"],),
                        )
                        transaction.execute("DELETE FROM takeover_locks WHERE intent_id = ?", (row["id"],))
                    result["errors"].append({"intentId": row["id"], "code": "ambiguous_transfer"})
                    continue
                transfer = matches[0]
            service.apply_confirmed_transfer(row["id"], transfer)
            result["applied"] += 1
        except PaymentPending:
            result["pending"] += 1
        except MarketError as error:
            result["errors"].append({"intentId": row["id"], "code": error.code})
    return result


def process_outbox(service: MarketService, *, limit: int = 50) -> dict:
    connection = service.database.connect()
    try:
        rows = connection.execute(
            """SELECT * FROM outbox WHERE status IN ('pending', 'failed')
               AND next_attempt_at <= ? ORDER BY id LIMIT ?""",
            (utc_now().isoformat(timespec="seconds").replace("+00:00", "Z"), limit),
        ).fetchall()
    finally:
        connection.close()
    completed = 0
    failed = 0
    for row in rows:
        try:
            deliver_outbox(service.settings, row["type"], json.loads(row["payload_json"]))
            with service.database.transaction() as transaction:
                transaction.execute(
                    """UPDATE outbox SET status = 'completed', attempts = attempts + 1,
                       completed_at = datetime('now'), last_error = NULL WHERE id = ?""",
                    (row["id"],),
                )
                payload = json.loads(row["payload_json"])
                if row["type"] == "reign_replaced_notification" and payload.get("notificationId"):
                    transaction.execute(
                        "UPDATE reign_notifications SET status = 'sent', sent_at = datetime('now'), last_error = NULL WHERE id = ?",
                        (int(payload["notificationId"]),),
                    )
            completed += 1
        except Exception as error:
            with service.database.transaction() as transaction:
                retry_at = (utc_now() + timedelta(minutes=min(int(row["attempts"]) + 1, 15))).isoformat(timespec="seconds").replace("+00:00", "Z")
                transaction.execute(
                    """UPDATE outbox SET status = 'failed', attempts = attempts + 1,
                       next_attempt_at = ?,
                       last_error = ? WHERE id = ?""",
                    (retry_at, str(error)[:500], row["id"]),
                )
                payload = json.loads(row["payload_json"])
                if row["type"] == "reign_replaced_notification" and payload.get("notificationId"):
                    transaction.execute(
                        "UPDATE reign_notifications SET status = 'failed', last_error = ? WHERE id = ?",
                        (str(error)[:500], int(payload["notificationId"])),
                    )
            failed += 1
    return {"selected": len(rows), "completed": completed, "failed": failed}


def deliver_outbox(settings: Settings, job_type: str, payload: dict) -> None:
    if job_type == "reign_replaced_notification":
        text = f"Your coin.im message was replaced. Take it back: {payload['takeBackUrl']}"
        if payload.get("contactType") == "email":
            if not settings.smtp_host or not settings.smtp_from:
                raise RuntimeError("Replacement email delivery is not configured")
            message = EmailMessage()
            message["Subject"] = "Your coin.im message was replaced"
            message["From"] = settings.smtp_from
            message["To"] = payload["contactValue"]
            message.set_content(text)
            with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=15) as client:
                if settings.smtp_username:
                    client.login(settings.smtp_username, settings.smtp_password)
                client.send_message(message)
            return
        if payload.get("contactType") == "telegram":
            if not settings.telegram_bot_token:
                raise RuntimeError("Replacement Telegram delivery is not configured")
            body = json.dumps({"chat_id": payload["contactValue"], "text": text}).encode("utf-8")
            request = Request(
                f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage",
                data=body,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urlopen(request, timeout=15) as response:
                if response.status != 200:
                    raise RuntimeError("Telegram notification failed")
            return
        raise RuntimeError("Unknown replacement notification destination")
    if not settings.telegram_bot_token or not settings.telegram_admin_chat_id:
        return
    text = f"coin.im {job_type}\n" + json.dumps(payload, ensure_ascii=False, indent=2)
    body = json.dumps({"chat_id": settings.telegram_admin_chat_id, "text": text}).encode("utf-8")
    request = Request(
        f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urlopen(request, timeout=15) as response:
        if response.status != 200:
            raise RuntimeError("Telegram notification failed")


def production_smoke(settings: Settings) -> dict:
    urls = [
        "/",
        "/message",
        "/message/",
        "/takeover",
        "/archive",
        "/stats",
        "/rules",
        "/api/market/health",
        "/mail",
        "/ms",
        "/open",
        "/api/open/health",
    ]
    result = []
    for path in urls:
        url = settings.site_url + path
        request = Request(url, headers={"User-Agent": "coin-im-market-smoke/1"})
        try:
            with urlopen(request, timeout=15) as response:
                result.append({"url": url, "status": response.status, "finalUrl": response.geturl()})
        except URLError as error:
            result.append({"url": url, "status": 0, "error": str(error)})
    return {"ok": all(item["status"] == 200 for item in result), "results": result}


def main() -> None:
    parser = argparse.ArgumentParser(prog="coin-market")
    subparsers = parser.add_subparsers(dest="command", required=True)
    verify_parser = subparsers.add_parser("verify-environment")
    verify_parser.add_argument("--production", action="store_true")
    subparsers.add_parser("migrate")
    reconcile_payments_parser = subparsers.add_parser("reconcile-payments")
    reconcile_payments_parser.add_argument("--apply", action="store_true")
    subparsers.add_parser("reconcile-reigns")
    clear_parser = subparsers.add_parser("clear-expired-takeover-locks")
    clear_parser.add_argument("--apply", action="store_true")
    outbox_parser = subparsers.add_parser("process-outbox")
    outbox_parser.add_argument("--limit", type=int, default=50)
    subparsers.add_parser("production-smoke")
    backup_parser = subparsers.add_parser("backup")
    backup_parser.add_argument("destination")
    args = parser.parse_args()

    settings, database, service = runtime()
    if args.command == "verify-environment":
        result = verify_environment(settings, production=args.production)
    elif args.command == "migrate":
        result = {"ok": True, "applied": database.migrate(), "database": str(database.path)}
    elif args.command == "reconcile-payments":
        result = reconcile_payments(service, apply=args.apply)
    elif args.command == "reconcile-reigns":
        result = service.reconcile_reigns()
    elif args.command == "clear-expired-takeover-locks":
        result = {"expiredIntentIds": database.cleanup_expired_locks(mutate=args.apply), "applied": args.apply}
    elif args.command == "process-outbox":
        result = process_outbox(service, limit=args.limit)
    elif args.command == "production-smoke":
        result = production_smoke(settings)
    elif args.command == "backup":
        destination = database.backup(Path(args.destination))
        result = {"ok": True, "backup": str(destination) if destination else None}
    else:  # pragma: no cover
        raise SystemExit(2)
    print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
    if result.get("ok") is False:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
