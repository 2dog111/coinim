from __future__ import annotations

import json
import unittest
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, unquote, urlparse

from coin_market.core import MICRO, MarketError, format_usdt, grapheme_count, live_strength, parse_usdt, payment_power, takeover_price, validate_message_fields, validate_public_url
from coin_market.qr import payment_request_url, tronlink_open_dapp_uri

UTC = timezone.utc


class StrengthTests(unittest.TestCase):
    def setUp(self) -> None:
        self.now = datetime(2026, 8, 28, 12, 0, tzinfo=UTC)
        self.lifetime = 86400

    def test_fresh_payment_has_full_power(self) -> None:
        self.assertEqual(payment_power(50 * MICRO, self.now, self.now, self.lifetime), 50 * MICRO)

    def test_payment_decays_linearly(self) -> None:
        self.assertEqual(payment_power(10 * MICRO, self.now - timedelta(hours=12), self.now, self.lifetime), 5 * MICRO)

    def test_boundary_is_zero_and_never_negative(self) -> None:
        self.assertEqual(payment_power(10 * MICRO, self.now - timedelta(hours=24), self.now, self.lifetime), 0)
        self.assertEqual(payment_power(10 * MICRO, self.now - timedelta(days=8), self.now, self.lifetime), 0)

    def test_multiple_payments_decay_independently(self) -> None:
        payments = [(10 * MICRO, self.now), (20 * MICRO, self.now - timedelta(hours=12))]
        self.assertEqual(live_strength(payments, self.now, self.lifetime), 20 * MICRO)

    def test_future_timestamp_has_no_power(self) -> None:
        self.assertEqual(payment_power(3 * MICRO, self.now + timedelta(seconds=20), self.now, self.lifetime), 0)


class PriceTests(unittest.TestCase):
    def test_minimum_is_one_coin(self) -> None:
        self.assertEqual(takeover_price(0, MICRO, MICRO), MICRO)

    def test_price_is_floor_backing_plus_one_whole_coin(self) -> None:
        self.assertEqual(takeover_price(5 * MICRO, MICRO, MICRO), 6 * MICRO)
        self.assertEqual(takeover_price(5 * MICRO + 999_999, MICRO, MICRO), 6 * MICRO)
        self.assertEqual(takeover_price(9_999_999_999, MICRO, MICRO), 10_000 * MICRO)

    def test_audience_floor_does_not_change_price(self) -> None:
        self.assertEqual(takeover_price(0, MICRO, MICRO, 27 * MICRO), MICRO)


class ValidationTests(unittest.TestCase):
    def test_decimal_amount_is_exact(self) -> None:
        self.assertEqual(parse_usdt("37.123456"), 37_123_456)
        self.assertEqual(format_usdt(37_123_456), "37.123456")

    def test_more_than_six_decimals_is_rejected(self) -> None:
        with self.assertRaises(MarketError):
            parse_usdt("1.0000001")

    def test_message_limit_is_888_nonspace_graphemes(self) -> None:
        validate_message_fields({"message": "a " * 888})
        with self.assertRaises(MarketError):
            validate_message_fields({"message": "a " * 889})

    def test_grapheme_count_handles_unicode(self) -> None:
        self.assertEqual(grapheme_count("e\u0301"), 1)
        self.assertEqual(grapheme_count("👨‍👩‍👧‍👦"), 1)

    def test_text_and_public_url_are_preserved(self) -> None:
        result = validate_message_fields({"message": "<script>alert(1)</script>", "url": "https://example.com/a"})
        self.assertEqual(result["message"], "<script>alert(1)</script>")
        self.assertEqual(result["url"], "https://example.com/a")

    def test_private_and_non_http_urls_are_rejected(self) -> None:
        for value in ("javascript:alert(1)", "http://127.0.0.1", "http://localhost/a", "file:///etc/passwd"):
            with self.subTest(value=value), self.assertRaises(MarketError):
                validate_public_url(value)


class PaymentLinkTests(unittest.TestCase):
    def test_payment_qr_url_contains_exact_tron_details(self) -> None:
        request_url = payment_request_url(
            "https://coin.im",
            "private_token",
            "TS3nnmo7uppx99o27GdquSwe5QPWK8NYqR",
            "7",
            "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
        )
        parsed = urlparse(request_url)
        details = parse_qs(parsed.fragment)
        self.assertEqual(parsed.path, "/receipt/private_token")
        self.assertEqual(details["asset"], ["USDT"])
        self.assertEqual(details["network"], ["TRON"])
        self.assertEqual(details["amount"], ["7"])
        self.assertEqual(details["to"], ["TS3nnmo7uppx99o27GdquSwe5QPWK8NYqR"])
        self.assertEqual(details["contract"], ["TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"])

    def test_tronlink_open_link_uses_official_deeplink_envelope(self) -> None:
        request_url = "https://coin.im/receipt/private_token#amount=7"
        deep_link = tronlink_open_dapp_uri(request_url)
        payload = json.loads(unquote(parse_qs(urlparse(deep_link).query)["param"][0]))
        self.assertEqual(payload, {
            "url": request_url,
            "action": "open",
            "protocol": "TronLink",
            "version": "1.0",
        })


if __name__ == "__main__":
    unittest.main()
