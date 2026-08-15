# coin.im VPS Deploy

Production is served from the VPS, not from the Cloudflare Worker.

- Host: `iva`
- IP: `193.181.215.57`
- Web root symlink: `/var/www/coin.im/current`
- Release directory: `/var/www/coin.im/releases/<timestamp>`
- Nginx config: `/etc/nginx/conf.d/coin.im.conf`
- Public URLs: `https://coin.im/`, `https://www.coin.im/`
- DNS: Cloudflare DNS-only `A` records for `coin.im` and `www.coin.im` to `193.181.215.57`
- TLS: Let's Encrypt certificate for `coin.im` and `www.coin.im`, renewed by certbot

Do not deploy with Wrangler or Cloudflare Workers unless the user explicitly asks to restore the old Worker path.

## Files To Deploy

Use a clean temporary directory. Include only:

- `index.html`
- `ru.html`
- `es.html`
- `ai.html`
- `s.html`
- `ms.html`
- `ms/index.html`
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

Do not copy audit files, screenshots, `.wrangler/`, scripts, git metadata, or local notes.

## Deploy Commands

Run from the repository root.

```bash
tmp=$(mktemp -d /tmp/coin-im-release.XXXXXX)
mkdir -p "$tmp/ms" "$tmp/handling" "$tmp/open"
rsync -a index.html ru.html es.html ai.html s.html ms.html handling.html open.html llms.txt styles.css ms.css robots.txt sitemap.xml assets "$tmp/"
rsync -a ms/index.html "$tmp/ms/index.html"
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

## Required Verification

Nginx has exact `/handling` and `/handling/` locations that add `Referrer-Policy: no-referrer`. Preserve those locations when editing `/etc/nginx/conf.d/coin.im.conf`.

Verify after every deploy:

```bash
python3 - <<'PY'
from urllib.request import Request, urlopen

urls = [
    "https://coin.im/",
    "https://coin.im/ru",
    "https://coin.im/es",
    "https://coin.im/ms",
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
ssh iva 'readlink -f /var/www/coin.im/current; systemctl is-active nginx; sudo nginx -t; sudo certbot certificates'
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

Deploy the current coin.im static site to the VPS, not to Cloudflare Workers.

Use host `iva` and create a clean release under `/var/www/coin.im/releases/<timestamp>`.
Deploy only the production static files listed in DEPLOY.md.
Switch `/var/www/coin.im/current` to the new release with a symlink.
Run `sudo nginx -t` and reload Nginx.
Verify `https://coin.im/`, `/ru`, `/es`, `/ms`, `/handling`, `/open`, `/api/open/health`, CSS assets, `robots.txt`, `sitemap.xml`, and `https://www.coin.im/`.
Do not touch MX, TXT, SRV, DKIM, DMARC, Cloudflare Worker routes, or DNS unless I explicitly ask.
Do not use `wrangler deploy`.
Update VERSIONS.md with the new active release and verification results.
```
