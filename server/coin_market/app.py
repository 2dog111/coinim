from __future__ import annotations

import asyncio
import base64
import hashlib
import hmac
import json
import logging
import mimetypes
import os
import re
import time
from datetime import datetime, timedelta
from http.cookies import SimpleCookie
from pathlib import Path
from typing import Optional
from urllib.parse import parse_qs, urlsplit

from . import __version__
from .config import Settings
from .capture_client import capture_from_service
from .core import MarketError, TXID_RE, iso, parse_iso, random_id, token_hash, utc_now, validate_public_url
from .db import Database, active_reign, reign_by_public_id, snapshot_by_public_id
from .market import MarketService, is_social_profile_url
from .payments import ConfirmedTransfer, MockPaymentProvider, PaymentPending, provider_from_settings
from .qr import payment_request_url, svg as qr_svg
from .render import (
    escape,
    render_admin,
    render_admin_login,
    render_archive,
    render_badge_svg,
    render_home,
    render_poster,
    render_receipt,
    render_reign,
    render_rules,
    render_stats,
    render_takeover,
    result_png,
)


logger = logging.getLogger("coin-market")
settings = Settings.from_env()
database = Database(settings)
database.migrate()
provider = provider_from_settings(settings)
market = MarketService(settings, database, provider)

MAX_JSON_BYTES = 64 * 1024
MAX_FORM_BYTES = 16 * 1024
PUBLIC_ID_RE = re.compile(r"^(?:reign|result)_[A-Za-z0-9]{12,40}$")
SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]{1,90}$")


class HTTPError(MarketError):
    pass


def headers_dict(scope: dict) -> dict[str, str]:
    return {key.decode("latin-1").lower(): value.decode("latin-1") for key, value in scope.get("headers", [])}


def client_ip(scope: dict, headers: dict[str, str]) -> str:
    return headers.get("x-real-ip") or (scope.get("client") or ["unknown"])[0]


def security_headers(*, noindex: bool = False, receipt: bool = False) -> list[tuple[bytes, bytes]]:
    result = [
        (b"x-content-type-options", b"nosniff"),
        (b"x-frame-options", b"DENY"),
        (b"referrer-policy", b"no-referrer" if receipt else b"strict-origin-when-cross-origin"),
        (b"permissions-policy", b"camera=(), microphone=(), geolocation=(), payment=()"),
        (
            b"content-security-policy",
            b"default-src 'self'; img-src 'self' data: blob:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
        ),
    ]
    if noindex:
        result.append((b"x-robots-tag", b"noindex, nofollow"))
    return result


async def send_response(
    send,
    status: int,
    body: bytes,
    content_type: str,
    *,
    cache_control: str = "no-store",
    extra_headers: Optional[list[tuple[bytes, bytes]]] = None,
    noindex: bool = False,
    receipt: bool = False,
) -> None:
    headers = [
        (b"content-type", content_type.encode("latin-1")),
        (b"content-length", str(len(body)).encode("ascii")),
        (b"cache-control", cache_control.encode("latin-1")),
    ]
    headers.extend(security_headers(noindex=noindex, receipt=receipt))
    headers.extend(extra_headers or [])
    await send({"type": "http.response.start", "status": status, "headers": headers})
    await send({"type": "http.response.body", "body": body})


async def send_html(send, status: int, body: str, **kwargs) -> None:
    await send_response(send, status, body.encode("utf-8"), "text/html; charset=utf-8", **kwargs)


async def send_json(send, status: int, payload: dict, **kwargs) -> None:
    body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    await send_response(send, status, body, "application/json; charset=utf-8", **kwargs)


async def send_redirect(send, location: str, status: int = 303, *, noindex: bool = False) -> None:
    await send_response(
        send,
        status,
        b"",
        "text/plain; charset=utf-8",
        extra_headers=[(b"location", location.encode("utf-8"))],
        noindex=noindex,
    )


async def read_body(receive, limit: int) -> bytes:
    chunks: list[bytes] = []
    total = 0
    while True:
        message = await receive()
        if message["type"] == "http.disconnect":
            raise HTTPError(400, "The request was interrupted.", "interrupted")
        chunk = message.get("body", b"")
        total += len(chunk)
        if total > limit:
            raise HTTPError(413, "The request is too large.", "too_large")
        chunks.append(chunk)
        if not message.get("more_body", False):
            return b"".join(chunks)


async def read_json(receive, limit: int = MAX_JSON_BYTES) -> dict:
    body = await read_body(receive, limit)
    try:
        value = json.loads(body or b"{}")
    except json.JSONDecodeError as error:
        raise HTTPError(400, "The request is not valid JSON.", "invalid_json") from error
    if not isinstance(value, dict):
        raise HTTPError(400, "The request must be an object.", "invalid_json")
    return value


async def read_form(receive) -> dict[str, str]:
    body = await read_body(receive, MAX_FORM_BYTES)
    values = parse_qs(body.decode("utf-8", "replace"), keep_blank_values=True)
    return {key: items[-1] for key, items in values.items()}


def query_dict(scope: dict) -> dict[str, str]:
    values = parse_qs(scope.get("query_string", b"").decode("utf-8", "replace"), keep_blank_values=True)
    return {key: items[-1] for key, items in values.items()}


def require_same_origin(headers: dict[str, str]) -> None:
    origin = headers.get("origin", "")
    if origin and origin.rstrip("/") != settings.site_url:
        raise HTTPError(403, "Cross-site requests are not allowed.", "origin_rejected")
    host = headers.get("host", "").split(":", 1)[0].lower()
    expected = settings.site_url.split("://", 1)[-1].split("/", 1)[0].split(":", 1)[0].lower()
    if host and host not in {expected, "127.0.0.1", "localhost"}:
        raise HTTPError(403, "The request host is not allowed.", "host_rejected")


def admin_cookie(value: str) -> str:
    return f"coin_market_admin={value}; Path=/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=43200"


def create_admin_session() -> str:
    expiry = int(time.time()) + 43200
    payload = str(expiry)
    signature = hmac.new(settings.session_secret.encode("utf-8"), payload.encode("ascii"), hashlib.sha256).hexdigest()
    return f"{payload}.{signature}"


def valid_admin_session(headers: dict[str, str]) -> bool:
    if not settings.admin_password or len(settings.session_secret) < 32:
        return False
    cookie = SimpleCookie()
    try:
        cookie.load(headers.get("cookie", ""))
        value = cookie["coin_market_admin"].value
        expiry_text, signature = value.split(".", 1)
        expected = hmac.new(settings.session_secret.encode("utf-8"), expiry_text.encode("ascii"), hashlib.sha256).hexdigest()
        return hmac.compare_digest(signature, expected) and int(expiry_text) >= int(time.time())
    except (KeyError, ValueError):
        return False


async def send_events(scope: dict, receive, send, headers: dict[str, str]) -> None:
    raw_last_id = headers.get("last-event-id", "").strip()
    try:
        last_id = max(0, int(raw_last_id)) if raw_last_id else 0
    except ValueError:
        last_id = 0
    if not raw_last_id:
        connection = database.connect()
        try:
            row = connection.execute("SELECT COALESCE(MAX(id), 0) AS id FROM live_events").fetchone()
            last_id = int(row["id"])
        finally:
            connection.close()
    await send(
        {
            "type": "http.response.start",
            "status": 200,
            "headers": [
                (b"content-type", b"text/event-stream; charset=utf-8"),
                (b"cache-control", b"no-cache, no-transform"),
                (b"x-accel-buffering", b"no"),
                (b"connection", b"keep-alive"),
                *security_headers(),
            ],
        }
    )
    started = time.monotonic()
    while time.monotonic() - started < 55:
        disconnect = asyncio.create_task(receive())
        await asyncio.sleep(1)
        if disconnect.done() and disconnect.result()["type"] == "http.disconnect":
            return
        disconnect.cancel()
        connection = database.connect()
        try:
            rows = connection.execute(
                "SELECT * FROM live_events WHERE id > ? ORDER BY id LIMIT 100", (last_id,)
            ).fetchall()
        finally:
            connection.close()
        if rows:
            for row in rows:
                last_id = int(row["id"])
                payload = f"id: {last_id}\nevent: {row['type']}\ndata: {row['payload_json']}\n\n".encode("utf-8")
                await send({"type": "http.response.body", "body": payload, "more_body": True})
        elif int(time.monotonic() - started) % 15 == 0:
            await send({"type": "http.response.body", "body": b": heartbeat\n\n", "more_body": True})
    await send({"type": "http.response.body", "body": b"", "more_body": False})


async def app(scope: dict, receive, send) -> None:
    if scope["type"] != "http":
        return
    method = scope.get("method", "GET").upper()
    path = scope.get("path", "/")
    headers = headers_dict(scope)
    query = query_dict(scope)
    try:
        if path == "/api/market/health" and method == "GET":
            await send_json(
                send,
                200,
                {
                    "ok": True,
                    "version": __version__,
                    "provider": provider.name,
                    "marketEnabled": market.accepting_payments,
                    "database": market.reconcile_reigns()["ok"],
                },
            )
            return
        if path == "/api/market/state" and method == "GET":
            payload = market.state()
            stable_payload = {key: value for key, value in payload.items() if key != "serverNow"}
            etag = hashlib.sha256(json.dumps(stable_payload, sort_keys=True).encode()).hexdigest()[:24]
            if headers.get("if-none-match") == f'"{etag}"':
                await send_response(send, 304, b"", "application/json", extra_headers=[(b"etag", f'"{etag}"'.encode())])
            else:
                await send_json(send, 200, payload, extra_headers=[(b"etag", f'"{etag}"'.encode())])
            return
        if path == "/api/market/events" and method == "GET":
            await send_events(scope, receive, send, headers)
            return
        if path == "/api/market/takeover-intents" and method == "POST":
            require_same_origin(headers)
            payload = await read_json(receive)
            visitor = market.visitor_hash(client_ip(scope, headers), headers.get("user-agent", ""), purpose="quote")
            try:
                wall_slot = int(payload.get("wallSlot"))
            except (TypeError, ValueError):
                wall_slot = 0
            if wall_slot == 1:
                website_url = validate_public_url(payload.get("url"))
                if not website_url:
                    raise HTTPError(422, "Enter the website link.", "url_required")
                if is_social_profile_url(website_url):
                    raise HTTPError(422, "Use Social for a profile link.", "wrong_slot_type")
                capture = await capture_from_service(settings.screenshot_service_url, website_url)
                payload["url"] = website_url
                payload["screenshotData"] = "data:image/webp;base64," + base64.b64encode(capture.image).decode("ascii")
                if capture.favicon:
                    payload["faviconData"] = "data:image/webp;base64," + base64.b64encode(capture.favicon).decode("ascii")
                if not str(payload.get("signature") or "").strip():
                    payload["signature"] = capture.title or (urlsplit(website_url).hostname or "Website").removeprefix("www.")
            await send_json(send, 201, market.create_takeover_intent(payload, visitor))
            return
        media_match = re.fullmatch(r"/media/market/([a-z0-9][a-z0-9-]{1,90})", path)
        if media_match and method == "GET":
            connection = database.connect()
            try:
                row = connection.execute(
                    """SELECT screenshot_blob, screenshot_mime FROM messages
                       WHERE slug = ? AND status = 'published' AND screenshot_blob IS NOT NULL""",
                    (media_match.group(1),),
                ).fetchone()
            finally:
                connection.close()
            if row is None:
                raise HTTPError(404, "Screenshot not found.", "screenshot_not_found")
            await send_response(
                send,
                200,
                bytes(row["screenshot_blob"]),
                row["screenshot_mime"] or "image/webp",
                cache_control="public, max-age=31536000, immutable",
            )
            return
        favicon_match = re.fullmatch(r"/media/market/([a-z0-9][a-z0-9-]{1,90})/favicon", path)
        if favicon_match and method == "GET":
            connection = database.connect()
            try:
                row = connection.execute(
                    """SELECT favicon_blob, favicon_mime FROM messages
                       WHERE slug = ? AND status = 'published' AND favicon_blob IS NOT NULL""",
                    (favicon_match.group(1),),
                ).fetchone()
            finally:
                connection.close()
            if row is None:
                raise HTTPError(404, "Favicon not found.", "favicon_not_found")
            await send_response(
                send,
                200,
                bytes(row["favicon_blob"]),
                row["favicon_mime"] or "image/webp",
                cache_control="public, max-age=31536000, immutable",
            )
            return
        if path == "/api/market/defend-intents" and method == "POST":
            require_same_origin(headers)
            payload = await read_json(receive)
            visitor = market.visitor_hash(client_ip(scope, headers), headers.get("user-agent", ""), purpose="defend")
            await send_json(send, 201, market.create_defend_intent(payload, visitor))
            return
        receipt_match = re.fullmatch(r"/api/market/receipt/([A-Za-z0-9_-]{32,100})", path)
        if receipt_match and method == "GET":
            token = receipt_match.group(1)
            payload = market.discover_intent(token) if market.accepting_payments else market.receipt(token)
            await send_json(send, 200, payload, noindex=True, receipt=True)
            return
        verify_match = re.fullmatch(r"/api/market/receipt/([A-Za-z0-9_-]{32,100})/verify", path)
        if verify_match and method == "POST":
            require_same_origin(headers)
            payload = await read_json(receive)
            txid = str(payload.get("txid") or "").strip()
            await send_json(send, 200, market.verify_intent(verify_match.group(1), txid), noindex=True, receipt=True)
            return
        notification_match = re.fullmatch(r"/api/market/receipt/([A-Za-z0-9_-]{32,100})/notification", path)
        if notification_match and method == "POST":
            require_same_origin(headers)
            payload = await read_json(receive)
            result = market.subscribe_replacement(
                notification_match.group(1), str(payload.get("contact") or "")
            )
            await send_json(send, 201, result, noindex=True, receipt=True)
            return
        qr_match = re.fullmatch(r"/api/market/receipt/([A-Za-z0-9_-]{32,100})/qr\.svg", path)
        if qr_match and method == "GET":
            token = qr_match.group(1)
            receipt = market.receipt(token)
            address = receipt.get("receivingAddress") or ""
            contract = receipt.get("contractAddress") or ""
            if not address or not contract:
                raise HTTPError(404, "Payment details are not available.", "payment_details_unavailable")
            request_url = payment_request_url(
                settings.site_url,
                token,
                address,
                receipt["amount"],
                contract,
            )
            await send_response(send, 200, qr_svg(request_url).encode("utf-8"), "image/svg+xml", noindex=True, receipt=True)
            return
        callback_match = re.fullmatch(r"/api/market/receipt/([A-Za-z0-9_-]{32,100})/tronlink-callback", path)
        if callback_match and method == "POST":
            payload = await read_json(receive)
            txid = str(payload.get("transactionHash") or "").strip().lower()
            if TXID_RE.fullmatch(txid):
                try:
                    market.verify_intent(callback_match.group(1), txid)
                except MarketError:
                    pass
            await send_json(send, 200, {"ok": True}, noindex=True, receipt=True)
            return
        if path == "/api/market/analytics" and method == "POST":
            payload = await read_json(receive)
            market.record_metric(
                payload,
                client_ip(scope, headers),
                headers.get("user-agent", ""),
                headers.get("x-country-code", ""),
                headers.get("referer", ""),
            )
            await send_response(send, 204, b"", "text/plain")
            return
        if path == "/api/market/mock/confirm" and method == "POST":
            if not (settings.is_local and isinstance(provider, MockPaymentProvider)):
                raise HTTPError(404, "Not found.", "not_found")
            payload = await read_json(receive)
            token = str(payload.get("receiptToken") or "")
            intent = market.intent_for_token(token)
            txid = hashlib.sha256(f"{intent['id']}|{time.time_ns()}".encode()).hexdigest()
            transfer = ConfirmedTransfer(
                txid=txid,
                event_index=0,
                amount_micro=int(intent["requested_amount_micro"]),
                contract_address=settings.contract_address or "TMockContract111111111111111111111",
                receiving_address=settings.receive_address or "TMockReceive1111111111111111111111",
                confirmed_at=utc_now(),
            )
            provider.add(transfer)
            await send_json(send, 200, {"txid": txid})
            return

        if settings.is_local and method == "GET" and path.startswith("/assets/"):
            project_root = Path(__file__).resolve().parents[2]
            relative = path.lstrip("/")
            source = (project_root / relative).resolve()
            assets_root = (project_root / "assets").resolve()
            if str(source).startswith(str(assets_root) + os.sep) and source.is_file():
                content_type = mimetypes.guess_type(source.name)[0] or "application/octet-stream"
                await send_response(send, 200, source.read_bytes(), content_type, cache_control="no-cache")
                return

        if settings.is_local and method == "GET":
            project_root = Path(__file__).resolve().parents[2]
            local_static = {
                "/": project_root / "index.html",
                "/mail": project_root / "mail.html",
                "/mail/": project_root / "mail" / "index.html",
                "/ms": project_root / "ms.html",
                "/ms/": project_root / "ms" / "index.html",
                "/msru": project_root / "msru.html",
                "/msru/": project_root / "msru" / "index.html",
                "/open": project_root / "open.html",
                "/open/": project_root / "open" / "index.html",
                "/handling": project_root / "handling.html",
                "/handling/": project_root / "handling" / "index.html",
                "/robots.txt": project_root / "robots.txt",
                "/sitemap.xml": project_root / "sitemap.xml",
            }.get(path)
            if local_static is not None and local_static.is_file():
                content_type = mimetypes.guess_type(local_static.name)[0] or "text/html"
                await send_response(send, 200, local_static.read_bytes(), content_type, cache_control="no-cache")
                return

        if path in {"/", "/message", "/message/"} and method == "GET":
            await send_html(send, 200, render_home(settings, market.wall_state()))
            return
        if path == "/takeover" and method == "GET":
            return_message = None
            wall_slot = None
            slot_value = query.get("slot", "3")
            message_slug = query.get("message", "")
            try:
                slot_number = int(slot_value)
            except ValueError as error:
                raise HTTPError(404, "The wall slot was not found.", "wall_slot_not_found") from error
            wall_state = market.wall_state()
            wall_slots = wall_state["slots"]
            wall_slot = next((item for item in wall_slots if item["slotNumber"] == slot_number), None)
            if wall_slot is None:
                raise HTTPError(404, "The wall slot was not found.", "wall_slot_not_found")
            if message_slug:
                connection = database.connect()
                try:
                    row = connection.execute(
                        """SELECT slug, message, signature, url, cta_label
                           FROM messages WHERE slug = ? AND status = 'published'""",
                        (message_slug,),
                    ).fetchone()
                    return_message = dict(row) if row is not None else None
                finally:
                    connection.close()
                if return_message is None:
                    raise HTTPError(404, "The message cannot be brought back.", "message_not_found")
            await send_html(
                send,
                200,
                render_takeover(
                    settings,
                    market.state(),
                    query.get("kind", "takeover"),
                    return_message,
                    wall_slot,
                    wall_state,
                ),
                noindex=True,
            )
            return
        receipt_page = re.fullmatch(r"/receipt/([A-Za-z0-9_-]{32,100})", path)
        if receipt_page and method == "GET":
            token = receipt_page.group(1)
            await send_html(send, 200, render_receipt(settings, market.receipt(token), token), noindex=True, receipt=True)
            return
        reign_page = re.fullmatch(r"/(?:reign|m)/(reign_[A-Za-z0-9]{12,40})", path)
        if reign_page and method == "GET":
            await send_html(send, 200, render_reign(settings, market.reign(reign_page.group(1))), cache_control="public, max-age=20")
            return
        og_page = re.fullmatch(r"/og/reign/(reign_[A-Za-z0-9]{12,40})\.png", path)
        if og_page and method == "GET":
            reign = market.reign(og_page.group(1))
            body = result_png({
                "type": "takeover",
                "message": reign["message"],
                "amount": reign["initialAmount"],
                "reignPublicId": reign["reignId"],
            })
            await send_response(send, 200, body, "image/png", cache_control="public, max-age=31536000, immutable")
            return
        poster_page = re.fullmatch(r"/reign/(reign_[A-Za-z0-9]{12,40})/poster", path)
        if poster_page and method == "GET":
            reign = market.reign(poster_page.group(1))
            public_url = f"{settings.site_url}/reign/{reign['reignId']}"
            await send_html(send, 200, render_poster(settings, reign, qr_svg(public_url)), noindex=True)
            return
        badge_page = re.fullmatch(r"/badge/reign/(reign_[A-Za-z0-9]{12,40})\.svg", path)
        if badge_page and method == "GET":
            reign = market.reign(badge_page.group(1))
            price = market.state()["takeoverPrice"] if reign["status"] == "active" else ""
            cache = "public, max-age=30" if reign["status"] == "active" else "public, max-age=31536000, immutable"
            body = render_badge_svg(reign, price)
            etag = hashlib.sha256(body).hexdigest()
            await send_response(send, 200, body, "image/svg+xml", cache_control=cache, extra_headers=[(b"etag", f'"{etag}"'.encode())])
            return
        result_page = re.fullmatch(r"/result/(result_[A-Za-z0-9]{12,40})(-vertical)?\.png", path)
        if result_page and method == "GET":
            connection = database.connect()
            try:
                row = snapshot_by_public_id(connection, result_page.group(1))
            finally:
                connection.close()
            if row is None:
                raise HTTPError(404, "Result not found.", "result_not_found")
            body = result_png(json.loads(row["snapshot_json"]), vertical=bool(result_page.group(2)))
            await send_response(send, 200, body, "image/png", cache_control="public, max-age=31536000, immutable")
            return
        message_go = re.fullmatch(r"/message/([a-z0-9][a-z0-9-]{1,90})/go", path)
        if message_go and method == "GET":
            connection = database.connect()
            try:
                row = connection.execute(
                    """SELECT m.url, r.public_id FROM messages m JOIN reigns r ON r.message_id = m.id
                       WHERE m.slug = ? AND m.status = 'published' ORDER BY r.started_at DESC LIMIT 1""",
                    (message_go.group(1),),
                ).fetchone()
            finally:
                connection.close()
            if row is None or not row["url"]:
                raise HTTPError(404, "Message link not found.", "link_not_found")
            try:
                target_url = validate_public_url(row["url"])
            except MarketError as error:
                raise HTTPError(404, "Message link not found.", "link_not_found") from error
            market.record_metric(
                {"type": "click", "reignId": row["public_id"]},
                client_ip(scope, headers),
                headers.get("user-agent", ""),
                headers.get("x-country-code", ""),
                headers.get("referer", ""),
            )
            await send_redirect(send, target_url, 302)
            return
        message_page = re.fullmatch(r"/message/([a-z0-9][a-z0-9-]{1,90})", path)
        if message_page and method == "GET":
            connection = database.connect()
            try:
                row = connection.execute(
                    """SELECT r.public_id FROM messages m JOIN reigns r ON r.message_id = m.id
                       WHERE m.slug = ? AND m.status != 'hidden' ORDER BY r.started_at DESC LIMIT 1""",
                    (message_page.group(1),),
                ).fetchone()
            finally:
                connection.close()
            if row is None:
                raise HTTPError(404, "Message not found.", "message_not_found")
            await send_redirect(send, f"/m/{row['public_id']}", 302)
            return
        if path == "/archive" and method == "GET":
            await send_html(send, 200, render_archive(settings, market.archive()), cache_control="public, max-age=30")
            return
        if path == "/stats" and method == "GET":
            await send_html(send, 200, render_stats(settings, market.stats(query.get("period", "24h"))), cache_control="public, max-age=30")
            return
        if path == "/rules" and method == "GET":
            await send_html(send, 200, render_rules(settings), cache_control="public, max-age=3600")
            return
        if path == "/admin" and method == "GET":
            if valid_admin_session(headers):
                await send_html(send, 200, render_admin(settings, market.admin_summary()), noindex=True, receipt=True)
            else:
                await send_html(send, 200, render_admin_login(settings), noindex=True, receipt=True)
            return
        if path == "/admin/login" and method == "POST":
            require_same_origin(headers)
            form = await read_form(receive)
            if not settings.admin_password or not hmac.compare_digest(form.get("password", ""), settings.admin_password):
                await send_html(send, 403, render_admin_login(settings, "Incorrect password."), noindex=True, receipt=True)
                return
            await send_response(
                send,
                303,
                b"",
                "text/plain",
                extra_headers=[(b"location", b"/admin"), (b"set-cookie", admin_cookie(create_admin_session()).encode("latin-1"))],
                noindex=True,
                receipt=True,
            )
            return
        if path in {"/admin/hide", "/admin/unlock"} and method == "POST":
            require_same_origin(headers)
            if not valid_admin_session(headers):
                raise HTTPError(403, "Admin session required.", "admin_required")
            form = await read_form(receive)
            note = form.get("note", "").strip()
            if not note:
                raise HTTPError(422, "An audit note is required.", "note_required")
            if path.endswith("hide"):
                market.hide_current(note)
            else:
                market.force_unlock(note)
            await send_redirect(send, "/admin", noindex=True)
            return

        raise HTTPError(404, "Not found.", "not_found")
    except PaymentPending as error:
        await send_json(send, error.status, {"ok": False, "code": error.code, "error": error.message}, noindex=path.startswith("/receipt") or "/receipt/" in path, receipt="/receipt/" in path)
    except MarketError as error:
        if path.startswith("/api/"):
            await send_json(send, error.status, {"ok": False, "code": error.code, "error": error.message}, noindex="/receipt/" in path, receipt="/receipt/" in path)
        else:
            if path.startswith("/admin"):
                body = render_admin_login(settings, error.message)
            else:
                body = '<main class="narrow-page"><h1>' + escape(error.message) + '</h1><p><a href="/">Return to coin.im</a></p></main>'
            await send_html(send, error.status, body, noindex=True, receipt=path.startswith("/receipt"))
    except Exception:
        logger.exception("unhandled_market_error path=%s", path)
        if path.startswith("/api/"):
            await send_json(send, 500, {"ok": False, "code": "internal_error", "error": "The market service could not complete this request."})
        else:
            await send_html(send, 500, '<main class="narrow-page"><h1>The market service could not complete this request.</h1><p><a href="/">Return to coin.im</a></p></main>', noindex=True)
