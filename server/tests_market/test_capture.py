from __future__ import annotations

import io
import unittest

from PIL import Image

from coin_market.capture import (
    MAX_CAPTURE_BYTES,
    MAX_FAVICON_BYTES,
    _optimized_favicon,
    _optimized_webp,
    ensure_public_network_url,
)
from coin_market.core import MarketError


class CaptureSafetyTests(unittest.IsolatedAsyncioTestCase):
    async def test_private_address_is_blocked_before_browser_launch(self) -> None:
        for url in ("http://127.0.0.1", "http://[::1]", "http://10.0.0.2"):
            with self.subTest(url=url), self.assertRaises(MarketError):
                await ensure_public_network_url(url)

    def test_screenshot_is_optimized_to_publishable_webp(self) -> None:
        source = io.BytesIO()
        Image.new("RGB", (1600, 1050), (241, 244, 249)).save(source, "PNG")
        result = _optimized_webp(source.getvalue())
        self.assertLessEqual(len(result), MAX_CAPTURE_BYTES)
        with Image.open(io.BytesIO(result)) as image:
            self.assertEqual(image.format, "WEBP")
            self.assertEqual(image.size, (1600, 1050))

    def test_favicon_is_normalized_to_small_transparent_webp(self) -> None:
        source = io.BytesIO()
        Image.new("RGBA", (180, 180), (244, 219, 70, 180)).save(source, "PNG")
        result = _optimized_favicon(source.getvalue())
        self.assertLessEqual(len(result), MAX_FAVICON_BYTES)
        with Image.open(io.BytesIO(result)) as image:
            self.assertEqual(image.format, "WEBP")
            self.assertEqual(image.size, (96, 96))
