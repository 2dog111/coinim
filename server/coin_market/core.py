from __future__ import annotations

import hashlib
import ipaddress
import re
import secrets
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation, ROUND_DOWN
from urllib.parse import urlsplit

try:
    import regex as unicode_regex
except ImportError:  # pragma: no cover - environment verification rejects this in production
    unicode_regex = None


MICRO = 1_000_000
UTC = timezone.utc
MAX_MESSAGE_NONSPACE_GRAPHEMES = 888
TXID_RE = re.compile(r"^[0-9a-fA-F]{64}$")
TRON_ADDRESS_RE = re.compile(r"^T[1-9A-HJ-NP-Za-km-z]{33}$")


class MarketError(Exception):
    def __init__(self, status: int, message: str, code: str = "market_error") -> None:
        super().__init__(message)
        self.status = status
        self.message = message
        self.code = code


def utc_now() -> datetime:
    return datetime.now(UTC)


def iso(value: datetime) -> str:
    return value.astimezone(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")


def parse_iso(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(UTC)


def grapheme_count(value: str) -> int:
    if unicode_regex is None:
        return len(value)
    return len(unicode_regex.findall(r"\X", value))


def clean_text(value: object, label: str, *, required: bool = False, maximum: int = 500) -> str:
    if value is None:
        value = ""
    if not isinstance(value, str):
        raise MarketError(422, f"{label} is not valid.", "invalid_text")
    result = value.strip()
    if required and not result:
        raise MarketError(422, f"{label} is required.", "required")
    if any(ord(character) < 32 and character not in "\n\t" for character in result):
        raise MarketError(422, f"{label} contains unsupported characters.", "invalid_text")
    if grapheme_count(result) > maximum:
        raise MarketError(422, f"{label} must be {maximum} characters or fewer.", "too_long")
    return result


def validate_message_fields(payload: dict) -> dict[str, str]:
    message = clean_text(payload.get("message"), "Your message", required=True, maximum=4000)
    message_length = grapheme_count(re.sub(r"\s", "", message))
    if message_length > MAX_MESSAGE_NONSPACE_GRAPHEMES:
        raise MarketError(
            422,
            f"Your message must be {MAX_MESSAGE_NONSPACE_GRAPHEMES} characters or fewer without spaces.",
            "too_long",
        )
    signature = clean_text(payload.get("signature"), "Signature", maximum=80)
    location = clean_text(payload.get("location"), "Location", maximum=100)
    cta_label = clean_text(payload.get("ctaLabel"), "Button text", maximum=48)
    url = validate_public_url(payload.get("url"))
    if cta_label and not url:
        raise MarketError(422, "Button text needs a public link.", "cta_without_url")
    return {
        "message": message,
        "signature": signature,
        "location": location,
        "url": url,
        "cta_label": cta_label,
    }


def validate_public_url(value: object) -> str:
    if value is None or value == "":
        return ""
    if not isinstance(value, str) or len(value) > 2048:
        raise MarketError(422, "Enter a valid public link.", "invalid_url")
    candidate = value.strip()
    parsed = urlsplit(candidate)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username or parsed.password:
        raise MarketError(422, "Enter a public link beginning with http:// or https://.", "invalid_url")
    hostname = parsed.hostname.lower().rstrip(".")
    if hostname == "localhost" or hostname.endswith(".localhost") or hostname.endswith(".local"):
        raise MarketError(422, "The link must use a public address.", "private_url")
    try:
        address = ipaddress.ip_address(hostname)
    except ValueError:
        address = None
    if address is not None and not address.is_global:
        raise MarketError(422, "The link must use a public address.", "private_url")
    return candidate


def parse_usdt(value: object, *, minimum_micro: int = 1) -> int:
    if isinstance(value, bool):
        raise MarketError(422, "Enter a valid USDT amount.", "invalid_amount")
    try:
        amount = Decimal(str(value))
    except (InvalidOperation, ValueError):
        raise MarketError(422, "Enter a valid USDT amount.", "invalid_amount")
    if not amount.is_finite() or amount <= 0 or amount.as_tuple().exponent < -6:
        raise MarketError(422, "Use no more than six decimal places.", "invalid_amount")
    micro = int((amount * MICRO).to_integral_exact(rounding=ROUND_DOWN))
    if micro < minimum_micro:
        raise MarketError(422, f"The minimum is {format_usdt(minimum_micro)} USDT.", "under_minimum")
    if micro > 10_000_000 * MICRO:
        raise MarketError(422, "The amount is above the supported limit.", "amount_too_large")
    return micro


def format_usdt(amount_micro: int) -> str:
    whole, fraction = divmod(max(0, int(amount_micro)), MICRO)
    if not fraction:
        return f"{whole:,}"
    return f"{whole:,}.{fraction:06d}".rstrip("0")


def payment_power(amount_micro: int, confirmed_at: datetime, now: datetime, lifetime_seconds: int) -> int:
    age_seconds = (now - confirmed_at).total_seconds()
    if age_seconds < 0 or age_seconds >= lifetime_seconds:
        return 0
    remaining = lifetime_seconds - age_seconds
    return int(amount_micro * remaining // lifetime_seconds)


def live_strength(payments: list[tuple[int, datetime]], now: datetime, lifetime_seconds: int) -> int:
    return sum(payment_power(amount, confirmed, now, lifetime_seconds) for amount, confirmed in payments)


def takeover_price(
    active_backing_micro: int,
    minimum_micro: int,
    increment_micro: int,
    audience_floor_micro: int = 0,
) -> int:
    del increment_micro, audience_floor_micro
    next_whole_coin = (max(0, active_backing_micro) // MICRO + 1) * MICRO
    return max(minimum_micro, next_whole_coin)


def random_id(prefix: str, bytes_count: int = 12) -> str:
    return f"{prefix}_{secrets.token_urlsafe(bytes_count).replace('-', '').replace('_', '')}"


def random_token(bytes_count: int = 32) -> str:
    return secrets.token_urlsafe(bytes_count)


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def slug_from_message(message: str) -> str:
    words = re.findall(r"[a-z0-9]+", message.lower())[:7]
    base = "-".join(words)[:64].strip("-") or "message"
    return f"{base}-{secrets.token_hex(3)}"


def duration_text(seconds: int) -> str:
    seconds = max(0, int(seconds))
    days, seconds = divmod(seconds, 86400)
    hours, seconds = divmod(seconds, 3600)
    minutes, _ = divmod(seconds, 60)
    parts: list[str] = []
    if days:
        parts.append(f"{days}d")
    if hours or days:
        parts.append(f"{hours}h")
    parts.append(f"{minutes}m")
    return " ".join(parts)


def shorten_txid(txid: str) -> str:
    return f"{txid[:8]}…{txid[-8:]}" if len(txid) > 20 else txid
