from __future__ import annotations

import asyncio
import io
import ipaddress
import os
import socket
from collections import deque
from dataclasses import dataclass
from time import monotonic
from urllib.parse import urljoin, urlsplit

from PIL import Image, ImageOps, UnidentifiedImageError
from playwright.async_api import Error as PlaywrightError
from playwright.async_api import TimeoutError as PlaywrightTimeoutError
from playwright.async_api import async_playwright

from .core import MarketError, validate_public_url


CAPTURE_WIDTH = 1600
CAPTURE_HEIGHT = 1050
MAX_CAPTURE_BYTES = 700 * 1024
MAX_FAVICON_BYTES = 64 * 1024
MAX_RESOURCE_BYTES = 16 * 1024 * 1024
MAX_CAPTURE_ATTEMPTS_PER_MINUTE = 12


@dataclass(frozen=True)
class WebsiteCapture:
    title: str
    final_url: str
    image: bytes
    mime: str = "image/webp"
    favicon: bytes = b""
    favicon_mime: str = ""


async def _public_addresses(url: str) -> tuple[str, ...]:
    validated = validate_public_url(url)
    parsed = urlsplit(validated)
    hostname = parsed.hostname or ""
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    try:
        records = await asyncio.wait_for(
            asyncio.to_thread(socket.getaddrinfo, hostname, port, 0, socket.SOCK_STREAM),
            timeout=4,
        )
    except (OSError, asyncio.TimeoutError) as error:
        raise MarketError(422, "This website could not be reached. Check the link and try again.", "website_unreachable") from error
    addresses = tuple(sorted({record[4][0].split("%", 1)[0] for record in records}))
    if not addresses:
        raise MarketError(422, "This website could not be reached. Check the link and try again.", "website_unreachable")
    for value in addresses:
        try:
            address = ipaddress.ip_address(value)
        except ValueError as error:
            raise MarketError(422, "The link must use a public address.", "private_url") from error
        if not address.is_global:
            raise MarketError(422, "The link must use a public address.", "private_url")
    return addresses


async def ensure_public_network_url(url: str) -> str:
    validated = validate_public_url(url)
    await _public_addresses(validated)
    return validated


def _optimized_webp(source: bytes) -> bytes:
    try:
        with Image.open(io.BytesIO(source)) as opened:
            if opened.width * opened.height > 30_000_000:
                raise MarketError(422, "The website image is too large to publish.", "screenshot_too_large")
            prepared = ImageOps.exif_transpose(opened).convert("RGB")
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as error:
        raise MarketError(422, "The website could not be photographed. Try again.", "screenshot_capture_failed") from error
    for width, quality in ((1600, 82), (1600, 74), (1440, 76), (1280, 72), (1120, 68)):
        image = prepared.copy()
        if image.width > width:
            height = max(1, round(image.height * width / image.width))
            image = image.resize((width, height), Image.Resampling.LANCZOS)
        output = io.BytesIO()
        image.save(output, format="WEBP", quality=quality, method=6)
        value = output.getvalue()
        if len(value) <= MAX_CAPTURE_BYTES:
            return value
    raise MarketError(422, "The website image is too detailed to publish. Try again.", "screenshot_too_large")


def _optimized_favicon(source: bytes) -> bytes:
    try:
        with Image.open(io.BytesIO(source)) as opened:
            if opened.width * opened.height > 4_000_000:
                return b""
            image = ImageOps.exif_transpose(opened).convert("RGBA")
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        return b""
    image.thumbnail((96, 96), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (96, 96), (255, 255, 255, 0))
    canvas.alpha_composite(image, ((96 - image.width) // 2, (96 - image.height) // 2))
    for size in (96, 64, 48):
        prepared = canvas if size == 96 else canvas.resize((size, size), Image.Resampling.LANCZOS)
        output = io.BytesIO()
        prepared.save(output, format="WEBP", lossless=True, method=6)
        value = output.getvalue()
        if len(value) <= MAX_FAVICON_BYTES:
            return value
    return b""


def _clean_title(value: str, fallback: str) -> str:
    title = " ".join(value.split()).strip()
    return (title or fallback)[:80]


async def capture_website(url: str) -> WebsiteCapture:
    target = await ensure_public_network_url(url)
    executable = os.environ.get("SCREENSHOT_BROWSER_EXECUTABLE", "").strip() or None
    blocked_main_request = False

    try:
        async with async_playwright() as playwright:
            launch_options = {"headless": True, "args": ["--disable-dev-shm-usage"]}
            if executable:
                launch_options["executable_path"] = executable
            browser = await playwright.chromium.launch(**launch_options)
            try:
                context = await browser.new_context(
                    viewport={"width": CAPTURE_WIDTH, "height": CAPTURE_HEIGHT},
                    device_scale_factor=1,
                    color_scheme="light",
                    reduced_motion="reduce",
                    locale="en-US",
                    service_workers="block",
                    ignore_https_errors=False,
                )
                page = await context.new_page()

                async def dismiss_dialog(dialog) -> None:
                    await dialog.dismiss()

                page.on("dialog", dismiss_dialog)

                async def route_request(route) -> None:
                    nonlocal blocked_main_request
                    request = route.request
                    parsed = urlsplit(request.url)
                    if parsed.scheme in {"data", "blob", "about"}:
                        await route.continue_()
                        return
                    if parsed.scheme not in {"http", "https"} or request.resource_type == "media":
                        await route.abort("blockedbyclient")
                        return
                    try:
                        await ensure_public_network_url(request.url)
                    except MarketError:
                        if request.is_navigation_request() and request.frame == page.main_frame:
                            blocked_main_request = True
                        await route.abort("accessdenied")
                        return
                    try:
                        response = await route.fetch(max_redirects=0, timeout=12_000)
                    except PlaywrightError:
                        await route.abort("failed")
                        return
                    raw_length = response.headers.get("content-length", "0")
                    try:
                        content_length = int(raw_length)
                    except ValueError:
                        content_length = 0
                    if content_length > MAX_RESOURCE_BYTES:
                        await route.abort("blockedbyclient")
                        return
                    location = response.headers.get("location", "")
                    if location:
                        try:
                            await ensure_public_network_url(urljoin(request.url, location))
                        except MarketError:
                            if request.is_navigation_request() and request.frame == page.main_frame:
                                blocked_main_request = True
                            await route.abort("accessdenied")
                            return
                    await route.fulfill(response=response)

                await context.route("**/*", route_request)
                response = await page.goto(target, wait_until="domcontentloaded", timeout=18_000)
                if blocked_main_request:
                    raise MarketError(422, "The link must stay on a public website.", "private_url")
                if response is None or response.status >= 400:
                    raise MarketError(422, "This website could not be opened. Check the link and try again.", "website_unreachable")
                final_url = await ensure_public_network_url(page.url)
                try:
                    await asyncio.wait_for(page.evaluate("() => document.fonts ? document.fonts.ready : Promise.resolve()"), 3)
                except (asyncio.TimeoutError, PlaywrightError):
                    pass
                await page.wait_for_timeout(900)
                raw = await page.screenshot(
                    type="png",
                    full_page=False,
                    animations="disabled",
                    caret="hide",
                    scale="css",
                    style="html { scrollbar-width: none !important; } ::-webkit-scrollbar { display: none !important; }",
                    timeout=10_000,
                )
                fallback = (urlsplit(final_url).hostname or "Website").removeprefix("www.")
                title = _clean_title(await page.title(), fallback)
                favicon = b""
                try:
                    icon_urls = await page.eval_on_selector_all(
                        "link[rel]",
                        """nodes => nodes
                          .filter(node => /(^|\\s)(icon|apple-touch-icon)(\\s|$)/i.test(node.rel || ''))
                          .map(node => node.href)
                          .filter(Boolean)""",
                    )
                except PlaywrightError:
                    icon_urls = []
                icon_urls.append(urljoin(final_url, "/favicon.ico"))
                seen_icons: set[str] = set()
                for icon_url in icon_urls[:8]:
                    if icon_url in seen_icons:
                        continue
                    seen_icons.add(icon_url)
                    try:
                        await ensure_public_network_url(icon_url)
                        icon_page = await context.new_page()
                        icon_response = await icon_page.goto(icon_url, wait_until="commit", timeout=6_000)
                        if icon_response is not None and icon_response.status < 400:
                            favicon = _optimized_favicon(await icon_response.body())
                        await icon_page.close()
                    except (MarketError, PlaywrightError, PlaywrightTimeoutError):
                        favicon = b""
                    if favicon:
                        break
                await context.close()
                return WebsiteCapture(
                    title=title,
                    final_url=final_url,
                    image=_optimized_webp(raw),
                    favicon=favicon,
                    favicon_mime="image/webp" if favicon else "",
                )
            finally:
                await browser.close()
    except MarketError:
        raise
    except PlaywrightTimeoutError as error:
        raise MarketError(422, "This website took too long to open. Check the link and try again.", "website_timeout") from error
    except PlaywrightError as error:
        raise MarketError(503, "The automatic screenshot is temporarily unavailable. Try again.", "screenshot_unavailable") from error


class CaptureCoordinator:
    def __init__(self) -> None:
        self._semaphore = asyncio.Semaphore(1)
        self._cache: dict[str, tuple[float, WebsiteCapture]] = {}
        self._attempts: deque[float] = deque()

    async def capture(self, url: str) -> WebsiteCapture:
        now = monotonic()
        cached = self._cache.get(url)
        if cached and cached[0] > now:
            return cached[1]
        while self._attempts and self._attempts[0] <= now - 60:
            self._attempts.popleft()
        if len(self._attempts) >= MAX_CAPTURE_ATTEMPTS_PER_MINUTE:
            raise MarketError(429, "Website photography is busy. Try again in a minute.", "screenshot_busy")
        self._attempts.append(now)
        async with self._semaphore:
            cached = self._cache.get(url)
            if cached and cached[0] > monotonic():
                return cached[1]
            try:
                result = await asyncio.wait_for(capture_website(url), timeout=30)
            except asyncio.TimeoutError as error:
                raise MarketError(422, "This website took too long to photograph. Try again.", "website_timeout") from error
            self._cache = {key: value for key, value in self._cache.items() if value[0] > monotonic()}
            if len(self._cache) >= 8:
                oldest = min(self._cache, key=lambda key: self._cache[key][0])
                self._cache.pop(oldest, None)
            self._cache[url] = (monotonic() + 600, result)
            return result
