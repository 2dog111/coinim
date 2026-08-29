from __future__ import annotations

import io
import json
from urllib.parse import quote, urlencode

import qrcode
import qrcode.image.svg


def payment_request_url(
    site_url: str,
    receipt_token: str,
    address: str,
    amount: str,
    contract: str,
) -> str:
    fragment = urlencode(
        {
            "asset": "USDT",
            "network": "TRON",
            "standard": "TRC20",
            "amount": amount,
            "to": address,
            "contract": contract,
        },
        quote_via=quote,
    )
    token = quote(receipt_token, safe="")
    return f"{site_url.rstrip('/')}/receipt/{token}#{fragment}"


def tronlink_open_dapp_uri(payment_url: str) -> str:
    payload = json.dumps(
        {
            "url": payment_url,
            "action": "open",
            "protocol": "TronLink",
            "version": "1.0",
        },
        separators=(",", ":"),
    )
    return f"tronlinkoutside://pull.activity?param={quote(payload, safe='')}"


def svg(value: str, *, border: int = 2) -> str:
    code = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8,
        border=border,
    )
    code.add_data(value)
    code.make(fit=True)
    image = code.make_image(image_factory=qrcode.image.svg.SvgPathImage)
    output = io.BytesIO()
    image.save(output)
    return output.getvalue().decode("utf-8").replace("<svg ", '<svg aria-hidden="true" focusable="false" ')
