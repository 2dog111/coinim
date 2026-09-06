from __future__ import annotations

import asyncio
import base64
import json
from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from .core import MarketError


MAX_CAPTURE_RESPONSE_BYTES = 1_300_000


@dataclass(frozen=True)
class CapturedWebsite:
    title: str
    final_url: str
    image: bytes
    mime: str
    favicon: bytes
    favicon_mime: str


def _request_capture(service_url: str, url: str) -> CapturedWebsite:
    body = json.dumps({"url": url}).encode("utf-8")
    request = Request(
        service_url + "/capture",
        data=body,
        headers={"Content-Type": "application/json", "User-Agent": "coin-im-market/website-capture"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=35) as response:
            raw = response.read(MAX_CAPTURE_RESPONSE_BYTES + 1)
    except HTTPError as error:
        raw = error.read(MAX_CAPTURE_RESPONSE_BYTES + 1)
        try:
            payload = json.loads(raw)
        except (json.JSONDecodeError, UnicodeDecodeError):
            payload = {}
        raise MarketError(
            error.code if 400 <= error.code < 600 else 503,
            str(payload.get("error") or "The website could not be photographed. Try again."),
            str(payload.get("code") or "screenshot_capture_failed"),
        ) from error
    except (URLError, TimeoutError) as error:
        raise MarketError(503, "The automatic screenshot is temporarily unavailable. Try again.", "screenshot_unavailable") from error
    if len(raw) > MAX_CAPTURE_RESPONSE_BYTES:
        raise MarketError(503, "The automatic screenshot returned too much data. Try again.", "screenshot_unavailable")
    try:
        payload = json.loads(raw)
        image = base64.b64decode(payload["imageBase64"], validate=True)
    except (KeyError, ValueError, json.JSONDecodeError, UnicodeDecodeError) as error:
        raise MarketError(503, "The automatic screenshot returned invalid data. Try again.", "screenshot_unavailable") from error
    if not image or len(image) > 700 * 1024 or payload.get("mime") != "image/webp":
        raise MarketError(503, "The automatic screenshot returned invalid data. Try again.", "screenshot_unavailable")
    try:
        favicon = base64.b64decode(payload.get("faviconBase64") or "", validate=True)
    except (ValueError, TypeError) as error:
        raise MarketError(503, "The automatic favicon returned invalid data. Try again.", "screenshot_unavailable") from error
    favicon_mime = str(payload.get("faviconMime") or "")
    if favicon and (len(favicon) > 64 * 1024 or favicon_mime != "image/webp"):
        raise MarketError(503, "The automatic favicon returned invalid data. Try again.", "screenshot_unavailable")
    return CapturedWebsite(
        title=str(payload.get("title") or "")[:80],
        final_url=str(payload.get("finalUrl") or url),
        image=image,
        mime="image/webp",
        favicon=favicon,
        favicon_mime=favicon_mime if favicon else "",
    )


async def capture_from_service(service_url: str, url: str) -> CapturedWebsite:
    return await asyncio.to_thread(_request_capture, service_url, url)


def service_health(service_url: str) -> bool:
    try:
        with urlopen(Request(service_url + "/health", headers={"User-Agent": "coin-im-market/health"}), timeout=3) as response:
            payload = json.loads(response.read(4096))
        return response.status == 200 and payload.get("ok") is True
    except (OSError, ValueError, json.JSONDecodeError):
        return False
