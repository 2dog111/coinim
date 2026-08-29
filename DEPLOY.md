# coin.im VPS Deploy

Production is served from the VPS.

- Host: `iva`
- IP: `193.181.215.57`
- Web root symlink: `/var/www/coin.im/current`
- Release directory: `/var/www/coin.im/releases/<timestamp>`
- Nginx config: `/etc/nginx/conf.d/coin.im.conf`
- Public URLs: `https://coin.im/`, `https://www.coin.im/`
- DNS: Cloudflare DNS-only `A` records for `coin.im` and `www.coin.im` to `193.181.215.57`
- TLS: Let's Encrypt certificate for `coin.im` and `www.coin.im`, renewed by certbot

## Files To Deploy

Use a clean temporary directory. Include only:

- `index.html`
- `mail.html`
- `mail/index.html`
- `ru.html`
- `es.html`
- `ai.html`
- `s.html`
- `ms.html`
- `ms/index.html`
- `msru.html`
- `msru/index.html`
- `handling.html`
- `handling/index.html`
- `open.html`
- `open/index.html`
- `llms.txt`
- `styles.css`
- `ms.css`
- `robots.txt`
- `sitemap.xml`
- `assets/`

Do not copy audit files, screenshots, scripts, git metadata, or local notes.

## Deploy Commands

Run from the repository root.

```bash
tmp=$(mktemp -d /tmp/coin-im-release.XXXXXX)
mkdir -p "$tmp/mail" "$tmp/ms" "$tmp/msru" "$tmp/handling" "$tmp/open"
rsync -a index.html mail.html ru.html es.html ai.html s.html ms.html msru.html handling.html open.html llms.txt styles.css ms.css robots.txt sitemap.xml assets "$tmp/"
rsync -a mail/index.html "$tmp/mail/index.html"
rsync -a ms/index.html "$tmp/ms/index.html"
rsync -a msru/index.html "$tmp/msru/index.html"
rsync -a handling/index.html "$tmp/handling/index.html"
rsync -a open/index.html "$tmp/open/index.html"

ts=$(date -u +%Y%m%dT%H%M%SZ)
remote="/var/www/coin.im/releases/$ts"

ssh iva "set -e; sudo mkdir -p '$remote'; sudo chown -R iva:sudo /var/www/coin.im"
rsync -az --delete "$tmp/" "iva:$remote/"

ssh iva "set -e; sudo chown -R nginx:nginx '$remote'; sudo find '$remote' -type d -exec chmod 755 {} +; sudo find '$remote' -type f -exec chmod 644 {} +; sudo ln -sfn '$remote' /var/www/coin.im/current; sudo nginx -t; sudo systemctl reload nginx; readlink -f /var/www/coin.im/current"
```

The intake API is a separate release under `/opt/coin-im-open/releases/<timestamp>`. Its persistent data is never stored in the static release tree:

- encrypted jobs: `/var/lib/coin-im-open/jobs`
- incomplete encrypted uploads: `/var/lib/coin-im-open/drafts`
- owner notices: `/var/lib/coin-im-open/notifications`
- AES-256-GCM key: `/etc/coin-im-open/encryption.key`

The VPS needs `python3.12-venv`. Keep `/var/lib/coin-im-open` owned by `coinopen:coinopen` with mode `711`, `jobs` and `drafts` at `700`, and `notifications` at `755`. Keep the 32-byte key owned by `root:coinopen` with mode `640`.

Deploy `server/coin_open` and `server/requirements.txt` to the backend release, point `/opt/coin-im-open/current` at it, install dependencies into `/opt/coin-im-open/venv`, install `server/deploy/coin-im-open.service`, `server/deploy/coin-open`, and `server/deploy/95-coin-open`, then restart `coin-im-open`. Preserve the `/open`, `/open/`, and `/api/open/` Nginx locations from `server/deploy/nginx-locations.conf`.

## Takeover Market Service

The takeover market is a separate ASGI service on `127.0.0.1:8782`:

- releases: `/opt/coin-im-market/releases/<timestamp>`
- current symlink: `/opt/coin-im-market/current`
- virtual environment: `/opt/coin-im-market/venv`
- persistent database: `/var/lib/coin-im-market/market.sqlite3`
- protected environment: `/etc/coin-im-market/market.env`
- systemd units: `coin-im-market.service`, `coin-im-market-reconcile.service`, and `coin-im-market-reconcile.timer`

Back up an existing market database before each backend release:

```bash
ssh iva 'sudo -u coinmarket env PYTHONPATH=/opt/coin-im-market/current /opt/coin-im-market/venv/bin/python -m coin_market.cli backup /var/lib/coin-im-market/backups'
```

Deploy the backend from the repository root:

```bash
ts=$(date -u +%Y%m%dT%H%M%SZ)
backend_release="/opt/coin-im-market/releases/$ts"

ssh iva "sudo install -d -o coinmarket -g coinmarket '$backend_release'"
rsync -az --delete server/coin_market server/requirements-market.txt "iva:/tmp/coin-im-market-$ts/"
ssh iva "set -e; sudo rsync -a --delete '/tmp/coin-im-market-$ts/' '$backend_release/'; sudo chown -R coinmarket:coinmarket '$backend_release'; sudo -u coinmarket /opt/coin-im-market/venv/bin/pip install -r '$backend_release/requirements-market.txt'; sudo ln -sfn '$backend_release' /opt/coin-im-market/current; sudo -u coinmarket env PYTHONPATH='$backend_release' /opt/coin-im-market/venv/bin/python -m coin_market.cli migrate; sudo systemctl restart coin-im-market"
```

Install or update the unit and Nginx snippets only when those files change. Back up `/etc/nginx/conf.d/coin.im.conf` before editing it. Preserve the `/open`, `/handling`, `/mail`, `/ms`, and other static route behavior.

```bash
scp server/deploy/coin-im-market.service server/deploy/coin-im-market-reconcile.service server/deploy/coin-im-market-reconcile.timer server/deploy/coin-im-market-proxy.conf server/deploy/nginx-market-locations.conf iva:/tmp/
ssh iva 'set -e; sudo install -o root -g root -m 644 /tmp/coin-im-market.service /etc/systemd/system/coin-im-market.service; sudo install -o root -g root -m 644 /tmp/coin-im-market-reconcile.service /etc/systemd/system/coin-im-market-reconcile.service; sudo install -o root -g root -m 644 /tmp/coin-im-market-reconcile.timer /etc/systemd/system/coin-im-market-reconcile.timer; sudo install -o root -g root -m 644 /tmp/coin-im-market-proxy.conf /etc/nginx/snippets/coin-im-market-proxy.conf; sudo install -o root -g root -m 644 /tmp/nginx-market-locations.conf /etc/nginx/snippets/coin-im-market-locations.conf; sudo systemctl daemon-reload; sudo systemctl enable --now coin-im-market-reconcile.timer; sudo nginx -t; sudo systemctl reload nginx'
```

Keep `TAKEOVER_MARKET_ENABLED=false` until all real TronGrid fields pass `verify-environment --production`. Never use `TRON_PROVIDER=mock` with `SITE_URL=https://coin.im`.

## Required Verification

Nginx has exact `/handling` and `/handling/` locations that add `Referrer-Policy: no-referrer`. Preserve those locations when editing `/etc/nginx/conf.d/coin.im.conf`.

Verify after every deploy:

```bash
python3 - <<'PY'
from urllib.request import Request, urlopen

urls = [
    "https://coin.im/",
    "https://coin.im/takeover",
    "https://coin.im/archive",
    "https://coin.im/stats",
    "https://coin.im/rules",
    "https://coin.im/api/market/health",
    "https://coin.im/ru",
    "https://coin.im/es",
    "https://coin.im/mail",
    "https://coin.im/mail/",
    "https://coin.im/ms",
    "https://coin.im/msru",
    "https://coin.im/handling",
    "https://coin.im/open",
    "https://coin.im/api/open/health",
    "https://coin.im/assets/base.css",
    "https://coin.im/assets/home.css",
    "https://coin.im/styles.css",
    "https://coin.im/robots.txt",
    "https://coin.im/sitemap.xml",
    "https://www.coin.im/",
]

for url in urls:
    req = Request(url, headers={"User-Agent": "coin-im-deploy-check"})
    with urlopen(req, timeout=15) as r:
        print(url, r.status, r.headers.get("server"), r.geturl(), r.headers.get("content-type"))
PY
```

Also verify the active release and certificate:

```bash
ssh iva 'readlink -f /var/www/coin.im/current; readlink -f /opt/coin-im-market/current; systemctl is-active nginx coin-im-market coin-im-open; sudo nginx -t; sudo certbot certificates'
```

Run the market read-only reconciliation and public smoke after deployment:

```bash
ssh iva 'sudo -u coinmarket /usr/local/bin/coin-market verify-environment --production; sudo -u coinmarket /usr/local/bin/coin-market reconcile-reigns; sudo -u coinmarket /usr/local/bin/coin-market production-smoke'
```

Update `VERSIONS.md` after a successful deploy:

- current local version
- active VPS release path
- public HTTPS checks
- any changed CSS cache keys

## Prompt For Other Codex Sessions

Use this prompt when another session needs to deploy the current site:

```text
Read AGENTS.md, PROJECT_SPEC.md, VERSIONS.md, and DEPLOY.md first.

Deploy the current coin.im static site to the VPS.

Use host `iva` and create a clean release under `/var/www/coin.im/releases/<timestamp>`.
Deploy only the production static files listed in DEPLOY.md.
Switch `/var/www/coin.im/current` to the new release with a symlink.
Run `sudo nginx -t` and reload Nginx.
Verify `https://coin.im/`, `/mail`, `/mail/`, `/ru`, `/es`, `/ms`, `/msru`, `/handling`, `/open`, `/api/open/health`, CSS assets, `robots.txt`, `sitemap.xml`, and `https://www.coin.im/`.
Do not touch MX, TXT, SRV, DKIM, DMARC, or DNS unless I explicitly ask.
Update VERSIONS.md with the new active release and verification results.
```
