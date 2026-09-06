"""Short campaign enquiries, stored with the existing encrypted business files."""
import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
from datetime import UTC, datetime


async def submit_lead(scope, receive, send, key):
    from . import app as intake

    data = await intake.read_json(receive)
    if data.get("fax"):
        raise intake.IntakeError(422, "Please reload the form and try again.")
    def field(name, label, limit, required=True):
        value = data.get(name, "")
        if not isinstance(value, str) or len(value) > limit:
            raise intake.IntakeError(422, f"Check {label.lower()}.")
        value = value.strip()
        if required and not value:
            raise intake.IntakeError(422, f"{label} is required.")
        return value
    name = field("name", "Your name", 200)
    company = field("company", "Company", 200)
    email = field("work_email", "Work email", 320)
    phone = field("phone", "Phone", 80)
    office = field("office_address", "Office address", 600, False)
    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        raise intake.IntakeError(422, "Enter a valid work email.")
    if not re.fullmatch(r"[+\d() .-]+", phone) or not 7 <= len(re.sub(r"\D", "", phone)) <= 15:
        raise intake.IntakeError(422, "Enter your phone number with its country code.")
    channel = data.get("channel")
    if channel not in {"WhatsApp", "SMS", "Phone", "Email"}:
        raise intake.IntakeError(422, "Choose how you would like us to contact you.")
    request_id = field("request_id", "Request identifier", 64)
    if not re.fullmatch(r"[a-f0-9]{32}", request_id):
        raise intake.IntakeError(422, "Please reload the form and try again.")
    payload = dict(name=name, company=company, work_email=email, phone=phone,
                   office_address=office, channels=[channel], source="homepage", files=[])
    fingerprint = hmac.new(key, json.dumps(payload, sort_keys=True).encode(), hashlib.sha256).hexdigest()
    request_hash = hmac.new(key, request_id.encode(), hashlib.sha256).hexdigest()
    intake.prepare_root()
    database = intake.DATA_ROOT / "lead-requests.sqlite3"
    with sqlite3.connect(database, timeout=10) as conn:
        os.chmod(database, 0o600)
        conn.execute("CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, job_id TEXT NOT NULL)")
        conn.execute("BEGIN IMMEDIATE")
        previous = conn.execute("SELECT fingerprint, job_id FROM requests WHERE id=?", (request_hash,)).fetchone()
        if previous:
            if not hmac.compare_digest(previous[0], fingerprint):
                raise intake.IntakeError(409, "This request was already received. Reload to send another enquiry.")
            job_id = previous[1]
        else:
            intake.check_rate_limit(intake.client_ip(scope, intake.headers_dict(scope)), key)
            now = intake.utc_now()
            job_id = f"job_{datetime.now(UTC).strftime('%Y%m%dT%H%M%SZ')}_{secrets.token_hex(8)}"
            folder = intake.DATA_ROOT / "jobs" / job_id
            folder.mkdir(mode=0o700)
            payload.update(schema_version=1, job_id=job_id, upload_completed_at=now)
            try:
                intake.write_json_encrypted(payload, folder / "metadata.json.aesgcm", key)
                conn.execute("INSERT INTO requests VALUES (?, ?, ?)", (request_hash, fingerprint, job_id))
                conn.commit()
            except Exception:
                (folder / "metadata.json.aesgcm").unlink(missing_ok=True)
                folder.rmdir()
                raise
            intake.notify_owner(job_id, now)
    await intake.send_json(send, 201, {"received": True, "reference": job_id})
