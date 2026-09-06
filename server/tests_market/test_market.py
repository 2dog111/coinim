from __future__ import annotations

import base64
import io
import os
import sqlite3
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

from PIL import Image

from coin_market.cli import process_outbox, reconcile_payments
from coin_market.config import Settings
from coin_market.core import MICRO, MarketError
from coin_market.db import Database
from coin_market.market import MarketService
from coin_market.payments import ConfirmedTransfer, MockPaymentProvider
from coin_market.render import render_home, render_receipt, render_reign, render_takeover, result_png

UTC = timezone.utc


class MarketIntegrationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        root = self.temp.name
        environment = {
            "SITE_URL": "http://127.0.0.1:8782",
            "COIN_MARKET_DATA_ROOT": root,
            "DATABASE_URL": str(Path(root) / "market.sqlite3"),
            "TAKEOVER_MARKET_ENABLED": "true",
            "TRON_PROVIDER": "mock",
            "TRON_NETWORK": "mainnet",
            "USDT_TRC20_RECEIVE_ADDRESS": "TMockReceive1111111111111111111111",
            "USDT_TRC20_CONTRACT_ADDRESS": "TMockContract111111111111111111111",
            "SESSION_SECRET": "test-session-secret-0123456789abcdef",
            "ANALYTICS_SECRET": "test-analytics-secret-0123456789abcdef",
            "ADMIN_PASSWORD": "test-admin-password",
            "SMTP_HOST": "smtp.example.test",
            "SMTP_FROM": "coin@example.test",
            "TAKEOVER_QUOTE_SECONDS": "420",
        }
        with patch.dict(os.environ, environment, clear=False):
            self.settings = Settings.from_env()
        self.database = Database(self.settings)
        self.assertEqual(
            self.database.migrate(),
            ["001_initial", "002_fixed_backing_window", "003_payment_credits", "004_reign_notifications", "005_three_wall_slots", "006_wall_copy_polish", "007_wall_screenshots", "008_owner_prompt_favicons"],
        )
        self.provider = MockPaymentProvider(self.settings)
        self.service = MarketService(self.settings, self.database, self.provider)
        self.start = datetime(2026, 9, 1, 10, 0, tzinfo=UTC)

    def tearDown(self) -> None:
        self.temp.cleanup()

    def transfer(self, intent: dict, amount_micro: int, when: datetime, suffix: str) -> ConfirmedTransfer:
        transfer = ConfirmedTransfer(
            txid=(suffix * 64)[:64],
            event_index=0,
            amount_micro=amount_micro,
            contract_address=self.settings.contract_address,
            receiving_address=self.settings.receive_address,
            confirmed_at=when,
        )
        self.provider.add(transfer)
        return transfer

    def take(self, message: str, amount: int, when: datetime, suffix: str) -> tuple[dict, dict]:
        state = self.service.state(when)
        intent = self.service.create_takeover_intent({
            "message": message,
            "amount": str(amount),
            "currentReignId": state.get("currentReignPublicId", ""),
            "quotedPriceMicro": state["takeoverPriceMicro"],
        }, f"visitor-{suffix}", now=when)
        transfer = self.transfer(intent, amount * MICRO, when + timedelta(seconds=1), suffix)
        result = self.service.apply_confirmed_transfer(intent["intentId"], transfer, now=when + timedelta(seconds=1), receipt_token=intent["receiptToken"])
        return intent, result

    def test_takeover_is_atomic_immediate_and_has_no_premiere(self) -> None:
        _, receipt = self.take("The first live message.", 10, self.start, "a")
        state = self.service.state(self.start + timedelta(seconds=1))
        self.assertEqual(receipt["status"], "confirmed")
        self.assertEqual(state["state"], "open")
        self.assertEqual(state["message"]["message"], "The first live message.")
        self.assertEqual(state["message"]["initialAmount"], "10")
        with self.database.connect() as connection:
            self.assertEqual(connection.execute("SELECT COUNT(*) FROM reigns WHERE status='active'").fetchone()[0], 1)
            row = connection.execute("SELECT started_at, display_at, protection_until FROM reigns").fetchone()
            self.assertEqual(row["started_at"], row["display_at"])
            self.assertEqual(row["started_at"], row["protection_until"])

    def test_home_is_the_fixed_three_message_wall(self) -> None:
        wall = self.service.wall_state(self.start)
        home = render_home(self.settings, wall)
        self.assertEqual(len(wall["slots"]), 3)
        self.assertEqual(wall["total"], "36")
        self.assertIn("Каждое слово здесь <em>куплено.</em>", home)
        self.assertIn('class="publish-cta" href="/takeover"', home)
        self.assertIn('href="https://coin.im/"', home)
        self.assertIn('href="https://www.instagram.com/adrieves19/"', home)
        self.assertIn("Coin.im не доска объявлений.", home)
        self.assertIn("@adrieves19", home)
        self.assertIn("Просто сообщение", home)
        self.assertIn("Занять место: сайт · <span data-outbid-price>15</span> USDT", home)
        self.assertIn("Занять место: соцсеть · <span data-outbid-price>13</span> USDT", home)
        self.assertIn("Занять место: сообщение · <span data-outbid-price>11</span> USDT", home)
        self.assertNotIn("Quote on X", home)
        self.assertNotIn("message · anonymous", home)
        self.assertIn("Поставь свои слова здесь.", home)
        self.assertIn("Оплати из кошелька.", home)
        self.assertEqual(home.count('class="slot '), 3)
        self.assertNotIn("open" + " slot", home)
        self.assertNotIn("Claim" + " slot", home)
        self.assertNotIn("The internet finally", home)
        self.assertNotIn("data-open-dialog", home)
        self.assertNotIn("form data-takeover-form", home)

    def test_wall_outbid_replaces_only_the_target_slot(self) -> None:
        wall = self.service.wall_state(self.start)
        slot_two = wall["slots"][1]
        message = (
            "A small independent profile paid for this exact social slot and left enough real detail "
            "to satisfy the wall limit without filler or invented claims."
        )
        intent = self.service.create_takeover_intent(
            {
                "wallSlot": 2,
                "message": message,
                "signature": "new profile",
                "url": "https://x.com/newprofile",
                "amount": slot_two["outbidAmount"],
                "quotedPriceMicro": slot_two["outbidAmountMicro"],
            },
            "wall-visitor",
            now=self.start,
        )
        transfer = self.transfer(intent, 13 * MICRO, self.start + timedelta(seconds=1), "w")
        receipt = self.service.apply_confirmed_transfer(
            intent["intentId"],
            transfer,
            now=self.start + timedelta(seconds=1),
            receipt_token=intent["receiptToken"],
        )
        updated = self.service.wall_state(self.start + timedelta(seconds=2))
        self.assertEqual(updated["slots"][0]["amount"], "14")
        self.assertEqual(updated["slots"][1]["amount"], "13")
        self.assertEqual(updated["slots"][1]["message"], message)
        self.assertEqual(updated["slots"][2]["amount"], "10")
        self.assertEqual(updated["total"], "37")
        self.assertEqual(receipt["result"]["snapshot"]["wallSlotNumber"], 2)
        archived = self.service.archive()["reigns"]
        self.assertTrue(any(item["message"].startswith("Майами не город") for item in archived))
        self.assertFalse(any(item["message"] == message for item in archived))

    def test_wall_identical_payment_amounts_are_serialized(self) -> None:
        with self.database.transaction() as connection:
            connection.execute(
                """UPDATE reigns SET initial_amount_micro = ?
                   WHERE id = (
                       SELECT r.id FROM reigns r
                       JOIN messages m ON m.id = r.message_id
                       WHERE m.wall_slot_number = 2
                       ORDER BY r.started_at DESC, r.id DESC LIMIT 1
                   )""",
                (14 * MICRO,),
            )
        message = (
            "A sufficiently detailed placement explains the destination, the intended reader, and the useful reason "
            "to open it while remaining clear enough for a real visitor to understand before paying."
        )
        wall = self.service.wall_state(self.start)
        self.service.create_takeover_intent(
            {
                "wallSlot": 1,
                "message": message,
                "signature": "Website headline",
                "url": "https://example.com",
                "amount": wall["slots"][0]["outbidAmount"],
                "quotedPriceMicro": wall["slots"][0]["outbidAmountMicro"],
            },
            "website-visitor",
            now=self.start,
        )
        with self.assertRaises(MarketError) as collision:
            self.service.create_takeover_intent(
                {
                    "wallSlot": 2,
                    "message": message,
                    "url": "https://t.me/example",
                    "amount": wall["slots"][1]["outbidAmount"],
                    "quotedPriceMicro": wall["slots"][1]["outbidAmountMicro"],
                },
                "social-visitor",
                now=self.start,
            )
        self.assertEqual(collision.exception.code, "amount_temporarily_reserved")

    def test_wall_slot_forms_and_entity_validation_are_explicit(self) -> None:
        wall = self.service.wall_state(self.start)
        site_form = render_takeover(self.settings, self.service.state(self.start), wall_slot=wall["slots"][0], wall_state=wall)
        social_form = render_takeover(self.settings, self.service.state(self.start), wall_slot=wall["slots"][1], wall_state=wall)
        message_form = render_takeover(self.settings, self.service.state(self.start), wall_slot=wall["slots"][2], wall_state=wall)
        self.assertIn("Website text", site_form)
        self.assertIn("Website link", site_form)
        self.assertIn("The title, favicon and a fresh first-screen screenshot are added automatically.", site_form)
        self.assertNotIn('type="file"', site_form)
        self.assertNotIn('name="signature"', site_form)
        self.assertIn("Profile link", social_form)
        self.assertIn("Social network", social_form)
        self.assertEqual(social_form.count('class="social-option"'), 15)
        self.assertIn("Your message", message_form)
        self.assertNotIn('name="url"', message_form)
        self.assertNotIn('name="signature"', message_form)
        self.assertIn("No name. No link.", message_form)
        self.assertIn("Continue to payment", site_form)
        self.assertIn('href="/takeover?slot=1"', message_form)
        self.assertIn('href="/takeover?slot=2"', message_form)
        self.assertIn('href="/takeover?slot=3"', message_form)
        self.assertIn("Put your words here.", message_form)

        common = {
            "message": "A sufficiently detailed placement message contains more than one hundred and eleven non-space characters, explains the destination clearly, and gives a real visitor enough context to decide whether the published website or profile is worth opening.",
            "amount": "15",
            "quotedPriceMicro": 15 * MICRO,
            "wallSlot": 1,
        }
        with self.assertRaisesRegex(MarketError, "requires a headline"):
            self.service.create_takeover_intent({**common, "url": "https://example.com"}, "missing-headline", now=self.start)
        with self.assertRaisesRegex(MarketError, "slot № 2"):
            self.service.create_takeover_intent({**common, "signature": "Headline", "url": "https://x.com/example"}, "wrong-site", now=self.start)
        with self.assertRaisesRegex(MarketError, "at least 100"):
            self.service.create_takeover_intent(
                {**common, "message": "x" * 99, "signature": "Headline", "url": "https://example.com"},
                "too-short",
                now=self.start,
            )

        social = {
            "message": common["message"],
            "amount": "13",
            "quotedPriceMicro": 13 * MICRO,
            "wallSlot": 2,
            "url": "https://example.com/profile",
        }
        with self.assertRaisesRegex(MarketError, "social profile URL"):
            self.service.create_takeover_intent(social, "wrong-social", now=self.start)
        with self.assertRaisesRegex(MarketError, "does not match"):
            self.service.create_takeover_intent(
                {**social, "url": "https://t.me/example", "location": "x"},
                "mismatched-social",
                now=self.start,
            )

        message_slot = wall["slots"][2]
        message_intent = self.service.create_takeover_intent(
            {
                "wallSlot": 3,
                "message": common["message"],
                "signature": "This must not be published",
                "location": "x",
                "ctaLabel": "This must not become a link",
                "amount": message_slot["outbidAmount"],
                "quotedPriceMicro": message_slot["outbidAmountMicro"],
            },
            "plain-message",
            now=self.start,
        )
        with self.database.connect() as connection:
            stored = connection.execute(
                "SELECT draft_signature, draft_location, draft_url, draft_cta_label FROM payment_intents WHERE id = ?",
                (message_intent["intentId"],),
            ).fetchone()
        self.assertEqual(dict(stored), {"draft_signature": "", "draft_location": "", "draft_url": "", "draft_cta_label": ""})

    def test_website_screenshot_is_published_only_after_confirmation(self) -> None:
        source = io.BytesIO()
        Image.new("RGB", (640, 400), (244, 219, 70)).save(source, "PNG")
        screenshot_data = "data:image/png;base64," + base64.b64encode(source.getvalue()).decode("ascii")
        favicon_source = io.BytesIO()
        Image.new("RGBA", (64, 64), (244, 219, 70, 180)).save(favicon_source, "PNG")
        favicon_data = "data:image/png;base64," + base64.b64encode(favicon_source.getvalue()).decode("ascii")
        wall = self.service.wall_state(self.start)
        slot = wall["slots"][0]
        message = (
            "A clear website placement explains what the visitor will find, who it is for, and why the destination "
            "is worth opening before the payment publishes it on the homepage."
        )
        intent = self.service.create_takeover_intent(
            {
                "wallSlot": 1,
                "message": message,
                "signature": "A useful website",
                "url": "https://example.com",
                "amount": slot["outbidAmount"],
                "quotedPriceMicro": slot["outbidAmountMicro"],
                "screenshotData": screenshot_data,
                "faviconData": favicon_data,
            },
            "website-screenshot",
            now=self.start,
        )
        before = self.service.wall_state(self.start)
        self.assertEqual(before["slots"][0]["screenshotUrl"], "")
        with self.database.connect() as connection:
            pending = connection.execute(
                "SELECT screenshot_blob, screenshot_mime, favicon_blob, favicon_mime FROM payment_intents WHERE id = ?",
                (intent["intentId"],),
            ).fetchone()
            self.assertGreater(len(pending["screenshot_blob"]), 0)
            self.assertEqual(pending["screenshot_mime"], "image/webp")
            self.assertGreater(len(pending["favicon_blob"]), 0)
            self.assertEqual(pending["favicon_mime"], "image/webp")
        transfer = self.transfer(intent, 15 * MICRO, self.start + timedelta(seconds=1), "s")
        self.service.apply_confirmed_transfer(intent["intentId"], transfer, now=self.start + timedelta(seconds=1))
        after = self.service.wall_state(self.start + timedelta(seconds=2))
        self.assertRegex(after["slots"][0]["screenshotUrl"], r"^/media/market/[a-z0-9-]+$")
        self.assertRegex(after["slots"][0]["faviconUrl"], r"^/media/market/[a-z0-9-]+/favicon$")
        with self.database.connect() as connection:
            published = connection.execute(
                "SELECT screenshot_blob, screenshot_mime, favicon_blob, favicon_mime FROM messages WHERE slug = ?",
                (after["slots"][0]["slug"],),
            ).fetchone()
            self.assertGreater(len(published["screenshot_blob"]), 0)
            self.assertEqual(published["screenshot_mime"], "image/webp")
            self.assertGreater(len(published["favicon_blob"]), 0)
            self.assertEqual(published["favicon_mime"], "image/webp")

    def test_receipt_prioritizes_wallet_and_hides_manual_txid(self) -> None:
        state = self.service.state(self.start)
        intent = self.service.create_takeover_intent({
            "message": "Checkout copy.",
            "amount": "7",
            "currentReignId": "",
            "quotedPriceMicro": state["takeoverPriceMicro"],
        }, "receipt-ui", now=self.start)
        receipt = self.service.receipt(intent["receiptToken"], self.start)
        page = render_receipt(self.settings, receipt, intent["receiptToken"])
        self.assertIn("Pay in TronLink", page)
        self.assertIn("7 USDT · TRON (TRC-20)", page)
        self.assertIn('aria-label="Payment status"', page)
        self.assertIn('aria-current="step"><span></span>Waiting', page)
        self.assertIn("Can't see your payment?", page)
        self.assertIn('<details class="payment-recovery">', page)
        self.assertNotIn('<details class="payment-recovery" open>', page)
        self.assertIn('data-contract-address="TMockContract', page)

    def test_defend_raises_price_then_decays(self) -> None:
        self.take("Defend me.", 10, self.start, "b")
        when = self.start + timedelta(seconds=1, hours=12)
        state = self.service.state(when)
        self.assertEqual(state["activeBackingMicro"], 5 * MICRO)
        self.assertEqual(state["takeoverPriceMicro"], 6 * MICRO)
        defend = self.service.create_defend_intent({"amount": "5", "currentReignId": state["currentReignPublicId"]}, "defender", now=when)
        self.service.apply_confirmed_transfer(defend["intentId"], self.transfer(defend, 5 * MICRO, when, "c"), now=when)
        raised = self.service.state(when)
        self.assertEqual(raised["activeBackingMicro"], 10 * MICRO)
        self.assertEqual(raised["takeoverPriceMicro"], 11 * MICRO)
        later = self.service.state(when + timedelta(hours=12))
        self.assertEqual(later["activeBackingMicro"], 2_500_000)
        self.assertEqual(later["takeoverPriceMicro"], 3 * MICRO)

    def test_parallel_takeover_lock_and_defend_are_blocked(self) -> None:
        self.take("Current.", 2, self.start, "d")
        when = self.start + timedelta(seconds=2)
        state = self.service.state(when)
        self.service.create_takeover_intent({"message": "First quote", "amount": state["takeoverPrice"], "currentReignId": state["currentReignPublicId"]}, "one", now=when)
        with self.assertRaises(MarketError) as second:
            self.service.create_takeover_intent({"message": "Second quote", "amount": state["takeoverPrice"], "currentReignId": state["currentReignPublicId"]}, "two", now=when)
        self.assertEqual(second.exception.code, "takeover_locked")
        with self.assertRaises(MarketError) as defend:
            self.service.create_defend_intent({"amount": "1", "currentReignId": state["currentReignPublicId"]}, "three", now=when)
        self.assertEqual(defend.exception.code, "takeover_locked")

    def test_expired_quote_can_still_win_at_current_price(self) -> None:
        self.take("Current.", 2, self.start, "e")
        when = self.start + timedelta(seconds=2)
        state = self.service.state(when)
        intent = self.service.create_takeover_intent({"message": "Paid in time.", "amount": state["takeoverPrice"], "currentReignId": state["currentReignPublicId"]}, "late", now=when)
        transfer = self.transfer(intent, int(state["takeoverPriceMicro"]), when + timedelta(seconds=3), "f")
        self.service.apply_confirmed_transfer(intent["intentId"], transfer, now=when + timedelta(seconds=421))
        self.assertEqual(self.service.state(when + timedelta(seconds=421))["message"]["message"], "Paid in time.")

    def test_stale_insufficient_payment_becomes_receipt_credit(self) -> None:
        self.take("Current.", 1, self.start, "g")
        when = self.start + timedelta(seconds=2)
        state = self.service.state(when)
        old = self.service.create_takeover_intent({"message": "Old quote", "amount": state["takeoverPrice"], "currentReignId": state["currentReignPublicId"]}, "old", now=when)
        later = when + timedelta(seconds=421)
        self.database.cleanup_expired_locks(now=later)
        self.take("Stronger winner", 20, later, "h")
        transfer = self.transfer(old, int(state["takeoverPriceMicro"]), later + timedelta(seconds=2), "i")
        with self.assertRaises(MarketError) as credited:
            self.service.apply_confirmed_transfer(old["intentId"], transfer, now=later + timedelta(seconds=2))
        self.assertEqual(credited.exception.code, "payment_credited")
        receipt = self.service.receipt(old["receiptToken"], later + timedelta(seconds=2))
        self.assertEqual(receipt["status"], "credited")
        self.assertEqual(receipt["credit"]["status"], "available")

    def test_duplicate_event_cannot_be_applied_twice(self) -> None:
        intent, _ = self.take("One", 1, self.start, "j")
        original = self.provider.transfers[("j" * 64)]
        state = self.service.state(self.start + timedelta(seconds=2))
        defend = self.service.create_defend_intent({"amount": "1", "currentReignId": state["currentReignPublicId"]}, "duplicate", now=self.start + timedelta(seconds=2))
        with self.assertRaises(MarketError) as error:
            self.service.apply_confirmed_transfer(defend["intentId"], original, now=self.start + timedelta(seconds=3))
        self.assertEqual(error.exception.code, "duplicate_payment")

    def test_atomic_switch_rolls_back_on_snapshot_failure(self) -> None:
        self.take("One", 1, self.start, "k")
        when = self.start + timedelta(seconds=2)
        state = self.service.state(when)
        intent = self.service.create_takeover_intent({"message": "Two", "amount": state["takeoverPrice"], "currentReignId": state["currentReignPublicId"]}, "rollback", now=when)
        transfer = self.transfer(intent, int(state["takeoverPriceMicro"]), when, "l")
        with patch.object(self.service, "_create_completed_snapshot", side_effect=RuntimeError("snapshot failed")):
            with self.assertRaises(RuntimeError):
                self.service.apply_confirmed_transfer(intent["intentId"], transfer, now=when)
        with self.database.connect() as connection:
            self.assertEqual(connection.execute("SELECT COUNT(*) FROM reigns WHERE status='active'").fetchone()[0], 1)
            self.assertEqual(connection.execute("SELECT COUNT(*) FROM payments").fetchone()[0], 1)

    def test_outbox_failure_after_commit_does_not_rollback(self) -> None:
        self.take("Committed", 1, self.start, "m")
        with patch("coin_market.cli.deliver_outbox", side_effect=RuntimeError("unavailable")):
            report = process_outbox(self.service)
        self.assertEqual(report["failed"], 1)
        self.assertEqual(self.service.state(self.start + timedelta(seconds=2))["message"]["message"], "Committed")

    def test_archive_reign_page_share_card_and_fixed_home(self) -> None:
        self.take("Archive this", 3, self.start, "n")
        first_id = self.service.state(self.start + timedelta(seconds=2))["currentReignPublicId"]
        self.take("Replacement", 5, self.start + timedelta(seconds=3), "o")
        archive = self.service.archive()
        self.assertEqual(len([item for item in archive["reigns"] if item["wallSlotNumber"] is None]), 2)
        self.assertIn("highestTakeover", archive["records"])
        reign = self.service.reign(first_id, self.start + timedelta(seconds=5))
        self.assertIn("Take it back", render_reign(self.settings, reign))
        self.assertTrue(result_png({"type": "takeover", "message": "Archive this", "amount": "3"}).startswith(b"\x89PNG"))
        home = render_home(self.settings, self.service.state(self.start + timedelta(seconds=5)), archive)
        self.assertNotIn("Archive this", home)
        self.assertNotIn("Replacement", home)
        self.assertIn("Каждое слово здесь <em>куплено.</em>", home)
        self.assertIn("data-current-price>14</span> USDT", home)
        self.assertIn("data-current-price>12</span> USDT", home)
        self.assertIn("data-current-price>10</span> USDT", home)
        self.assertIn("Занять место", home)
        self.assertIn("USDT", home)
        self.assertNotIn("Market Scan", home)

    def test_receipt_discovers_exact_final_transfer_without_txid(self) -> None:
        state = self.service.state(self.start)
        intent = self.service.create_takeover_intent({
            "message": "Discovered automatically.",
            "amount": "7",
            "currentReignId": "",
            "quotedPriceMicro": state["takeoverPriceMicro"],
        }, "auto", now=self.start)
        self.transfer(intent, 7 * MICRO, self.start + timedelta(seconds=2), "q")
        receipt = self.service.discover_intent(intent["receiptToken"], self.start + timedelta(seconds=3))
        self.assertEqual(receipt["status"], "confirmed")
        self.assertEqual(self.service.state(self.start + timedelta(seconds=3))["message"]["message"], "Discovered automatically.")

    def test_expired_wall_receipt_requires_txid_for_late_payment(self) -> None:
        slot = self.service.wall_state(self.start)["slots"][2]
        message = (
            "A complete public message can still be recovered safely after the short automatic-discovery window "
            "when its owner supplies the exact confirmed TRON transaction identifier from the private receipt."
        )
        intent = self.service.create_takeover_intent(
            {
                "wallSlot": 3,
                "message": message,
                "amount": slot["outbidAmount"],
                "quotedPriceMicro": slot["outbidAmountMicro"],
            },
            "late-wall-visitor",
            now=self.start,
        )
        transfer = self.transfer(intent, 11 * MICRO, self.start + timedelta(seconds=421), "z")
        expired = self.service.discover_intent(intent["receiptToken"], self.start + timedelta(seconds=422))
        self.assertEqual(expired["status"], "expired")
        expired_page = render_receipt(self.settings, expired, intent["receiptToken"])
        self.assertIn("Already paid?", expired_page)
        self.assertIn("Check transaction", expired_page)
        self.assertNotIn("Send exactly", expired_page)
        self.assertEqual(self.service.wall_state(self.start + timedelta(seconds=422))["slots"][2]["amount"], "10")
        with self.database.connect() as connection:
            self.assertEqual(connection.execute("SELECT COUNT(*) FROM payments").fetchone()[0], 0)
        reconciled = reconcile_payments(self.service, apply=True)
        self.assertEqual(reconciled["applied"], 0)
        confirmed = self.service.verify_intent(
            intent["receiptToken"], transfer.txid, self.start + timedelta(seconds=423)
        )
        self.assertEqual(confirmed["status"], "confirmed")
        self.assertEqual(self.service.wall_state(self.start + timedelta(seconds=424))["slots"][2]["amount"], "11")

    def test_replacement_notification_is_transactionally_enqueued(self) -> None:
        first, _ = self.take("Notify me.", 2, self.start, "r")
        subscribed = self.service.subscribe_replacement(first["receiptToken"], "owner@example.com", self.start + timedelta(seconds=2))
        self.assertEqual(subscribed["contactType"], "email")
        self.take("Replacement.", 3, self.start + timedelta(seconds=3), "s")
        with self.database.connect() as connection:
            row = connection.execute(
                "SELECT type, payload_json FROM outbox WHERE type = 'reign_replaced_notification'"
            ).fetchone()
        self.assertIsNotNone(row)
        self.assertIn("Takeover?", row["payload_json"].replace("takeover", "Takeover"))
        with patch("coin_market.cli.deliver_outbox", return_value=None):
            report = process_outbox(self.service)
        self.assertGreaterEqual(report["completed"], 1)
        with self.database.connect() as connection:
            status = connection.execute("SELECT status FROM reign_notifications").fetchone()["status"]
        self.assertEqual(status, "sent")

    def test_wrong_contract_and_underpayment_are_never_applied(self) -> None:
        intent = self.service.create_takeover_intent({"message": "No", "amount": "1", "currentReignId": "", "quotedPriceMicro": MICRO}, "invalid", now=self.start)
        wrong = ConfirmedTransfer("p" * 64, 0, MICRO, "wrong", self.settings.receive_address, self.start)
        with self.assertRaises(MarketError) as error:
            self.service.apply_confirmed_transfer(intent["intentId"], wrong, now=self.start)
        self.assertEqual(error.exception.code, "wrong_contract")


if __name__ == "__main__":
    unittest.main()
