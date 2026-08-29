from __future__ import annotations

import hashlib
import hmac
import json
import re
import sqlite3
from datetime import datetime, timedelta
from typing import Optional
from urllib.parse import urlsplit

from .config import Settings
from .core import (
    MICRO,
    MarketError,
    duration_text,
    format_usdt,
    iso,
    live_strength,
    parse_iso,
    parse_usdt,
    random_id,
    random_token,
    shorten_txid,
    slug_from_message,
    takeover_price,
    token_hash,
    utc_now,
    validate_message_fields,
)
from .db import (
    Database,
    active_reign,
    insert_event,
    insert_outbox,
    metrics_for_reign,
    payments_for_reign,
    reign_by_public_id,
    snapshot_by_public_id,
    wall_slot_reign,
)
from .payments import ConfirmedTransfer, PaymentPending, PaymentProvider


ACTIVE_INTENT_STATUSES = {"created", "payment_found"}
DISCOVERABLE_INTENT_STATUSES = ACTIVE_INTENT_STATUSES | {"expired"}
SOCIAL_PROFILE_HOSTS = (
    "x.com",
    "twitter.com",
    "instagram.com",
    "facebook.com",
    "fb.com",
    "youtube.com",
    "youtu.be",
    "tiktok.com",
    "reddit.com",
    "linkedin.com",
    "pinterest.com",
    "pin.it",
    "snapchat.com",
    "whatsapp.com",
    "wa.me",
    "threads.net",
    "t.me",
    "telegram.me",
    "discord.com",
    "discord.gg",
    "twitch.tv",
    "bsky.app",
)


def is_social_profile_url(url: str) -> bool:
    host = (urlsplit(url).hostname or "").lower().removeprefix("www.")
    return any(host == candidate or host.endswith("." + candidate) for candidate in SOCIAL_PROFILE_HOSTS)


class UnappliedPayment(Exception):
    def __init__(self, status: str, error: MarketError) -> None:
        super().__init__(error.message)
        self.status = status
        self.error = error


class MarketService:
    def __init__(self, settings: Settings, database: Database, provider: PaymentProvider) -> None:
        self.settings = settings
        self.database = database
        self.provider = provider

    @property
    def accepting_payments(self) -> bool:
        return self.settings.production_ready or (
            self.settings.market_enabled and self.settings.is_local and self.provider.name == "mock"
        )

    def visitor_hash(self, ip: str, agent: str, *, purpose: str = "visitor", day: Optional[str] = None) -> str:
        day = day or utc_now().strftime("%Y-%m-%d")
        secret = self.settings.analytics_secret.encode("utf-8")
        if not secret:
            secret = b"local-analytics-only"
        return hmac.new(secret, f"{purpose}|{day}|{ip}|{agent}".encode("utf-8"), hashlib.sha256).hexdigest()

    def expire_stale_locks(self) -> list[str]:
        return self.database.cleanup_expired_locks(mutate=True)

    def audience_floor(self, connection: sqlite3.Connection, now: datetime) -> int:
        if not self.settings.audience_floor_enabled:
            return 0
        since = iso(now - timedelta(hours=1))
        row = connection.execute(
            """SELECT COUNT(DISTINCT visitor_hash)
               FROM metric_visitors
               WHERE kind = 'reader' AND created_at >= ? AND created_at <= ?""",
            (since, iso(now)),
        ).fetchone()
        readers = int(row[0])
        return (readers * self.settings.audience_floor_cpm_micro + 999) // 1000

    def state(self, now: Optional[datetime] = None) -> dict:
        now = now or utc_now()
        self.database.cleanup_expired_locks(mutate=True, now=now)
        connection = self.database.connect()
        try:
            current = active_reign(connection)
            if current is None:
                return {
                    "state": "unclaimed",
                    "serverNow": iso(now),
                    "marketEnabled": self.accepting_payments,
                    "takeoverPriceMicro": self.settings.min_usdt_micro,
                    "takeoverPrice": format_usdt(self.settings.min_usdt_micro),
                    "message": None,
                    "lock": None,
                }

            payment_rows = payments_for_reign(connection, int(current["id"]))
            power_inputs = [
                (int(row["amount_micro"]), parse_iso(row["confirmed_at"]))
                for row in payment_rows
            ]
            strength = live_strength(power_inputs, now, self.settings.power_lifetime_seconds)
            price = takeover_price(
                strength,
                self.settings.min_usdt_micro,
                self.settings.min_increment_micro,
            )
            total = sum(int(row["amount_micro"]) for row in payment_rows)
            metrics = metrics_for_reign(connection, int(current["id"]))
            lock = connection.execute(
                """SELECT l.*, i.status AS intent_status
                   FROM takeover_locks l JOIN payment_intents i ON i.id = l.intent_id
                   WHERE l.current_reign_key = ?""",
                (str(current["id"]),),
            ).fetchone()
            if lock is not None and lock["found_transaction_at"]:
                state_name = "payment_found"
            elif lock is not None:
                state_name = "quote_active"
            else:
                state_name = "open"

            message = self.message_payload(current)
            message_metrics = metrics_for_reign(connection, int(current["id"]))
            message.update(message_metrics)
            message["durationSeconds"] = max(0, int((now - parse_iso(current["started_at"])).total_seconds()))
            message["duration"] = duration_text(message["durationSeconds"])
            return {
                "state": state_name,
                "serverNow": iso(now),
                "marketEnabled": self.accepting_payments,
                "takeoverPriceMicro": price,
                "takeoverPrice": format_usdt(price),
                "activeBackingMicro": strength,
                "activeBacking": format_usdt(strength),
                "totalConfirmedMicro": total,
                "totalConfirmed": format_usdt(total),
                "confirmedPayments": len(payment_rows),
                "message": message,
                "currentReignPublicId": current["public_id"],
                "lock": None
                if lock is None
                else {
                    "expiresAt": lock["expires_at"],
                    "paymentFound": bool(lock["found_transaction_at"]),
                    "seconds": max(0, int((parse_iso(lock["expires_at"]) - now).total_seconds())),
                },
            }
        finally:
            connection.close()

    def wall_state(self, now: Optional[datetime] = None) -> dict:
        now = now or utc_now()
        self.database.cleanup_expired_locks(mutate=True, now=now)
        connection = self.database.connect()
        try:
            slots = []
            for slot_number in (1, 2, 3):
                row = wall_slot_reign(connection, slot_number)
                if row is None:
                    raise MarketError(503, "The paid wall is not initialized.", "wall_not_initialized")
                amount_micro = int(row["initial_amount_micro"])
                slots.append(
                    {
                        "slotNumber": slot_number,
                        "publicId": row["public_id"],
                        "slug": row["slug"],
                        "message": row["message"],
                        "signature": row["signature"] or "",
                        "location": row["location"] or "",
                        "url": row["url"] or "",
                        "ctaLabel": row["cta_label"] or "",
                        "amountMicro": amount_micro,
                        "amount": format_usdt(amount_micro),
                        "outbidAmountMicro": amount_micro + MICRO,
                        "outbidAmount": format_usdt(amount_micro + MICRO),
                        "startedAt": row["started_at"],
                    }
                )
            return {
                "serverNow": iso(now),
                "marketEnabled": self.accepting_payments,
                "slots": slots,
                "totalMicro": sum(item["amountMicro"] for item in slots),
                "total": format_usdt(sum(item["amountMicro"] for item in slots)),
            }
        finally:
            connection.close()

    @staticmethod
    def message_payload(row: sqlite3.Row) -> dict:
        return {
            "reignId": row["public_id"],
            "slug": row["slug"],
            "message": row["message"],
            "signature": row["signature"] or "",
            "location": row["location"] or "",
            "url": row["url"] or "",
            "ctaLabel": row["cta_label"] or "",
            "startedAt": row["started_at"],
            "status": row["status"],
            "initialAmount": format_usdt(int(row["initial_amount_micro"])),
        }

    def _assert_payments_open(self) -> None:
        if not self.accepting_payments:
            raise MarketError(
                503,
                "Live takeover payments are not open yet. No payment request was created.",
                "market_disabled",
            )

    def create_takeover_intent(
        self,
        payload: dict,
        visitor_hash: str,
        now: Optional[datetime] = None,
    ) -> dict:
        self._assert_payments_open()
        now = now or utc_now()
        if payload.get("wallSlot") not in (None, ""):
            return self._create_wall_takeover_intent(payload, visitor_hash, now)
        target_slug = str(payload.get("targetMessageSlug") or "").strip()
        fields = None if target_slug else validate_message_fields(payload)
        self.database.cleanup_expired_locks(mutate=True, now=now)
        public_reign = str(payload.get("currentReignId") or "")

        with self.database.transaction() as connection:
            target_message = None
            if target_slug:
                target_message = connection.execute(
                    """SELECT * FROM messages
                       WHERE slug = ? AND status = 'published' LIMIT 1""",
                    (target_slug,),
                ).fetchone()
                if target_message is None:
                    raise MarketError(404, "The message cannot be brought back.", "message_not_found")
                fields = {
                    "message": target_message["message"],
                    "signature": target_message["signature"] or "",
                    "location": target_message["location"] or "",
                    "url": target_message["url"] or "",
                    "cta_label": target_message["cta_label"] or "",
                }
            assert fields is not None
            current = active_reign(connection)
            if current is not None:
                if public_reign != current["public_id"]:
                    raise MarketError(409, "The live message changed. Review the current price and try again.", "stale_reign")
            elif public_reign:
                raise MarketError(409, "The page is currently unclaimed. Refresh before continuing.", "stale_reign")

            current_id = int(current["id"]) if current is not None else None
            lock_key = str(current_id) if current_id is not None else "unclaimed"
            existing_lock = connection.execute(
                "SELECT intent_id, expires_at FROM takeover_locks WHERE current_reign_key = ?",
                (lock_key,),
            ).fetchone()
            if existing_lock is not None:
                raise MarketError(409, "A takeover is being paid now.", "takeover_locked")

            one_hour_ago = iso(now - timedelta(hours=1))
            recent_count = connection.execute(
                "SELECT COUNT(*) FROM payment_intents WHERE visitor_hash = ? AND kind = 'takeover' AND created_at >= ?",
                (visitor_hash, one_hour_ago),
            ).fetchone()[0]
            if recent_count >= self.settings.quote_rate_limit_per_hour:
                raise MarketError(429, "Too many takeover checkouts were started. Try again later.", "quote_rate_limit")
            expired_count = connection.execute(
                """SELECT COUNT(*) FROM payment_intents
                   WHERE visitor_hash = ? AND kind = 'takeover' AND status = 'expired'
                     AND created_at >= ?""",
                (visitor_hash, iso(now - timedelta(seconds=self.settings.quote_expiry_cooldown_seconds))),
            ).fetchone()[0]
            if expired_count >= self.settings.quote_expiry_cooldown_count:
                raise MarketError(429, "Takeover checkout is temporarily unavailable for this visitor.", "quote_cooldown")

            payment_rows = [] if current_id is None else payments_for_reign(connection, current_id)
            strength = live_strength(
                [(int(row["amount_micro"]), parse_iso(row["confirmed_at"])) for row in payment_rows],
                now,
                self.settings.power_lifetime_seconds,
            )
            price = takeover_price(
                strength,
                self.settings.min_usdt_micro,
                self.settings.min_increment_micro,
            )
            requested = parse_usdt(payload.get("amount"), minimum_micro=price)
            quoted_client = payload.get("quotedPriceMicro")
            if quoted_client is not None and int(quoted_client) != price:
                raise MarketError(409, "The takeover price changed. Review the new amount.", "price_changed")

            intent_id = random_id("intent", 16)
            receipt_token = random_token()
            expires_at = now + timedelta(seconds=self.settings.quote_seconds)
            connection.execute(
                """INSERT INTO payment_intents
                   (id, kind, current_reign_id, target_message_id, draft_message, draft_signature, draft_location,
                    draft_url, draft_cta_label, quoted_amount_micro, requested_amount_micro,
                    quote_expires_at, secret_token_hash, status, visitor_hash, created_at)
                   VALUES (?, 'takeover', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'created', ?, ?)""",
                (
                    intent_id,
                    current_id,
                    int(target_message["id"]) if target_message is not None else None,
                    fields["message"],
                    fields["signature"],
                    fields["location"],
                    fields["url"],
                    fields["cta_label"],
                    price,
                    requested,
                    iso(expires_at),
                    token_hash(receipt_token),
                    visitor_hash,
                    iso(now),
                ),
            )
            connection.execute(
                """INSERT INTO takeover_locks
                   (current_reign_key, current_reign_id, intent_id, expires_at, created_at)
                   VALUES (?, ?, ?, ?, ?)""",
                (lock_key, current_id, intent_id, iso(expires_at), iso(now)),
            )
            insert_event(connection, current_id, "takeover_quote_started", {"expiresAt": iso(expires_at)})
            return {
                "intentId": intent_id,
                "receiptUrl": f"{self.settings.site_url}/receipt/{receipt_token}",
                "receiptToken": receipt_token,
                "amountMicro": requested,
                "amount": format_usdt(requested),
                "quoteExpiresAt": iso(expires_at),
            }

    def _create_wall_takeover_intent(
        self,
        payload: dict,
        visitor_hash: str,
        now: datetime,
    ) -> dict:
        try:
            slot_number = int(payload.get("wallSlot"))
        except (TypeError, ValueError) as error:
            raise MarketError(422, "Choose one of the three wall slots.", "invalid_wall_slot") from error
        if slot_number not in (1, 2, 3):
            raise MarketError(422, "Choose one of the three wall slots.", "invalid_wall_slot")
        fields = validate_message_fields(payload)
        if len(re.sub(r"\s", "", fields["message"])) < 111:
            raise MarketError(422, "Your message must contain at least 111 characters without spaces.", "too_short")
        if slot_number in (1, 2) and not fields["url"]:
            raise MarketError(422, "This slot requires a public link.", "url_required")
        if slot_number == 3 and fields["url"]:
            raise MarketError(422, "The message slot does not include a public link.", "url_not_allowed")
        if slot_number == 1 and not fields["signature"]:
            raise MarketError(422, "The website slot requires a headline.", "headline_required")
        if slot_number == 1 and is_social_profile_url(fields["url"]):
            raise MarketError(422, "Use slot № 2 for a social profile URL.", "wrong_slot_type")
        if slot_number == 2 and not is_social_profile_url(fields["url"]):
            raise MarketError(422, "Enter a public social profile URL for slot № 2.", "social_url_required")
        if fields["url"] and not fields["cta_label"]:
            fields["cta_label"] = (urlsplit(fields["url"]).hostname or "open link").removeprefix("www.")
        self.database.cleanup_expired_locks(mutate=True, now=now)

        with self.database.transaction() as connection:
            current = wall_slot_reign(connection, slot_number)
            if current is None:
                raise MarketError(503, "The paid wall is not initialized.", "wall_not_initialized")
            current_id = int(current["id"])
            lock_key = f"wall:{slot_number}"
            existing_lock = connection.execute(
                "SELECT intent_id FROM takeover_locks WHERE current_reign_key = ?",
                (lock_key,),
            ).fetchone()
            if existing_lock is not None:
                raise MarketError(409, "This slot is being paid for now.", "takeover_locked")

            one_hour_ago = iso(now - timedelta(hours=1))
            recent_count = connection.execute(
                "SELECT COUNT(*) FROM payment_intents WHERE visitor_hash = ? AND kind = 'takeover' AND created_at >= ?",
                (visitor_hash, one_hour_ago),
            ).fetchone()[0]
            if recent_count >= self.settings.quote_rate_limit_per_hour:
                raise MarketError(429, "Too many takeover checkouts were started. Try again later.", "quote_rate_limit")

            price = int(current["initial_amount_micro"]) + MICRO
            requested = parse_usdt(payload.get("amount"), minimum_micro=price)
            quoted_client = payload.get("quotedPriceMicro")
            if requested != price or (quoted_client is not None and int(quoted_client) != price):
                raise MarketError(409, "The slot price changed. Review the new amount.", "price_changed")

            intent_id = random_id("intent", 16)
            receipt_token = random_token()
            expires_at = now + timedelta(seconds=self.settings.quote_seconds)
            connection.execute(
                """INSERT INTO payment_intents
                   (id, kind, current_reign_id, target_message_id, draft_message, draft_signature, draft_location,
                    draft_url, draft_cta_label, quoted_amount_micro, requested_amount_micro,
                    quote_expires_at, secret_token_hash, status, visitor_hash, created_at, wall_slot_number)
                   VALUES (?, 'takeover', ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'created', ?, ?, ?)""",
                (
                    intent_id,
                    current_id,
                    fields["message"],
                    fields["signature"],
                    fields["location"],
                    fields["url"],
                    fields["cta_label"],
                    price,
                    requested,
                    iso(expires_at),
                    token_hash(receipt_token),
                    visitor_hash,
                    iso(now),
                    slot_number,
                ),
            )
            connection.execute(
                """INSERT INTO takeover_locks
                   (current_reign_key, current_reign_id, intent_id, expires_at, created_at)
                   VALUES (?, ?, ?, ?, ?)""",
                (lock_key, current_id, intent_id, iso(expires_at), iso(now)),
            )
            insert_event(connection, current_id, "takeover_quote_started", {"expiresAt": iso(expires_at), "wallSlot": slot_number})
            return {
                "intentId": intent_id,
                "receiptUrl": f"{self.settings.site_url}/receipt/{receipt_token}",
                "receiptToken": receipt_token,
                "amountMicro": requested,
                "amount": format_usdt(requested),
                "quoteExpiresAt": iso(expires_at),
                "wallSlot": slot_number,
            }

    def create_defend_intent(
        self,
        payload: dict,
        visitor_hash: str,
        now: Optional[datetime] = None,
    ) -> dict:
        self._assert_payments_open()
        now = now or utc_now()
        self.database.cleanup_expired_locks(mutate=True, now=now)
        requested = parse_usdt(payload.get("amount"), minimum_micro=MICRO)
        with self.database.transaction() as connection:
            current = active_reign(connection)
            if current is None:
                raise MarketError(409, "There is no current message to keep live.", "unclaimed")
            if payload.get("currentReignId") != current["public_id"]:
                raise MarketError(409, "The live message changed. Review it before paying.", "stale_reign")
            lock = connection.execute(
                "SELECT intent_id FROM takeover_locks WHERE current_reign_key = ?",
                (str(current["id"]),),
            ).fetchone()
            if lock is not None:
                raise MarketError(409, "A takeover is being paid now. Backing is temporarily paused.", "takeover_locked")
            intent_id = random_id("intent", 16)
            receipt_token = random_token()
            connection.execute(
                """INSERT INTO payment_intents
                   (id, kind, current_reign_id, target_message_id, requested_amount_micro,
                    secret_token_hash, status, visitor_hash, created_at)
                   VALUES (?, 'defend', ?, ?, ?, ?, 'created', ?, ?)""",
                (
                    intent_id,
                    int(current["id"]),
                    int(current["message_id"]),
                    requested,
                    token_hash(receipt_token),
                    visitor_hash,
                    iso(now),
                ),
            )
            return {
                "intentId": intent_id,
                "receiptUrl": f"{self.settings.site_url}/receipt/{receipt_token}",
                "receiptToken": receipt_token,
                "amountMicro": requested,
                "amount": format_usdt(requested),
            }

    def intent_for_token(self, token: str) -> sqlite3.Row:
        if len(token) < 32:
            raise MarketError(404, "Receipt not found.", "receipt_not_found")
        connection = self.database.connect()
        try:
            row = connection.execute(
                "SELECT * FROM payment_intents WHERE secret_token_hash = ?",
                (token_hash(token),),
            ).fetchone()
            if row is None:
                raise MarketError(404, "Receipt not found.", "receipt_not_found")
            return row
        finally:
            connection.close()

    def receipt(self, token: str, now: Optional[datetime] = None) -> dict:
        now = now or utc_now()
        intent = self.intent_for_token(token)
        connection = self.database.connect()
        try:
            payment = connection.execute(
                "SELECT * FROM payments WHERE intent_id = ?", (intent["id"],)
            ).fetchone()
            credit = None if payment is None else connection.execute(
                "SELECT * FROM payment_credits WHERE payment_id = ?", (payment["id"],)
            ).fetchone()
            result = None
            if payment is not None:
                result = connection.execute(
                    "SELECT * FROM result_snapshots WHERE payment_id = ? ORDER BY id DESC LIMIT 1",
                    (payment["id"],),
                ).fetchone()
            payload = {
                "kind": intent["kind"],
                "status": "credited" if credit is not None and credit["status"] == "available" else intent["status"],
                "amountMicro": int(intent["requested_amount_micro"]),
                "amount": format_usdt(int(intent["requested_amount_micro"])),
                "quotedAmount": format_usdt(int(intent["quoted_amount_micro"] or 0)),
                "quoteExpiresAt": intent["quote_expires_at"],
                "submittedTxid": intent["submitted_txid"] or "",
                "receivingAddress": self.settings.receive_address if self.accepting_payments else "",
                "contractAddress": self.settings.contract_address if self.accepting_payments else "",
                "network": "TRON · TRC-20",
                "message": intent["draft_message"] or "",
                "signature": intent["draft_signature"] or "",
                "location": intent["draft_location"] or "",
                "url": intent["draft_url"] or "",
                "ctaLabel": intent["draft_cta_label"] or "",
                "wallSlotNumber": int(intent["wall_slot_number"]) if intent["wall_slot_number"] is not None else None,
                "serverNow": iso(now),
                "marketEnabled": self.accepting_payments,
                "payment": None,
                "result": None,
                "credit": None,
                "notificationChannels": self.settings.notification_channels,
            }
            if payment is not None:
                payload["payment"] = {
                    "txid": payment["txid"],
                    "shortTxid": shorten_txid(payment["txid"]),
                    "amount": format_usdt(int(payment["amount_micro"])),
                    "confirmedAt": payment["confirmed_at"],
                }
            if result is not None:
                snapshot = json.loads(result["snapshot_json"])
                payload["result"] = {
                    "publicId": result["public_id"],
                    "type": result["type"],
                    "snapshot": snapshot,
                    "shareUrl": self.settings.site_url + "/",
                    "shareCardUrl": f"{self.settings.site_url}/result/{result['public_id']}.png",
                }
            if credit is not None:
                payload["credit"] = {
                    "amount": format_usdt(int(credit["amount_micro"])),
                    "status": credit["status"],
                    "reason": credit["reason"],
                }
            return payload
        finally:
            connection.close()

    def mark_payment_found(self, intent_id: str, txid: str, now: datetime) -> None:
        with self.database.transaction() as connection:
            intent = connection.execute("SELECT * FROM payment_intents WHERE id = ?", (intent_id,)).fetchone()
            if intent is None or intent["status"] not in ACTIVE_INTENT_STATUSES:
                return
            connection.execute(
                "UPDATE payment_intents SET status = 'payment_found', submitted_txid = ? WHERE id = ?",
                (txid, intent_id),
            )
            if intent["kind"] == "takeover":
                connection.execute(
                    """UPDATE takeover_locks
                       SET found_transaction_at = COALESCE(found_transaction_at, ?)
                       WHERE intent_id = ?""",
                    (iso(now), intent_id),
                )
                insert_event(connection, intent["current_reign_id"], "payment_found", {"network": "TRON"})

    def verify_intent(self, token: str, txid: str, now: Optional[datetime] = None) -> dict:
        self._assert_payments_open()
        now = now or utc_now()
        intent = self.intent_for_token(token)
        if intent["status"] == "confirmed":
            return self.receipt(token, now)
        if intent["status"] in {"cancelled", "failed", "requires_review"}:
            return self.receipt(token, now)
        try:
            transfer = self.provider.verify(txid, intent_created_at=parse_iso(intent["created_at"]))
        except PaymentPending as pending:
            if getattr(pending, "found", False):
                self.mark_payment_found(intent["id"], txid, now)
            raise
        except MarketError as error:
            if error.code == "ambiguous_transfer":
                with self.database.transaction() as connection:
                    connection.execute(
                        "UPDATE payment_intents SET status = 'requires_review', submitted_txid = ? WHERE id = ?",
                        (txid.strip().lower(), intent["id"]),
                    )
                    connection.execute("DELETE FROM takeover_locks WHERE intent_id = ?", (intent["id"],))
            raise
        return self.apply_confirmed_transfer(intent["id"], transfer, now=now, receipt_token=token)

    def discover_intent(self, token: str, now: Optional[datetime] = None) -> dict:
        now = now or utc_now()
        intent = self.intent_for_token(token)
        if intent["status"] not in DISCOVERABLE_INTENT_STATUSES:
            return self.receipt(token, now)
        try:
            matches = self.provider.find_matching_transfers(
                intent_created_at=parse_iso(intent["created_at"]),
                amount_micro=int(intent["requested_amount_micro"]),
            )
        except PaymentPending:
            return self.receipt(token, now)
        if not matches:
            return self.receipt(token, now)
        if len(matches) > 1:
            with self.database.transaction() as connection:
                connection.execute(
                    "UPDATE payment_intents SET status = 'requires_review' WHERE id = ?",
                    (intent["id"],),
                )
                connection.execute("DELETE FROM takeover_locks WHERE intent_id = ?", (intent["id"],))
            raise MarketError(
                409,
                "More than one matching confirmed transfer was found. The payment requires review.",
                "ambiguous_transfer",
            )
        return self.apply_confirmed_transfer(
            intent["id"], matches[0], now=now, receipt_token=token
        )

    def subscribe_replacement(self, token: str, contact: str, now: Optional[datetime] = None) -> dict:
        now = now or utc_now()
        value = contact.strip()
        if re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value):
            contact_type = "email"
            normalized = value.lower()
        elif re.fullmatch(r"-?\d{5,20}", value):
            contact_type = "telegram"
            normalized = value
        else:
            raise MarketError(
                422,
                "Enter an email address or a Telegram chat ID.",
                "invalid_notification_contact",
            )
        if contact_type not in self.settings.notification_channels:
            raise MarketError(
                503,
                f"{contact_type.title()} replacement notifications are not configured.",
                "notification_channel_unavailable",
            )
        intent = self.intent_for_token(token)
        if intent["kind"] != "takeover" or intent["status"] != "confirmed":
            raise MarketError(409, "A confirmed takeover is required.", "takeover_not_confirmed")
        with self.database.transaction() as connection:
            payment = connection.execute(
                "SELECT reign_id FROM payments WHERE intent_id = ?", (intent["id"],)
            ).fetchone()
            if payment is None or payment["reign_id"] is None:
                raise MarketError(409, "The takeover reign was not found.", "reign_not_found")
            connection.execute(
                """INSERT INTO reign_notifications
                   (reign_id, contact_type, contact_value, status, created_at)
                   VALUES (?, ?, ?, 'active', ?)
                   ON CONFLICT(reign_id, contact_type, contact_value)
                   DO UPDATE SET status = 'active', last_error = NULL""",
                (payment["reign_id"], contact_type, normalized, iso(now)),
            )
        return {"ok": True, "contactType": contact_type}

    def _record_unapplied_payment(
        self,
        connection: sqlite3.Connection,
        intent: sqlite3.Row,
        transfer: ConfirmedTransfer,
        status: str,
        now: datetime,
        credit_reason: str = "",
    ) -> None:
        cursor = connection.execute(
            """INSERT OR IGNORE INTO payments
               (intent_id, reign_id, message_id, type, txid, event_index, amount_micro,
                contract_address, receiving_address, confirmed_at, power_expires_at, created_at)
               VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                intent["id"],
                intent["target_message_id"],
                intent["kind"],
                transfer.txid,
                transfer.event_index,
                transfer.amount_micro,
                transfer.contract_address,
                transfer.receiving_address,
                iso(transfer.confirmed_at),
                iso(transfer.confirmed_at + timedelta(seconds=self.settings.power_lifetime_seconds)),
                iso(now),
            ),
        )
        connection.execute(
            """UPDATE payment_intents SET status = ?, submitted_txid = ?, confirmed_at = ?
               WHERE id = ?""",
            (status, transfer.txid, iso(transfer.confirmed_at), intent["id"]),
        )
        connection.execute("DELETE FROM takeover_locks WHERE intent_id = ?", (intent["id"],))
        if credit_reason:
            connection.execute(
                """INSERT INTO payment_credits
                   (payment_id, amount_micro, status, reason, created_at)
                   VALUES (?, ?, 'available', ?, ?)""",
                (int(cursor.lastrowid), transfer.amount_micro, credit_reason, iso(now)),
            )

    def apply_confirmed_transfer(
        self,
        intent_id: str,
        transfer: ConfirmedTransfer,
        *,
        now: Optional[datetime] = None,
        receipt_token: Optional[str] = None,
    ) -> dict:
        now = now or utc_now()
        try:
            with self.database.transaction() as connection:
                intent = connection.execute("SELECT * FROM payment_intents WHERE id = ?", (intent_id,)).fetchone()
                if intent is None:
                    raise MarketError(404, "Payment request not found.", "intent_not_found")
                existing_payment = connection.execute(
                    "SELECT * FROM payments WHERE intent_id = ? OR (txid = ? AND event_index = ?)",
                    (intent_id, transfer.txid, transfer.event_index),
                ).fetchone()
                if existing_payment is not None:
                    if existing_payment["intent_id"] != intent_id:
                        raise MarketError(409, "This transfer was already used.", "duplicate_payment")
                    if receipt_token:
                        return self.receipt(receipt_token, now)
                    return {"status": intent["status"]}
                if intent["status"] == "confirmed":
                    if receipt_token:
                        return self.receipt(receipt_token, now)
                    return {"status": "confirmed"}

                if transfer.contract_address != self.settings.contract_address:
                    raise UnappliedPayment(
                        "requires_review",
                        MarketError(422, "The transfer contract does not match configured USDT.", "wrong_contract"),
                    )
                if transfer.receiving_address != self.settings.receive_address:
                    raise UnappliedPayment(
                        "requires_review",
                        MarketError(422, "The transfer recipient does not match this payment request.", "wrong_recipient"),
                    )
                if transfer.confirmed_at < parse_iso(intent["created_at"]):
                    raise UnappliedPayment(
                        "requires_review",
                        MarketError(422, "The transfer predates this payment request.", "payment_too_early"),
                    )
                if transfer.confirmed_at > now + timedelta(minutes=2):
                    raise UnappliedPayment(
                        "requires_review",
                        MarketError(422, "The transfer time is ahead of the server clock.", "payment_time_invalid"),
                    )

                requested = int(intent["requested_amount_micro"])
                if transfer.amount_micro < requested:
                    missing = requested - transfer.amount_micro
                    raise UnappliedPayment(
                        "underpaid",
                        MarketError(
                            422,
                            f"The transfer is {format_usdt(missing)} USDT short. It was recorded for manual review.",
                            "underpaid",
                        ),
                    )

                wall_slot_number = intent["wall_slot_number"]
                if intent["kind"] == "takeover" and wall_slot_number is not None:
                    slot_number = int(wall_slot_number)
                    current_wall = wall_slot_reign(connection, slot_number)
                    if current_wall is None:
                        raise UnappliedPayment(
                            "requires_review",
                            MarketError(409, "The target slot is unavailable. The payment is held for review.", "wall_slot_unavailable"),
                        )
                    lock = connection.execute(
                        "SELECT * FROM takeover_locks WHERE intent_id = ?", (intent_id,)
                    ).fetchone()
                    current_id = int(current_wall["id"])
                    stale = current_id != intent["current_reign_id"] or lock is None or now > parse_iso(lock["expires_at"])
                    if stale:
                        competing_lock = connection.execute(
                            "SELECT intent_id FROM takeover_locks WHERE current_reign_key = ? AND intent_id != ?",
                            (f"wall:{slot_number}", intent_id),
                        ).fetchone()
                        live_price = int(current_wall["initial_amount_micro"]) + MICRO
                        if competing_lock is not None or transfer.amount_micro < live_price:
                            raise UnappliedPayment(
                                "requires_review",
                                MarketError(
                                    409,
                                    "The slot changed before confirmation. This confirmed amount is stored as credit on the private receipt.",
                                    "payment_credited",
                                ),
                            )
                    return_value = self._apply_wall_takeover(
                        connection, intent, transfer, current_wall, slot_number, now
                    )
                    current = None
                    expected_current = None
                    current_id = None
                else:
                    current = active_reign(connection)
                    expected_current = intent["current_reign_id"]
                    current_id = int(current["id"]) if current is not None else None

                if intent["kind"] == "takeover" and wall_slot_number is None:
                    lock = connection.execute(
                        "SELECT * FROM takeover_locks WHERE intent_id = ?", (intent_id,)
                    ).fetchone()
                    stale = current_id != expected_current or lock is None or now > parse_iso(lock["expires_at"])
                    if stale:
                        competing_lock = None if current is None else connection.execute(
                            "SELECT intent_id FROM takeover_locks WHERE current_reign_key = ? AND intent_id != ?",
                            (str(current_id), intent_id),
                        ).fetchone()
                        current_payments = [] if current is None else payments_for_reign(connection, current_id)
                        current_strength = live_strength(
                            [(int(row["amount_micro"]), parse_iso(row["confirmed_at"])) for row in current_payments],
                            now,
                            self.settings.power_lifetime_seconds,
                        )
                        current_price = takeover_price(
                            current_strength,
                            self.settings.min_usdt_micro,
                            self.settings.min_increment_micro,
                        )
                        if competing_lock is not None or transfer.amount_micro < current_price:
                            raise UnappliedPayment(
                                "requires_review",
                                MarketError(
                                    409,
                                    "The quote expired after payment. The confirmed amount is now stored as an automatic credit on this private receipt.",
                                    "payment_credited",
                                ),
                            )
                    return_value = self._apply_takeover(connection, intent, transfer, current, now)
                elif intent["kind"] == "defend":
                    lock = None if current is None else connection.execute(
                        "SELECT * FROM takeover_locks WHERE current_reign_key = ?", (str(current["id"]),)
                    ).fetchone()
                    if current is None or lock is not None:
                        raise UnappliedPayment(
                            "requires_review",
                            MarketError(
                                409,
                                "The message could not safely receive this payment. It is held for review.",
                                "stale_defend",
                            ),
                        )
                    return_value = self._apply_defend(connection, intent, transfer, current, now)
        except UnappliedPayment as pending_review:
            with self.database.transaction() as connection:
                intent = connection.execute("SELECT * FROM payment_intents WHERE id = ?", (intent_id,)).fetchone()
                if intent is not None:
                    existing = connection.execute(
                        "SELECT id FROM payments WHERE intent_id = ? OR (txid = ? AND event_index = ?)",
                        (intent_id, transfer.txid, transfer.event_index),
                    ).fetchone()
                    if existing is None:
                        self._record_unapplied_payment(
                            connection,
                            intent,
                            transfer,
                            pending_review.status,
                            now,
                            "stale_takeover" if pending_review.error.code == "payment_credited" else "",
                        )
            raise pending_review.error

        if receipt_token:
            return self.receipt(receipt_token, now)
        return return_value

    def _apply_wall_takeover(
        self,
        connection: sqlite3.Connection,
        intent: sqlite3.Row,
        transfer: ConfirmedTransfer,
        previous: sqlite3.Row,
        slot_number: int,
        now: datetime,
    ) -> dict:
        slug = slug_from_message(intent["draft_message"])
        message_cursor = connection.execute(
            """INSERT INTO messages
               (slug, message, signature, location, url, cta_label, status, created_at, wall_slot_number)
               VALUES (?, ?, ?, ?, ?, ?, 'published', ?, ?)""",
            (
                slug,
                intent["draft_message"],
                intent["draft_signature"],
                intent["draft_location"],
                intent["draft_url"],
                intent["draft_cta_label"],
                iso(now),
                slot_number,
            ),
        )
        message_id = int(message_cursor.lastrowid)
        payment_id = self._insert_payment(connection, intent, transfer, None, message_id, now)
        previous_id = int(previous["id"])

        connection.execute(
            """UPDATE reigns SET status = 'ended', ended_at = ?, ended_reason = 'replaced'
               WHERE id = ?""",
            (iso(now), previous_id),
        )
        connection.execute(
            """UPDATE reigns SET status = 'ended', ended_at = COALESCE(ended_at, ?),
                      ended_reason = CASE WHEN ended_reason IS NULL OR ended_reason = '' THEN 'wall_rotation' ELSE ended_reason END
               WHERE status = 'active'""",
            (iso(now),),
        )

        public_id = random_id("reign", 12)
        reign_cursor = connection.execute(
            """INSERT INTO reigns
               (public_id, message_id, previous_reign_id, status, started_at, display_at,
                protection_until, takeover_payment_id, initial_amount_micro, created_at)
               VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)""",
            (
                public_id,
                message_id,
                previous_id,
                iso(now),
                iso(now),
                iso(now),
                payment_id,
                transfer.amount_micro,
                iso(now),
            ),
        )
        reign_id = int(reign_cursor.lastrowid)
        connection.execute("UPDATE payments SET reign_id = ? WHERE id = ?", (reign_id, payment_id))

        result_public_id = random_id("result", 12)
        snapshot = {
            "type": "takeover",
            "wallSlotNumber": slot_number,
            "message": intent["draft_message"],
            "signature": intent["draft_signature"] or "",
            "location": intent["draft_location"] or "",
            "amountMicro": transfer.amount_micro,
            "amount": format_usdt(transfer.amount_micro),
            "confirmedAt": iso(transfer.confirmed_at),
            "reignPublicId": public_id,
        }
        connection.execute(
            """INSERT INTO result_snapshots
               (public_id, type, reign_id, message_id, payment_id, previous_reign_id, snapshot_json, created_at)
               VALUES (?, 'takeover', ?, ?, ?, ?, ?, ?)""",
            (
                result_public_id,
                reign_id,
                message_id,
                payment_id,
                previous_id,
                json.dumps(snapshot, ensure_ascii=False, separators=(",", ":")),
                iso(now),
            ),
        )

        self._create_completed_snapshot(connection, previous, now)
        notifications = connection.execute(
            "SELECT * FROM reign_notifications WHERE reign_id = ? AND status = 'active'",
            (previous_id,),
        ).fetchall()
        for notification in notifications:
            notification_payload = {
                "notificationId": int(notification["id"]),
                "contactType": notification["contact_type"],
                "contactValue": notification["contact_value"],
                "message": previous["message"],
                "takeBackUrl": f"{self.settings.site_url}/takeover?slot={slot_number}&message={previous['slug']}",
            }
            insert_outbox(
                connection,
                "reign_replaced_notification",
                notification_payload,
                f"replaced:{previous_id}:{notification['id']}",
            )

        connection.execute(
            """UPDATE payment_intents
               SET status = 'confirmed', submitted_txid = ?, confirmed_at = ? WHERE id = ?""",
            (transfer.txid, iso(transfer.confirmed_at), intent["id"]),
        )
        connection.execute("DELETE FROM takeover_locks WHERE intent_id = ?", (intent["id"],))
        event_payload = {
            "reignPublicId": public_id,
            "resultPublicId": result_public_id,
            "wallSlot": slot_number,
        }
        insert_event(connection, reign_id, "new_reign_activated", event_payload)
        insert_outbox(connection, "takeover_confirmed", event_payload, f"takeover:{payment_id}")
        return {
            "status": "confirmed",
            "reignPublicId": public_id,
            "resultPublicId": result_public_id,
            "wallSlot": slot_number,
        }

    def _insert_payment(
        self,
        connection: sqlite3.Connection,
        intent: sqlite3.Row,
        transfer: ConfirmedTransfer,
        reign_id: Optional[int],
        message_id: Optional[int],
        now: datetime,
    ) -> int:
        cursor = connection.execute(
            """INSERT INTO payments
               (intent_id, reign_id, message_id, type, txid, event_index, amount_micro,
                contract_address, receiving_address, confirmed_at, power_expires_at, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                intent["id"],
                reign_id,
                message_id,
                intent["kind"],
                transfer.txid,
                transfer.event_index,
                transfer.amount_micro,
                transfer.contract_address,
                transfer.receiving_address,
                iso(transfer.confirmed_at),
                iso(transfer.confirmed_at + timedelta(seconds=self.settings.power_lifetime_seconds)),
                iso(now),
            ),
        )
        return int(cursor.lastrowid)

    def _apply_takeover(
        self,
        connection: sqlite3.Connection,
        intent: sqlite3.Row,
        transfer: ConfirmedTransfer,
        previous: Optional[sqlite3.Row],
        now: datetime,
    ) -> dict:
        if intent["target_message_id"]:
            target = connection.execute(
                "SELECT * FROM messages WHERE id = ? AND status = 'published'",
                (intent["target_message_id"],),
            ).fetchone()
            if target is None:
                raise MarketError(409, "The message can no longer be brought back.", "message_unavailable")
            message_id = int(target["id"])
        else:
            slug = slug_from_message(intent["draft_message"])
            message_cursor = connection.execute(
                """INSERT INTO messages
                   (slug, message, signature, location, url, cta_label, status, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, 'published', ?)""",
                (
                    slug,
                    intent["draft_message"],
                    intent["draft_signature"],
                    intent["draft_location"],
                    intent["draft_url"],
                    intent["draft_cta_label"],
                    iso(now),
                ),
            )
            message_id = int(message_cursor.lastrowid)
        payment_id = self._insert_payment(connection, intent, transfer, None, message_id, now)
        previous_id = int(previous["id"]) if previous is not None else None
        if previous is not None:
            connection.execute(
                """UPDATE reigns SET status = 'ended', ended_at = ?, ended_reason = 'replaced'
                   WHERE id = ? AND status = 'active'""",
                (iso(now), previous_id),
            )
        public_id = random_id("reign", 12)
        display_at = now
        protection_until = now
        reign_cursor = connection.execute(
            """INSERT INTO reigns
               (public_id, message_id, previous_reign_id, status, started_at, display_at,
                protection_until, takeover_payment_id, initial_amount_micro, created_at)
               VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)""",
            (
                public_id,
                message_id,
                previous_id,
                iso(now),
                iso(display_at),
                iso(protection_until),
                payment_id,
                transfer.amount_micro,
                iso(now),
            ),
        )
        reign_id = int(reign_cursor.lastrowid)
        connection.execute("UPDATE payments SET reign_id = ? WHERE id = ?", (reign_id, payment_id))
        result_public_id = random_id("result", 12)
        snapshot = {
            "type": "takeover",
            "message": intent["draft_message"],
            "signature": intent["draft_signature"] or "",
            "location": intent["draft_location"] or "",
            "amountMicro": transfer.amount_micro,
            "amount": format_usdt(transfer.amount_micro),
            "confirmedAt": iso(transfer.confirmed_at),
            "reignPublicId": public_id,
        }
        connection.execute(
            """INSERT INTO result_snapshots
               (public_id, type, reign_id, message_id, payment_id, previous_reign_id, snapshot_json, created_at)
               VALUES (?, 'takeover', ?, ?, ?, ?, ?, ?)""",
            (
                result_public_id,
                reign_id,
                message_id,
                payment_id,
                previous_id,
                json.dumps(snapshot, ensure_ascii=False, separators=(",", ":")),
                iso(now),
            ),
        )
        if previous is not None:
            self._create_completed_snapshot(connection, previous, now)
            notifications = connection.execute(
                "SELECT * FROM reign_notifications WHERE reign_id = ? AND status = 'active'",
                (previous_id,),
            ).fetchall()
            for notification in notifications:
                notification_payload = {
                    "notificationId": int(notification["id"]),
                    "contactType": notification["contact_type"],
                    "contactValue": notification["contact_value"],
                    "message": previous["message"],
                    "takeBackUrl": f"{self.settings.site_url}/takeover?message={previous['slug']}",
                }
                insert_outbox(
                    connection,
                    "reign_replaced_notification",
                    notification_payload,
                    f"replaced:{previous_id}:{notification['id']}",
                )
        connection.execute(
            """UPDATE payment_intents
               SET status = 'confirmed', submitted_txid = ?, confirmed_at = ? WHERE id = ?""",
            (transfer.txid, iso(transfer.confirmed_at), intent["id"]),
        )
        connection.execute("DELETE FROM takeover_locks WHERE intent_id = ?", (intent["id"],))
        event_payload = {
            "reignPublicId": public_id,
            "resultPublicId": result_public_id,
        }
        insert_event(connection, reign_id, "new_reign_activated", event_payload)
        insert_outbox(connection, "takeover_confirmed", event_payload, f"takeover:{payment_id}")
        return {"status": "confirmed", "reignPublicId": public_id, "resultPublicId": result_public_id}

    def _create_completed_snapshot(self, connection: sqlite3.Connection, previous: sqlite3.Row, now: datetime) -> None:
        existing = connection.execute(
            "SELECT id FROM result_snapshots WHERE type = 'completed' AND reign_id = ?",
            (previous["id"],),
        ).fetchone()
        if existing is not None:
            return
        metrics = metrics_for_reign(connection, int(previous["id"]))
        duration_seconds = max(0, int((now - parse_iso(previous["started_at"])).total_seconds()))
        snapshot = {
            "type": "completed",
            "message": previous["message"],
            "signature": previous["signature"] or "",
            "duration": duration_text(duration_seconds),
            "durationSeconds": duration_seconds,
            **metrics,
            "reignPublicId": previous["public_id"],
        }
        connection.execute(
            """INSERT INTO result_snapshots
               (public_id, type, reign_id, message_id, previous_reign_id, snapshot_json, created_at)
               VALUES (?, 'completed', ?, ?, ?, ?, ?)""",
            (
                random_id("result", 12),
                previous["id"],
                previous["message_id"],
                previous["previous_reign_id"],
                json.dumps(snapshot, ensure_ascii=False, separators=(",", ":")),
                iso(now),
            ),
        )

    def _apply_defend(
        self,
        connection: sqlite3.Connection,
        intent: sqlite3.Row,
        transfer: ConfirmedTransfer,
        current: sqlite3.Row,
        now: datetime,
    ) -> dict:
        previous_payments = payments_for_reign(connection, int(current["id"]))
        before_strength = live_strength(
            [(int(row["amount_micro"]), parse_iso(row["confirmed_at"])) for row in previous_payments],
            now,
            self.settings.power_lifetime_seconds,
        )
        before_price = takeover_price(
            before_strength,
            self.settings.min_usdt_micro,
            self.settings.min_increment_micro,
            self.audience_floor(connection, now),
        )
        payment_id = self._insert_payment(
            connection, intent, transfer, int(current["id"]), int(current["message_id"]), now
        )
        after_strength = before_strength + transfer.amount_micro
        after_price = takeover_price(
            after_strength,
            self.settings.min_usdt_micro,
            self.settings.min_increment_micro,
            self.audience_floor(connection, now),
        )
        result_public_id = random_id("result", 12)
        snapshot = {
            "type": "defend",
            "message": current["message"],
            "amountMicro": transfer.amount_micro,
            "amount": format_usdt(transfer.amount_micro),
            "takeoverPriceBeforeMicro": before_price,
            "takeoverPriceBefore": format_usdt(before_price),
            "takeoverPriceAfterMicro": after_price,
            "takeoverPriceAfter": format_usdt(after_price),
            "reignPublicId": current["public_id"],
            "confirmedAt": iso(transfer.confirmed_at),
        }
        connection.execute(
            """INSERT INTO result_snapshots
               (public_id, type, reign_id, message_id, payment_id, previous_reign_id, snapshot_json, created_at)
               VALUES (?, 'defend', ?, ?, ?, ?, ?, ?)""",
            (
                result_public_id,
                current["id"],
                current["message_id"],
                payment_id,
                current["previous_reign_id"],
                json.dumps(snapshot, ensure_ascii=False, separators=(",", ":")),
                iso(now),
            ),
        )
        connection.execute(
            """UPDATE payment_intents
               SET status = 'confirmed', submitted_txid = ?, confirmed_at = ? WHERE id = ?""",
            (transfer.txid, iso(transfer.confirmed_at), intent["id"]),
        )
        event_payload = {
            "reignPublicId": current["public_id"],
            "amount": format_usdt(transfer.amount_micro),
            "takeoverPrice": format_usdt(after_price),
            "resultPublicId": result_public_id,
        }
        insert_event(connection, int(current["id"]), "current_message_backed", event_payload)
        insert_outbox(connection, "defend_confirmed", event_payload, f"defend:{payment_id}")
        return {"status": "confirmed", "resultPublicId": result_public_id}

    def reign(self, public_id: str, now: Optional[datetime] = None) -> dict:
        now = now or utc_now()
        connection = self.database.connect()
        try:
            row = reign_by_public_id(connection, public_id)
            if row is None:
                raise MarketError(404, "Reign not found.", "reign_not_found")
            payments = payments_for_reign(connection, int(row["id"]))
            metrics = metrics_for_reign(connection, int(row["id"]))
            replacement = connection.execute(
                "SELECT public_id FROM reigns WHERE previous_reign_id = ? ORDER BY started_at LIMIT 1",
                (row["id"],),
            ).fetchone()
            wall_slot_number = int(row["wall_slot_number"]) if row["wall_slot_number"] is not None else None
            current_wall = wall_slot_reign(connection, wall_slot_number) if wall_slot_number else None
            is_current_wall = current_wall is not None and int(current_wall["id"]) == int(row["id"])
            current_takeover_price = (
                format_usdt(int(current_wall["initial_amount_micro"]) + MICRO)
                if current_wall is not None
                else self.state(now)["takeoverPrice"]
            )
            ended = parse_iso(row["ended_at"]) if row["ended_at"] else now
            payload = self.message_payload(row)
            payload.update(metrics)
            payload.update(
                {
                    "status": "active" if is_current_wall else row["status"],
                    "wallSlotNumber": wall_slot_number,
                    "endedAt": row["ended_at"],
                    "endedReason": row["ended_reason"] or "",
                    "durationSeconds": max(0, int((ended - parse_iso(row["started_at"])).total_seconds())),
                    "initialAmount": format_usdt(int(row["initial_amount_micro"])),
                    "totalConfirmed": format_usdt(sum(int(payment["amount_micro"]) for payment in payments)),
                    "confirmedPayments": len(payments),
                    "backers": sum(1 for payment in payments if payment["type"] == "defend"),
                    "replacedByPublicId": replacement["public_id"] if replacement else "",
                    "currentTakeoverPrice": current_takeover_price,
                    "ledger": [
                        {
                            "type": payment["type"],
                            "amount": format_usdt(int(payment["amount_micro"])),
                            "txid": payment["txid"],
                            "shortTxid": shorten_txid(payment["txid"]),
                            "confirmedAt": payment["confirmed_at"],
                        }
                        for payment in payments
                    ],
                }
            )
            completed_result = connection.execute(
                "SELECT public_id FROM result_snapshots WHERE reign_id = ? AND type = 'completed' LIMIT 1",
                (row["id"],),
            ).fetchone()
            payload["completedShareUrl"] = (
                f"{self.settings.site_url}/result/{completed_result['public_id']}.png"
                if completed_result is not None
                else ""
            )
            payload["duration"] = duration_text(payload["durationSeconds"])
            return payload
        finally:
            connection.close()

    def archive(self) -> dict:
        connection = self.database.connect()
        try:
            current_wall_ids = {
                int(row["id"])
                for slot_number in (1, 2, 3)
                if (row := wall_slot_reign(connection, slot_number)) is not None
            }
            rows = connection.execute(
                """SELECT r.*, m.message, m.signature, m.location, m.slug, m.url, m.cta_label,
                          m.wall_slot_number
                   FROM reigns r JOIN messages m ON m.id = r.message_id
                   ORDER BY r.started_at DESC"""
            ).fetchall()
            reigns = []
            for row in rows:
                if row["wall_slot_number"] is not None and int(row["id"]) in current_wall_ids:
                    continue
                payments = payments_for_reign(connection, int(row["id"]))
                metrics = metrics_for_reign(connection, int(row["id"]))
                end = parse_iso(row["ended_at"]) if row["ended_at"] else utc_now()
                latest_payment = payments[-1] if payments else None
                total_confirmed_micro = sum(int(payment["amount_micro"]) for payment in payments)
                if row["wall_slot_number"] is not None and total_confirmed_micro == 0:
                    total_confirmed_micro = int(row["initial_amount_micro"])
                reigns.append(
                    {
                        "publicId": row["public_id"],
                        "message": row["message"],
                        "signature": row["signature"] or "",
                        "location": row["location"] or "",
                        "slug": row["slug"],
                        "url": row["url"] or "",
                        "ctaLabel": row["cta_label"] or "",
                        "status": "archived" if row["wall_slot_number"] is not None else row["status"],
                        "wallSlotNumber": int(row["wall_slot_number"]) if row["wall_slot_number"] is not None else None,
                        "startedAt": row["started_at"],
                        "endedAt": row["ended_at"],
                        "endedReason": row["ended_reason"] or "",
                        "durationSeconds": max(0, int((end - parse_iso(row["started_at"])).total_seconds())),
                        "initialAmountMicro": int(row["initial_amount_micro"]),
                        "totalConfirmedMicro": total_confirmed_micro,
                        "initialAmount": format_usdt(int(row["initial_amount_micro"])),
                        "totalConfirmed": format_usdt(total_confirmed_micro),
                        "confirmedPayments": len(payments),
                        "defendCount": sum(1 for payment in payments if payment["type"] == "defend"),
                        "latestPayment": None
                        if latest_payment is None
                        else {
                            "amount": format_usdt(int(latest_payment["amount_micro"])),
                            "txid": latest_payment["txid"],
                            "shortTxid": shorten_txid(latest_payment["txid"]),
                            "confirmedAt": latest_payment["confirmed_at"],
                        },
                        **metrics,
                    }
                )
            records = {}
            completed = [item for item in reigns if item["endedAt"] and item["durationSeconds"] > 0]
            defended = [item for item in reigns if item["totalConfirmedMicro"] > item["initialAmountMicro"]]
            read = [item for item in reigns if item["verifiedReaders"] > 0]
            funded = [item for item in reigns if item["initialAmountMicro"] > 0]
            if completed:
                winner = max(completed, key=lambda item: item["durationSeconds"])
                records["longest"] = {
                    "publicId": winner["publicId"],
                    "value": duration_text(winner["durationSeconds"]),
                }
            if funded:
                winner = max(funded, key=lambda item: item["initialAmountMicro"])
                records["highestTakeover"] = {
                    "publicId": winner["publicId"],
                    "value": f"{format_usdt(winner['initialAmountMicro'])} USDT",
                }
            if defended:
                winner = max(
                    defended,
                    key=lambda item: item["totalConfirmedMicro"] - item["initialAmountMicro"],
                )
                records["mostDefended"] = {
                    "publicId": winner["publicId"],
                    "value": f"{format_usdt(winner['totalConfirmedMicro'] - winner['initialAmountMicro'])} USDT",
                }
            if read:
                winner = max(read, key=lambda item: item["verifiedReaders"])
                records["mostRead"] = {
                    "publicId": winner["publicId"],
                    "value": f"{winner['verifiedReaders']:,} readers",
                }
            for item in reigns:
                item["duration"] = duration_text(item["durationSeconds"])
                item["initialAmount"] = format_usdt(item["initialAmountMicro"])
                item["totalConfirmed"] = format_usdt(item["totalConfirmedMicro"])
            return {"reigns": reigns, "records": records}
        finally:
            connection.close()

    def stats(self, period: str = "24h") -> dict:
        windows = {"24h": 1, "7d": 7, "all": 36500}
        days = windows.get(period, 1)
        since = (utc_now() - timedelta(days=days)).date().isoformat()
        connection = self.database.connect()
        try:
            metrics = connection.execute(
                """SELECT COALESCE(SUM(unique_visitors), 0), COALESCE(SUM(verified_readers), 0),
                          COALESCE(SUM(outbound_clicks), 0), COALESCE(MAX(countries_count), 0)
                   FROM message_metrics_daily WHERE date_utc >= ?""",
                (since,),
            ).fetchone()
            payment = connection.execute(
                """SELECT COALESCE(SUM(amount_micro), 0),
                          COALESCE(SUM(CASE WHEN type = 'takeover' THEN 1 ELSE 0 END), 0),
                          COALESCE(SUM(CASE WHEN type = 'defend' THEN 1 ELSE 0 END), 0)
                   FROM payments WHERE confirmed_at >= ?""",
                (since + "T00:00:00Z",),
            ).fetchone()
            duration_rows = connection.execute(
                "SELECT started_at, ended_at FROM reigns WHERE ended_at IS NOT NULL AND ended_at >= ?",
                (since + "T00:00:00Z",),
            ).fetchall()
            durations = sorted(
                max(0, int((parse_iso(row["ended_at"]) - parse_iso(row["started_at"])).total_seconds()))
                for row in duration_rows
            )
            average = sum(durations) // len(durations) if durations else 0
            median = durations[len(durations) // 2] if durations else 0
            current = self.state()
            wall_rows = [wall_slot_reign(connection, slot_number) for slot_number in (1, 2, 3)]
            wall_amounts = [int(row["initial_amount_micro"]) for row in wall_rows if row is not None]
            sources = connection.execute(
                """SELECT source, device_class, os_family, SUM(visitors) AS total
                   FROM metric_sources WHERE date_utc >= ?
                   GROUP BY source, device_class, os_family ORDER BY total DESC LIMIT 30""",
                (since,),
            ).fetchall()
            return {
                "period": period,
                "uniqueVisitors": int(metrics[0]),
                "verifiedReaders": int(metrics[1]),
                "outboundClicks": int(metrics[2]),
                "countries": int(metrics[3]),
                "verifiedUsdt": format_usdt(int(payment[0])),
                "takeovers": int(payment[1]),
                "defendPayments": int(payment[2]),
                "averageReignDuration": duration_text(average),
                "medianReignDuration": duration_text(median),
                "currentTakeoverPrice": current["takeoverPrice"],
                "paidSlots": len(wall_amounts),
                "currentWallTotal": format_usdt(sum(wall_amounts)),
                "nextOutbids": [format_usdt(amount + MICRO) for amount in wall_amounts],
                "sources": [dict(row) for row in sources],
            }
        finally:
            connection.close()

    def record_metric(
        self,
        payload: dict,
        ip: str,
        agent: str,
        country: str = "",
        referrer: str = "",
    ) -> None:
        kind = str(payload.get("type") or "visit")
        if kind not in {"visit", "reader", "click", "share_arrival"}:
            return
        if is_known_bot(agent):
            return
        reign_public_id = str(payload.get("reignId") or "")
        connection = self.database.connect()
        try:
            row = reign_by_public_id(connection, reign_public_id) if reign_public_id else active_reign(connection)
            if row is None:
                return
            now = utc_now()
            day = now.date().isoformat()
            visitor = self.visitor_hash(ip, agent, purpose="metric", day=day)
            metric_kind = kind if kind != "click" else "visit"
            inserted = False
            if kind != "click":
                cursor = connection.execute(
                    """INSERT OR IGNORE INTO metric_visitors
                       (day_utc, reign_id, visitor_hash, kind, created_at) VALUES (?, ?, ?, ?, ?)""",
                    (day, row["id"], visitor, metric_kind, iso(now)),
                )
                inserted = cursor.rowcount > 0
            connection.execute(
                """INSERT OR IGNORE INTO message_metrics_daily
                   (date_utc, message_id, reign_id) VALUES (?, ?, ?)""",
                (day, row["message_id"], row["id"]),
            )
            field = None
            if kind == "visit" and inserted:
                field = "unique_visitors"
            elif kind == "reader" and inserted:
                field = "verified_readers"
            elif kind == "share_arrival" and inserted:
                field = "share_arrivals"
            elif kind == "click":
                field = "outbound_clicks"
            if field:
                connection.execute(
                    f"""UPDATE message_metrics_daily SET {field} = {field} + 1
                        WHERE date_utc = ? AND message_id = ? AND reign_id = ?""",
                    (day, row["message_id"], row["id"]),
                )
            normalized_country = country.strip().upper()
            if len(normalized_country) == 2 and normalized_country.isalpha():
                connection.execute(
                    "INSERT OR IGNORE INTO metric_countries (date_utc, reign_id, country_code) VALUES (?, ?, ?)",
                    (day, row["id"], normalized_country),
                )
                count = connection.execute(
                    "SELECT COUNT(DISTINCT country_code) FROM metric_countries WHERE reign_id = ?",
                    (row["id"],),
                ).fetchone()[0]
                connection.execute(
                    """UPDATE message_metrics_daily SET countries_count = ?
                       WHERE date_utc = ? AND message_id = ? AND reign_id = ?""",
                    (count, day, row["message_id"], row["id"]),
                )
            if kind == "visit" and inserted:
                source = source_family(referrer)
                device = device_class(agent)
                os_name = os_family(agent)
                connection.execute(
                    """INSERT INTO metric_sources
                       (date_utc, source, device_class, os_family, visitors)
                       VALUES (?, ?, ?, ?, 1)
                       ON CONFLICT (date_utc, source, device_class, os_family)
                       DO UPDATE SET visitors = visitors + 1""",
                    (day, source, device, os_name),
                )
            connection.commit()
        finally:
            connection.close()

    def hide_current(self, note: str) -> None:
        now = utc_now()
        with self.database.transaction() as connection:
            current = active_reign(connection)
            if current is None:
                raise MarketError(409, "There is no active reign.", "unclaimed")
            connection.execute(
                """UPDATE reigns SET status = 'moderated', ended_at = ?, ended_reason = 'moderated'
                   WHERE id = ?""",
                (iso(now), current["id"]),
            )
            connection.execute("UPDATE messages SET status = 'hidden' WHERE id = ?", (current["message_id"],))
            connection.execute("UPDATE payment_intents SET status = 'cancelled' WHERE current_reign_id = ? AND status = 'created'", (current["id"],))
            connection.execute("DELETE FROM takeover_locks WHERE current_reign_id = ?", (current["id"],))
            connection.execute(
                "INSERT INTO admin_audit (action, target, note, created_at) VALUES ('hide', ?, ?, ?)",
                (current["public_id"], note[:500], iso(now)),
            )
            self._create_completed_snapshot(connection, current, now)
            insert_event(connection, int(current["id"]), "current_reign_ended", {"reason": "moderated"})

    def force_unlock(self, note: str) -> None:
        now = utc_now()
        with self.database.transaction() as connection:
            locks = connection.execute("SELECT * FROM takeover_locks").fetchall()
            for lock in locks:
                connection.execute(
                    "UPDATE payment_intents SET status = 'cancelled' WHERE id = ? AND status = 'created'",
                    (lock["intent_id"],),
                )
            connection.execute("DELETE FROM takeover_locks")
            connection.execute(
                "INSERT INTO admin_audit (action, target, note, created_at) VALUES ('force_unlock', 'takeover_locks', ?, ?)",
                (note[:500], iso(now)),
            )
            insert_event(connection, None, "takeover_lock_cleared", {})

    def reconcile_reigns(self) -> dict:
        connection = self.database.connect()
        try:
            active_count = connection.execute("SELECT COUNT(*) FROM reigns WHERE status = 'active'").fetchone()[0]
            orphan_payments = connection.execute(
                """SELECT COUNT(*) FROM payments p
                   LEFT JOIN reigns r ON r.id = p.reign_id
                   WHERE p.reign_id IS NOT NULL AND r.id IS NULL"""
            ).fetchone()[0]
            current = active_reign(connection)
            current_check = None
            if current is not None:
                rows = payments_for_reign(connection, int(current["id"]))
                strength = live_strength(
                    [(int(row["amount_micro"]), parse_iso(row["confirmed_at"])) for row in rows],
                    utc_now(),
                    self.settings.power_lifetime_seconds,
                )
                current_check = {
                    "publicId": current["public_id"],
                    "payments": len(rows),
                    "totalConfirmedMicro": sum(int(row["amount_micro"]) for row in rows),
                    "activeBackingMicro": strength,
                    "takeoverPriceMicro": takeover_price(
                        strength,
                        self.settings.min_usdt_micro,
                        self.settings.min_increment_micro,
                        self.audience_floor(connection, utc_now()),
                    ),
                }
            return {
                "ok": active_count <= 1 and orphan_payments == 0,
                "activeReigns": active_count,
                "orphanPayments": orphan_payments,
                "current": current_check,
            }
        finally:
            connection.close()

    def admin_summary(self) -> dict:
        connection = self.database.connect()
        try:
            counts = {}
            for table in ("messages", "reigns", "payment_intents", "payments", "outbox"):
                counts[table] = int(connection.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0])
            intents = [dict(row) for row in connection.execute(
                "SELECT id, kind, status, requested_amount_micro, submitted_txid, created_at FROM payment_intents ORDER BY created_at DESC LIMIT 50"
            ).fetchall()]
            outbox = [dict(row) for row in connection.execute(
                "SELECT id, type, status, attempts, next_attempt_at, last_error FROM outbox ORDER BY id DESC LIMIT 50"
            ).fetchall()]
            return {
                "state": self.state(),
                "counts": counts,
                "intents": intents,
                "outbox": outbox,
                "reconcile": self.reconcile_reigns(),
            }
        finally:
            connection.close()


def source_family(referrer: str) -> str:
    if not referrer:
        return "direct"
    try:
        host = (urlsplit(referrer).hostname or "").lower()
    except ValueError:
        return "other"
    if host.endswith("google.com") or host.endswith("bing.com") or host.endswith("duckduckgo.com"):
        return "search"
    if host.endswith("t.me") or "telegram" in host:
        return "telegram"
    if host.endswith("coin.im"):
        return "coin.im"
    return "referral"


def is_known_bot(agent: str) -> bool:
    lowered = agent.lower()
    markers = (
        "bot",
        "crawler",
        "spider",
        "slurp",
        "preview",
        "facebookexternalhit",
        "twitterbot",
        "linkedinbot",
        "headlesschrome",
        "lighthouse",
    )
    return not lowered.strip() or any(marker in lowered for marker in markers)


def device_class(agent: str) -> str:
    lowered = agent.lower()
    if "tablet" in lowered or "ipad" in lowered:
        return "tablet"
    if "mobile" in lowered or "iphone" in lowered or "android" in lowered:
        return "mobile"
    return "desktop"


def os_family(agent: str) -> str:
    lowered = agent.lower()
    if "iphone" in lowered or "ipad" in lowered:
        return "iOS"
    if "android" in lowered:
        return "Android"
    if "windows" in lowered:
        return "Windows"
    if "mac os" in lowered or "macintosh" in lowered:
        return "macOS"
    if "linux" in lowered:
        return "Linux"
    return "Other"
