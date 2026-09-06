from __future__ import annotations

import base64
import json

from .capture import CaptureCoordinator
from .core import MarketError


coordinator = CaptureCoordinator()
MAX_BODY_BYTES = 4096


async def _read_body(receive) -> bytes:
    chunks: list[bytes] = []
    total = 0
    while True:
        message = await receive()
        if message["type"] == "http.disconnect":
            raise MarketError(400, "The request was interrupted.", "interrupted")
        chunk = message.get("body", b"")
        total += len(chunk)
        if total > MAX_BODY_BYTES:
            raise MarketError(413, "The request is too large.", "too_large")
        chunks.append(chunk)
        if not message.get("more_body", False):
            return b"".join(chunks)


async def _send_json(send, status: int, payload: dict) -> None:
    body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    await send({
        "type": "http.response.start",
        "status": status,
        "headers": [
            (b"content-type", b"application/json; charset=utf-8"),
            (b"content-length", str(len(body)).encode("ascii")),
            (b"cache-control", b"no-store"),
            (b"x-content-type-options", b"nosniff"),
        ],
    })
    await send({"type": "http.response.body", "body": body})


async def app(scope, receive, send) -> None:
    if scope["type"] != "http":
        return
    client_host = (scope.get("client") or [""])[0]
    if client_host not in {"127.0.0.1", "::1"}:
        await _send_json(send, 403, {"ok": False, "error": "Local access only.", "code": "forbidden"})
        return
    path = scope.get("path", "/")
    method = scope.get("method", "GET").upper()
    if path == "/health" and method == "GET":
        await _send_json(send, 200, {"ok": True})
        return
    if path != "/capture" or method != "POST":
        await _send_json(send, 404, {"ok": False, "error": "Not found.", "code": "not_found"})
        return
    try:
        raw = await _read_body(receive)
        payload = json.loads(raw or b"{}")
        if not isinstance(payload, dict):
            raise MarketError(400, "The request must be an object.", "invalid_json")
        result = await coordinator.capture(str(payload.get("url") or ""))
        await _send_json(send, 200, {
            "ok": True,
            "title": result.title,
            "finalUrl": result.final_url,
            "mime": result.mime,
            "imageBase64": base64.b64encode(result.image).decode("ascii"),
            "faviconMime": result.favicon_mime,
            "faviconBase64": base64.b64encode(result.favicon).decode("ascii"),
        })
    except json.JSONDecodeError:
        await _send_json(send, 400, {"ok": False, "error": "The request is not valid JSON.", "code": "invalid_json"})
    except MarketError as error:
        await _send_json(send, error.status, {"ok": False, "error": error.message, "code": error.code})
    except Exception:
        await _send_json(send, 503, {
            "ok": False,
            "error": "The automatic screenshot is temporarily unavailable. Try again.",
            "code": "screenshot_unavailable",
        })
