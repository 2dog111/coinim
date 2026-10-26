# Deployment and legacy recovery

Target: aiagentiva, IP 193.181.215.57, SSH alias `ops`. The live OS hostname currently reports `mail.atm.bz`; verify IP and paths before acting. Keep DNS, certificates and mail routing unchanged.

New service: `coin-im-planner`, isolated account `coinplanner`, loopback port 3216. Code: `/opt/coin-im-planner/current`, releases in `/opt/coin-im-planner/releases/`. Secrets: `/etc/coin-im-planner/planner.env` (root only). Reverse proxy: `/etc/nginx/conf.d/coin.im.conf`.

Build with the lockfile on the Linux host in a temporary staging directory. Copy `.next/standalone` and `.next/static` into a fresh release, plus `public` if it exists. Create `.next/cache` in the release, owned by `coinplanner`, before starting the service; the systemd `ReadWritePaths` setting requires that path. Do not copy `.env*`, source archives or developer evidence into the release. Start the service and check loopback status and homepage before switching Nginx. Run `nginx -t`, reload and verify HTTPS, assets, same-origin API requests and a real synthetic chat. Remove superseded code and staging directories only after successful public checks.

## Retired product

The final encrypted legacy bundle lives in the private R2 bucket `telegamarket-backups`, prefix `aiagentiva/coin-im-retired/`. It contains the production website, old backend source, SQLite records, encrypted enquiry files, configuration, keys and service definitions. A separate encrypted local-source archive is part of the same retirement set. Both are verified by downloading and comparing bytes. The production archive is also decrypted and its tar contents checked before upload; SQLite integrity and foreign keys are checked.

The AES-256-CBC envelope uses PBKDF2 with 200,000 iterations. The random recovery passphrase is stored at `/etc/coin-im-planner/legacy-backup.pass` and on the owner's Mac at `~/.config/coin-im-backup/recovery.pass`; do not print or commit it. SHA-256 checksums in the verification report must be checked before decryption.

```sh
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
  -pass file:/etc/coin-im-planner/legacy-backup.pass \
  -in legacy-production.tar.gz.enc -out legacy-production.tar.gz
```

Do not restart the old payment/outbox services as part of routine recovery. Restoring the old product requires a new owner instruction. Legacy working data remains in `/var/lib/coin-im-market` and `/var/lib/coin-im-open`; key/config directories remain under `/etc`. Code, old runtime environments and old service definitions are removed after successful replacement. Uploaded screenshots and enquiry files must not be deleted as code.

## Verified release: 2026-10-26

`/opt/coin-im-planner/releases/20261026-visible-controls-979f712` is the active question-first chat release. Budget, maximum loss, deadline, date and additional fields remain visible without disclosure buttons. The first public mobile viewport contains the primary action. A real production Gemini analysis completed with the user's budget, loss limit and deadline preserved. A temporary upstream `429 RESOURCE_EXHAUSTED` is presented as a clear retry state while retaining the calculated plan. Market data remains intentionally unavailable. Legacy retirement archives below are unchanged. Final release verification and cleanup are recorded in `docs/VERIFICATION.md` and `PROGRESS.md`.

Retirement archive checksums:

- `legacy-local-source.tar.gz.enc`: `6f0e48a2a498009f7db63300522bebdac6ead991b1970145c4a31e0a0e498ead`
- `legacy-production.tar.gz.enc`: `6efdc73fb5d3174a39f72273d1968fa45e05b66ac547715f7f01e88f954a59ce`

Only these two parts of the same legacy retirement set are stored under the R2 retirement prefix. No legacy code remains on the application server or in a second local checkout. The new repository retains all prior Git history.
