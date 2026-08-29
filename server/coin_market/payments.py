from __future__ import annotations

import json
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from .config import Settings
from .core import MarketError, TRON_ADDRESS_RE, TXID_RE

UTC = timezone.utc


class PaymentPending(MarketError):
    def __init__(self, message: str = "The transaction is not final yet.", *, found: bool = False) -> None:
        super().__init__(202, message, "payment_pending")
        self.found = found


class PaymentInvalid(MarketError):
    def __init__(self, message: str, code: str = "payment_invalid") -> None:
        super().__init__(422, message, code)


class ProviderUnavailable(MarketError):
    def __init__(self, message: str = "Payment verification is temporarily unavailable.") -> None:
        super().__init__(503, message, "provider_unavailable")


@dataclass(frozen=True)
class ConfirmedTransfer:
    txid: str
    event_index: int
    amount_micro: int
    contract_address: str
    receiving_address: str
    confirmed_at: datetime


class PaymentProvider:
    name = "disabled"

    def verify(self, txid: str, *, intent_created_at: datetime) -> ConfirmedTransfer:
        raise ProviderUnavailable("Live USDT verification is not enabled.")

    def find_matching_transfers(
        self, *, intent_created_at: datetime, amount_micro: int
    ) -> list[ConfirmedTransfer]:
        raise ProviderUnavailable("Live USDT verification is not enabled.")


class MockPaymentProvider(PaymentProvider):
    name = "mock"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.transfers: dict[str, ConfirmedTransfer] = {}

    def add(self, transfer: ConfirmedTransfer) -> None:
        self.transfers[transfer.txid.lower()] = transfer

    def verify(self, txid: str, *, intent_created_at: datetime) -> ConfirmedTransfer:
        transfer = self.transfers.get(txid.lower())
        if transfer is None:
            raise PaymentPending("Mock payment has not been confirmed.")
        if transfer.confirmed_at < intent_created_at:
            raise PaymentInvalid("The transfer predates this payment request.", "payment_too_early")
        return transfer

    def find_matching_transfers(
        self, *, intent_created_at: datetime, amount_micro: int
    ) -> list[ConfirmedTransfer]:
        return [
            transfer
            for transfer in self.transfers.values()
            if transfer.confirmed_at >= intent_created_at and transfer.amount_micro == amount_micro
        ]


class TronGridPaymentProvider(PaymentProvider):
    name = "trongrid"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        if settings.tron_network == "mainnet":
            self.base_url = "https://api.trongrid.io"
        elif settings.tron_network == "nile":
            self.base_url = "https://nile.trongrid.io"
        elif settings.tron_network == "shasta":
            self.base_url = "https://api.shasta.trongrid.io"
        else:
            raise ValueError("Unsupported TRON network")

    def request_json(self, path: str, *, method: str = "GET", payload: Optional[dict] = None) -> dict:
        headers = {
            "Accept": "application/json",
            "User-Agent": "coin-im-market/2026.08",
        }
        if self.settings.trongrid_api_key:
            headers["TRON-PRO-API-KEY"] = self.settings.trongrid_api_key
        body = None
        if payload is not None:
            body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
            headers["Content-Type"] = "application/json"
        request = Request(self.base_url + path, data=body, headers=headers, method=method)
        last_error: Optional[Exception] = None
        for attempt in range(3):
            try:
                with urlopen(request, timeout=12) as response:
                    value = json.loads(response.read())
                    if not isinstance(value, dict):
                        raise ProviderUnavailable()
                    return value
            except HTTPError as error:
                if error.code in {400, 404}:
                    return {}
                last_error = error
            except (URLError, TimeoutError, json.JSONDecodeError) as error:
                last_error = error
            if attempt < 2:
                time.sleep(0.25 * (attempt + 1))
        raise ProviderUnavailable() from last_error

    def verify(self, txid: str, *, intent_created_at: datetime) -> ConfirmedTransfer:
        normalized_txid = txid.strip().lower()
        if not TXID_RE.fullmatch(normalized_txid):
            raise PaymentInvalid("Enter the 64-character TRON transaction ID.", "invalid_txid")
        if not TRON_ADDRESS_RE.fullmatch(self.settings.receive_address):
            raise ProviderUnavailable("The receiving address is not configured correctly.")
        if not TRON_ADDRESS_RE.fullmatch(self.settings.contract_address):
            raise ProviderUnavailable("The USDT contract is not configured correctly.")

        receipt = self.request_json(
            "/walletsolidity/gettransactioninfobyid",
            method="POST",
            payload={"value": normalized_txid},
        )
        if not receipt or not receipt.get("id"):
            unconfirmed = self.request_json(
                "/wallet/gettransactionbyid",
                method="POST",
                payload={"value": normalized_txid},
            )
            if unconfirmed and unconfirmed.get("txID"):
                raise PaymentPending("Payment found. Waiting for final confirmation on TRON.", found=True)
            raise PaymentPending()
        receipt_result = str((receipt.get("receipt") or {}).get("result") or "").upper()
        result_value = str(receipt.get("result") or "").upper()
        if receipt_result and receipt_result != "SUCCESS":
            raise PaymentInvalid("The transaction did not execute successfully.", "transaction_failed")
        if result_value and result_value not in {"SUCCESS", "SUCESS"}:
            raise PaymentInvalid("The transaction did not execute successfully.", "transaction_failed")

        min_timestamp = int(intent_created_at.timestamp() * 1000)
        query = urlencode(
            {
                "only_confirmed": "true",
                "only_to": "true",
                "limit": "200",
                "order_by": "block_timestamp,desc",
                "min_timestamp": str(min_timestamp),
                "contract_address": self.settings.contract_address,
            }
        )
        history = self.request_json(
            f"/v1/accounts/{self.settings.receive_address}/transactions/trc20?{query}"
        )
        rows = history.get("data") if isinstance(history, dict) else None
        if not isinstance(rows, list):
            raise PaymentPending("The confirmed transfer index has not caught up yet.")

        matches = [
            row
            for row in rows
            if isinstance(row, dict)
            and str(row.get("transaction_id") or "").lower() == normalized_txid
            and str(row.get("to") or "") == self.settings.receive_address
            and str((row.get("token_info") or {}).get("address") or "") == self.settings.contract_address
        ]
        if not matches:
            raise PaymentInvalid(
                "No confirmed USDT TRC20 transfer to the configured address was found in this transaction.",
                "transfer_not_found",
            )
        if len(matches) > 1:
            raise PaymentInvalid(
                "More than one matching USDT transfer was found. The payment requires manual review.",
                "ambiguous_transfer",
            )

        row = matches[0]
        token = row.get("token_info") or {}
        try:
            decimals = int(token.get("decimals"))
            amount_micro = int(row.get("value"))
            timestamp_ms = int(row.get("block_timestamp"))
        except (TypeError, ValueError) as error:
            raise ProviderUnavailable("The provider returned an incomplete transfer record.") from error
        if decimals != 6:
            raise PaymentInvalid("The transfer is not the configured six-decimal USDT asset.", "wrong_token")
        confirmed_at = datetime.fromtimestamp(timestamp_ms / 1000, UTC)
        if confirmed_at < intent_created_at:
            raise PaymentInvalid("The transfer predates this payment request.", "payment_too_early")
        event_value = row.get("event_index", row.get("log_index", 0))
        try:
            event_index = int(event_value)
        except (TypeError, ValueError):
            event_index = 0
        return ConfirmedTransfer(
            txid=normalized_txid,
            event_index=event_index,
            amount_micro=amount_micro,
            contract_address=self.settings.contract_address,
            receiving_address=self.settings.receive_address,
            confirmed_at=confirmed_at,
        )

    def find_matching_transfers(
        self, *, intent_created_at: datetime, amount_micro: int
    ) -> list[ConfirmedTransfer]:
        if not TRON_ADDRESS_RE.fullmatch(self.settings.receive_address):
            raise ProviderUnavailable("The receiving address is not configured correctly.")
        if not TRON_ADDRESS_RE.fullmatch(self.settings.contract_address):
            raise ProviderUnavailable("The USDT contract is not configured correctly.")
        query = urlencode(
            {
                "only_confirmed": "true",
                "only_to": "true",
                "limit": "200",
                "order_by": "block_timestamp,desc",
                "min_timestamp": str(int(intent_created_at.timestamp() * 1000)),
                "contract_address": self.settings.contract_address,
            }
        )
        history = self.request_json(
            f"/v1/accounts/{self.settings.receive_address}/transactions/trc20?{query}"
        )
        rows = history.get("data") if isinstance(history, dict) else None
        if not isinstance(rows, list):
            raise PaymentPending("The confirmed transfer index has not caught up yet.")
        txids: list[str] = []
        for row in rows:
            if not isinstance(row, dict):
                continue
            token = row.get("token_info") or {}
            try:
                value = int(row.get("value"))
                decimals = int(token.get("decimals"))
                timestamp_ms = int(row.get("block_timestamp"))
            except (TypeError, ValueError):
                continue
            txid = str(row.get("transaction_id") or "").strip().lower()
            if (
                TXID_RE.fullmatch(txid)
                and value == amount_micro
                and decimals == 6
                and timestamp_ms >= int(intent_created_at.timestamp() * 1000)
                and str(row.get("to") or "") == self.settings.receive_address
                and str(token.get("address") or "") == self.settings.contract_address
                and txid not in txids
            ):
                txids.append(txid)
        transfers: list[ConfirmedTransfer] = []
        for txid in txids:
            transfers.append(self.verify(txid, intent_created_at=intent_created_at))
        return transfers


def provider_from_settings(settings: Settings) -> PaymentProvider:
    if settings.tron_provider == "trongrid":
        return TronGridPaymentProvider(settings)
    if settings.tron_provider == "mock" and settings.is_local:
        return MockPaymentProvider(settings)
    return PaymentProvider()
