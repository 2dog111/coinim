from __future__ import annotations

import asyncio
import hashlib
import hmac
import ipaddress
import json
import logging
import os
import re
import secrets
import shutil
import socket
import sqlite3
import time
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import unquote, urlsplit

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes


DATA_ROOT = Path(os.environ.get("COIN_OPEN_DATA_ROOT", "/var/lib/coin-im-open"))
KEY_PATH = Path(os.environ.get("COIN_OPEN_KEY_PATH", "/etc/coin-im-open/encryption.key"))
ALLOWED_ORIGINS = {
    value.strip()
    for value in os.environ.get("COIN_OPEN_ALLOWED_ORIGINS", "https://coin.im").split(",")
    if value.strip()
}
MAX_FILE_BYTES = 200 * 1024 * 1024
MAX_FILES = 20
MAX_JSON_BYTES = 256 * 1024
MAX_SUBMISSIONS_PER_HOUR = 5
ALLOWED_EXTENSIONS = {
    ".pdf",
    ".docx",
    ".pptx",
    ".txt",
    ".md",
    ".mp3",
    ".m4a",
    ".wav",
    ".mp4",
    ".png",
    ".jpg",
    ".webp",
}
ALLOWED_SLOTS = {
    "company_presentation",
    "pitch_deck",
    "customer_calls",
    "anything_else",
}
ALLOWED_CHANNELS = {"Email", "WhatsApp", "Telegram", "Phone", "SMS", "LINE", "WeChat"}
DRAFT_RE = re.compile(r"^draft_[a-f0-9]{32}$")
MAGIC = b"COINOPEN1"
NONCE_BYTES = 12
TAG_BYTES = 16

logger = logging.getLogger("coin-open")


class IntakeError(Exception):
    def __init__(self, status: int, message: str) -> None:
        super().__init__(message)
        self.status = status
        self.message = message


def utc_now() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds")


def load_key() -> bytes:
    key = KEY_PATH.read_bytes()
    if len(key) != 32:
        raise RuntimeError("Encryption key must contain exactly 32 bytes")
    return key


def headers_dict(scope: dict) -> dict[str, str]:
    return {
        key.decode("latin-1").lower(): value.decode("latin-1")
        for key, value in scope.get("headers", [])
    }


def client_ip(scope: dict, headers: dict[str, str]) -> str:
    value = headers.get("x-real-ip")
    if value:
        return value.strip()
    client = scope.get("client")
    return str(client[0]) if client else "unknown"


async def send_json(send, status: int, payload: dict) -> None:
    body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    await send(
        {
            "type": "http.response.start",
            "status": status,
            "headers": [
                (b"content-type", b"application/json; charset=utf-8"),
                (b"content-length", str(len(body)).encode("ascii")),
                (b"cache-control", b"no-store"),
                (b"referrer-policy", b"no-referrer"),
                (b"x-content-type-options", b"nosniff"),
            ],
        }
    )
    await send({"type": "http.response.body", "body": body})


async def read_body(receive, limit: int) -> bytes:
    chunks: list[bytes] = []
    size = 0
    while True:
        message = await receive()
        if message["type"] == "http.disconnect":
            raise IntakeError(400, "The upload was interrupted.")
        body = message.get("body", b"")
        size += len(body)
        if size > limit:
            while message.get("more_body", False):
                message = await receive()
            raise IntakeError(413, "The request is too large.")
        chunks.append(body)
        if not message.get("more_body", False):
            return b"".join(chunks)


async def read_json(receive) -> dict:
    body = await read_body(receive, MAX_JSON_BYTES)
    try:
        value = json.loads(body or b"{}")
    except json.JSONDecodeError as error:
        raise IntakeError(400, "The form data is not valid JSON.") from error
    if not isinstance(value, dict):
        raise IntakeError(400, "The form data must be an object.")
    return value


def encrypt_bytes(value: bytes, destination: Path, key: bytes) -> None:
    nonce = os.urandom(NONCE_BYTES)
    encryptor = Cipher(algorithms.AES(key), modes.GCM(nonce)).encryptor()
    temporary = destination.with_suffix(destination.suffix + ".tmp")
    with temporary.open("wb") as output:
        output.write(MAGIC)
        output.write(nonce)
        output.write(encryptor.update(value))
        output.write(encryptor.finalize())
        output.write(encryptor.tag)
    os.chmod(temporary, 0o600)
    os.replace(temporary, destination)


def decrypt_bytes(source: Path, key: bytes) -> bytes:
    value = source.read_bytes()
    if not value.startswith(MAGIC) or len(value) < len(MAGIC) + NONCE_BYTES + TAG_BYTES:
        raise RuntimeError("Encrypted file header is invalid")
    nonce_start = len(MAGIC)
    nonce_end = nonce_start + NONCE_BYTES
    nonce = value[nonce_start:nonce_end]
    ciphertext = value[nonce_end:-TAG_BYTES]
    tag = value[-TAG_BYTES:]
    decryptor = Cipher(algorithms.AES(key), modes.GCM(nonce, tag)).decryptor()
    return decryptor.update(ciphertext) + decryptor.finalize()


def write_json_encrypted(value: dict, destination: Path, key: bytes) -> None:
    encrypt_bytes(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True).encode("utf-8"),
        destination,
        key,
    )


def read_json_encrypted(source: Path, key: bytes) -> dict:
    return json.loads(decrypt_bytes(source, key))


async def encrypt_request_body(receive, destination: Path, key: bytes) -> int:
    nonce = os.urandom(NONCE_BYTES)
    encryptor = Cipher(algorithms.AES(key), modes.GCM(nonce)).encryptor()
    size = 0
    too_large = False
    temporary = destination.with_suffix(destination.suffix + ".tmp")
    try:
        with temporary.open("wb") as output:
            output.write(MAGIC)
            output.write(nonce)
            while True:
                message = await receive()
                if message["type"] == "http.disconnect":
                    raise IntakeError(400, "The upload was interrupted.")
                body = message.get("body", b"")
                size += len(body)
                if size > MAX_FILE_BYTES:
                    too_large = True
                elif body:
                    output.write(encryptor.update(body))
                if not message.get("more_body", False):
                    break
            if too_large:
                raise IntakeError(413, "Each file must be 200 MB or smaller.")
            output.write(encryptor.finalize())
            output.write(encryptor.tag)
        os.chmod(temporary, 0o600)
        os.replace(temporary, destination)
        return size
    except Exception:
        temporary.unlink(missing_ok=True)
        raise


def draft_path(draft_id: str) -> Path:
    if not DRAFT_RE.fullmatch(draft_id):
        raise IntakeError(404, "The upload could not be found.")
    path = DATA_ROOT / "drafts" / draft_id
    if not path.is_dir():
        raise IntakeError(404, "The upload could not be found.")
    return path


def safe_filename(header_value: str) -> tuple[str, str]:
    name = Path(unquote(header_value)).name.strip()
    if not name or name in {".", ".."}:
        raise IntakeError(400, "The file needs a name.")
    extension = Path(name).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        allowed = ", ".join(sorted(value.removeprefix(".") for value in ALLOWED_EXTENSIONS))
        raise IntakeError(415, f"That file type is not accepted. Allowed types: {allowed}.")
    return name[:240], extension


def validate_required_text(value: object, label: str, maximum: int) -> str:
    if not isinstance(value, str) or not value.strip():
        raise IntakeError(422, f"{label} is required.")
    return value.strip()[:maximum]


def resolve_public_host(hostname: str) -> list[str]:
    if hostname.lower() == "localhost" or hostname.lower().endswith(".localhost"):
        raise IntakeError(422, "The website must use a public address.")
    try:
        records = socket.getaddrinfo(hostname, None, type=socket.SOCK_STREAM)
    except socket.gaierror as error:
        raise IntakeError(422, "The website address could not be resolved.") from error
    addresses = sorted({record[4][0] for record in records})
    if not addresses:
        raise IntakeError(422, "The website address could not be resolved.")
    for address in addresses:
        try:
            parsed = ipaddress.ip_address(address)
        except ValueError as error:
            raise IntakeError(422, "The website address is not valid.") from error
        if not parsed.is_global:
            raise IntakeError(422, "The website must use a public address.")
    return addresses


async def validate_website(value: object) -> str:
    if value is None or value == "":
        return ""
    if not isinstance(value, str) or len(value) > 2048:
        raise IntakeError(422, "The website address is not valid.")
    candidate = value.strip()
    parsed = urlsplit(candidate)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username or parsed.password:
        raise IntakeError(422, "Enter a public website beginning with http:// or https://.")
    await asyncio.to_thread(resolve_public_host, parsed.hostname)
    return candidate


def check_rate_limit(ip: str, key: bytes) -> None:
    DATA_ROOT.mkdir(parents=True, exist_ok=True)
    database = DATA_ROOT / "state.sqlite3"
    fingerprint = hmac.new(key, f"rate:{ip}".encode("utf-8"), hashlib.sha256).hexdigest()
    now = time.time()
    with sqlite3.connect(database, timeout=10) as connection:
        connection.execute(
            "CREATE TABLE IF NOT EXISTS submissions (ip_hash TEXT NOT NULL, created REAL NOT NULL)"
        )
        connection.execute("BEGIN IMMEDIATE")
        connection.execute("DELETE FROM submissions WHERE created < ?", (now - 86400,))
        count = connection.execute(
            "SELECT COUNT(*) FROM submissions WHERE ip_hash = ? AND created >= ?",
            (fingerprint, now - 3600),
        ).fetchone()[0]
        if count >= MAX_SUBMISSIONS_PER_HOUR:
            connection.rollback()
            raise IntakeError(429, "No more than five files can be sent from one address in an hour. Try again later.")
        connection.execute("INSERT INTO submissions (ip_hash, created) VALUES (?, ?)", (fingerprint, now))
        connection.commit()
    os.chmod(database, 0o600)


def notify_owner(job_id: str, completed_at: str) -> None:
    notice_dir = DATA_ROOT / "notifications"
    notice_dir.mkdir(parents=True, exist_ok=True)
    notice = notice_dir / f"{job_id}.json"
    notice.write_text(
        json.dumps({"job_id": job_id, "completed_at": completed_at}, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )
    os.chmod(notice, 0o600)
    logger.warning("new_business_file job_id=%s", job_id)


def prepare_root() -> None:
    for path in (DATA_ROOT, DATA_ROOT / "drafts", DATA_ROOT / "jobs", DATA_ROOT / "notifications"):
        path.mkdir(parents=True, exist_ok=True)


async def create_draft(send, key: bytes) -> None:
    prepare_root()
    draft_id = f"draft_{secrets.token_hex(16)}"
    path = DATA_ROOT / "drafts" / draft_id
    (path / "files").mkdir(parents=True, mode=0o700)
    metadata = {"schema_version": 1, "draft_id": draft_id, "created_at": utc_now(), "files": []}
    write_json_encrypted(metadata, path / "draft.json.aesgcm", key)
    await send_json(send, 201, {"draft_id": draft_id})


async def upload_file(scope: dict, receive, send, draft_id: str, key: bytes) -> None:
    headers = headers_dict(scope)
    content_length = headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > MAX_FILE_BYTES:
                raise IntakeError(413, "Each file must be 200 MB or smaller.")
        except ValueError as error:
            raise IntakeError(400, "The file size is not valid.") from error
    name, extension = safe_filename(headers.get("x-file-name", ""))
    slot = headers.get("x-file-slot", "")
    if slot not in ALLOWED_SLOTS:
        raise IntakeError(422, "The upload category is not valid.")
    path = draft_path(draft_id)
    metadata_path = path / "draft.json.aesgcm"
    metadata = read_json_encrypted(metadata_path, key)
    if len(metadata["files"]) >= MAX_FILES:
        raise IntakeError(422, "A business file can contain no more than 20 files.")
    stored_name = f"{len(metadata['files']) + 1:02d}.aesgcm"
    destination = path / "files" / stored_name
    size = await encrypt_request_body(receive, destination, key)
    metadata["files"].append(
        {
            "original_name": name,
            "extension": extension,
            "slot": slot,
            "size": size,
            "stored_name": stored_name,
        }
    )
    write_json_encrypted(metadata, metadata_path, key)
    await send_json(send, 201, {"name": name, "size": size, "count": len(metadata["files"])})


async def submit_draft(scope: dict, receive, send, draft_id: str, key: bytes) -> None:
    data = await read_json(receive)
    name = validate_required_text(data.get("name"), "Your name", 200)
    work_email = validate_required_text(data.get("work_email"), "Work email", 320)
    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", work_email):
        raise IntakeError(422, "Enter a valid work email.")
    phone = validate_required_text(data.get("phone"), "Phone", 100)
    role = str(data.get("role") or "").strip()[:200]
    channels = data.get("channels")
    if not isinstance(channels, list) or not channels:
        raise IntakeError(422, "Choose at least one way for us to reach you.")
    if any(not isinstance(item, str) or item not in ALLOWED_CHANNELS for item in channels):
        raise IntakeError(422, "One of the contact methods is not valid.")
    channels = list(dict.fromkeys(channels))
    website = await validate_website(data.get("website"))

    path = draft_path(draft_id)
    metadata_path = path / "draft.json.aesgcm"
    metadata = read_json_encrypted(metadata_path, key)
    headers = headers_dict(scope)
    check_rate_limit(client_ip(scope, headers), key)

    completed_at = utc_now()
    job_id = f"job_{datetime.now(UTC).strftime('%Y%m%dT%H%M%SZ')}_{secrets.token_hex(8)}"
    metadata.update(
        {
            "job_id": job_id,
            "name": name,
            "work_email": work_email,
            "phone": phone,
            "role": role,
            "channels": channels,
            "website": website,
            "upload_completed_at": completed_at,
        }
    )
    write_json_encrypted(metadata, metadata_path, key)
    destination = DATA_ROOT / "jobs" / job_id
    os.replace(path, destination)
    os.replace(destination / "draft.json.aesgcm", destination / "metadata.json.aesgcm")
    notify_owner(job_id, completed_at)
    await send_json(send, 201, {"received": True})


async def delete_draft(send, draft_id: str) -> None:
    path = draft_path(draft_id)
    shutil.rmtree(path)
    await send_json(send, 200, {"deleted": True})


async def app(scope, receive, send) -> None:
    if scope["type"] != "http":
        return
    method = scope.get("method", "GET").upper()
    path = scope.get("path", "")
    headers = headers_dict(scope)
    origin = headers.get("origin")
    if origin and origin not in ALLOWED_ORIGINS:
        await send_json(send, 403, {"error": "This form must be sent from coin.im."})
        return
    try:
        if method == "GET" and path == "/api/open/health":
            await send_json(send, 200, {"status": "ok"})
            return
        key = load_key()
        if method == "POST" and path == "/api/open/drafts":
            await read_body(receive, 1024)
            await create_draft(send, key)
            return
        match = re.fullmatch(r"/api/open/drafts/(draft_[a-f0-9]{32})/files", path)
        if method == "POST" and match:
            await upload_file(scope, receive, send, match.group(1), key)
            return
        match = re.fullmatch(r"/api/open/drafts/(draft_[a-f0-9]{32})/submit", path)
        if method == "POST" and match:
            await submit_draft(scope, receive, send, match.group(1), key)
            return
        match = re.fullmatch(r"/api/open/drafts/(draft_[a-f0-9]{32})", path)
        if method == "DELETE" and match:
            await read_body(receive, 1024)
            await delete_draft(send, match.group(1))
            return
        raise IntakeError(404, "Not found.")
    except IntakeError as error:
        logger.warning("intake_error type=%s", type(error).__name__)
        await send_json(send, error.status, {"error": error.message})
    except Exception:
        logger.exception("intake_failure type=InternalError")
        await send_json(send, 500, {"error": "The file could not be received. Try again later."})
