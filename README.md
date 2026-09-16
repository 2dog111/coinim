# coin.im

Source for the coin.im website, Market Scan pages, encrypted enquiry intake and
message-wall backend. The current site uses static HTML/CSS/JavaScript, Python
ASGI services, Nginx and systemd. Production release history is in [VERSIONS.md](VERSIONS.md).

## Local preview

Requires Python 3.11 or newer. Node.js is used for JavaScript checks and calculators.

```sh
git clone https://github.com/2dog111/coinim.git
cd coinim
python3.12 -m venv .venv
.venv/bin/pip install -r server/requirements.txt
.venv/bin/python scripts/preview.py
```

Open http://127.0.0.1:4173. The preview uses temporary local enquiry storage and
does not send enquiries to production. Stop it with Ctrl+C.

## Checks

```sh
.venv/bin/pip install -r server/requirements-market.txt
npm run lint
npm run typecheck
npm test
```

`COIN_PYTHON` can select another Python environment for these npm commands.
Browser checks in `scripts/qa-ms-campaign.cjs` require Playwright with Chromium
and WebKit and a separate local preview on port 4174.

## Project instructions

- [AGENTS.md](AGENTS.md): rules for changes and protected content.
- [PROJECT_SPEC.md](PROJECT_SPEC.md): current contracts and historical context.
- [MS_CHANGE_REPORT.md](MS_CHANGE_REPORT.md): Market Scan integration and checks.
- [DEPLOY.md](DEPLOY.md): existing VPS release procedure.

Publishing source to GitHub does not deploy the website. Production requires an
explicit owner instruction. Keep credentials, enquiry data, local environments
and generated QA screenshots outside Git.
