#!/usr/bin/env bash
set -euo pipefail
trap 'systemctl start coin-im-market coin-im-open coin-im-screenshot coin-im-market-reconcile.timer; exit 1' ERR
# Run as root on aiagentiva only. Stops legacy writers for a consistent final snapshot.
[[ "$(hostname -I)" == *193.181.215.57* ]] || exit 1
stage=/var/backups/coin-im-retirement
install -d -m 700 "$stage/snapshot"
systemctl stop coin-im-market-reconcile.timer coin-im-market-reconcile.service coin-im-market coin-im-open coin-im-screenshot
cp -aL /var/www/coin.im/current "$stage/snapshot/website"
cp -aL /opt/coin-im-market/current "$stage/snapshot/market-code"
cp -aL /opt/coin-im-open/current "$stage/snapshot/intake-code"
tar --exclude='./backups' --exclude='./.cache' -C /var/lib/coin-im-market -cf "$stage/snapshot/market-data.tar" .
tar -C /var/lib/coin-im-open -cf "$stage/snapshot/intake-data.tar" .
cp -a /etc/coin-im-market /etc/coin-im-open "$stage/snapshot/"
cp /etc/nginx/conf.d/coin.im.conf "$stage/snapshot/"
cp /etc/nginx/snippets/coin-im-*.conf "$stage/snapshot/"
cp /etc/systemd/system/coin-im-*.service /etc/systemd/system/coin-im-*.timer "$stage/snapshot/"
python3 - <<'PY'
import sqlite3
c=sqlite3.connect('file:/var/lib/coin-im-market/market.sqlite3?mode=ro',uri=True)
assert c.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
assert not c.execute('PRAGMA foreign_key_check').fetchall()
print('Legacy database integrity and foreign keys: OK')
PY
tar -czf "$stage/legacy-production.tar.gz" -C "$stage/snapshot" .
openssl enc -aes-256-cbc -salt -pbkdf2 -iter 200000 -pass file:/etc/coin-im-planner/legacy-backup.pass -in "$stage/legacy-production.tar.gz" -out "$stage/legacy-production.tar.gz.enc"
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass file:/etc/coin-im-planner/legacy-backup.pass -in "$stage/legacy-production.tar.gz.enc" | tar -tzf - >/dev/null
rclone --s3-no-check-bucket --config /etc/backups-to-r2/rclone.conf copyto "$stage/legacy-production.tar.gz.enc" r2:telegamarket-backups/aiagentiva/coin-im-retired/legacy-production.tar.gz.enc
rclone --s3-no-check-bucket --config /etc/backups-to-r2/rclone.conf copyto r2:telegamarket-backups/aiagentiva/coin-im-retired/legacy-production.tar.gz.enc "$stage/download.enc"
cmp "$stage/legacy-production.tar.gz.enc" "$stage/download.enc"
sha256sum "$stage/legacy-production.tar.gz.enc"
# Only delete the temporary snapshot after byte-for-byte remote round-trip verification.
rm -rf "$stage"
