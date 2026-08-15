from __future__ import annotations

import argparse
import json
import os
import re
import shutil
from pathlib import Path

from coin_open.app import DATA_ROOT, KEY_PATH, decrypt_bytes


JOB_RE = re.compile(r"^job_\d{8}T\d{6}Z_[a-f0-9]{16}$")


def load_metadata(job_id: str) -> dict:
    if not JOB_RE.fullmatch(job_id):
        raise SystemExit("Invalid job ID")
    source = DATA_ROOT / "jobs" / job_id / "metadata.json.aesgcm"
    if not source.is_file():
        raise SystemExit("Job not found")
    key = KEY_PATH.read_bytes()
    return json.loads(decrypt_bytes(source, key))


def list_notifications() -> None:
    notice_dir = DATA_ROOT / "notifications"
    notices = sorted(notice_dir.glob("job_*.json")) if notice_dir.is_dir() else []
    for notice in notices:
        print(notice.read_text(encoding="utf-8").strip())
    print(f"unread={len(notices)}")


def acknowledge(job_id: str) -> None:
    if not JOB_RE.fullmatch(job_id):
        raise SystemExit("Invalid job ID")
    notice = DATA_ROOT / "notifications" / f"{job_id}.json"
    notice.unlink(missing_ok=True)
    print(f"acknowledged={job_id}")


def show(job_id: str) -> None:
    print(json.dumps(load_metadata(job_id), ensure_ascii=False, indent=2))


def delete(job_id: str) -> None:
    metadata = load_metadata(job_id)
    job_path = DATA_ROOT / "jobs" / job_id
    deleted = ["metadata.json.aesgcm"] + [
        item["original_name"] for item in metadata.get("files", [])
    ]
    shutil.rmtree(job_path)
    (DATA_ROOT / "notifications" / f"{job_id}.json").unlink(missing_ok=True)
    print(json.dumps({"job_id": job_id, "deleted": deleted}, ensure_ascii=False))


def main() -> None:
    parser = argparse.ArgumentParser(prog="coin-open")
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("notifications")
    show_parser = subparsers.add_parser("show")
    show_parser.add_argument("job_id")
    delete_parser = subparsers.add_parser("delete")
    delete_parser.add_argument("job_id")
    ack_parser = subparsers.add_parser("ack")
    ack_parser.add_argument("job_id")
    args = parser.parse_args()
    if args.command == "notifications":
        list_notifications()
    elif args.command == "show":
        show(args.job_id)
    elif args.command == "delete":
        delete(args.job_id)
    elif args.command == "ack":
        acknowledge(args.job_id)


if __name__ == "__main__":
    main()
