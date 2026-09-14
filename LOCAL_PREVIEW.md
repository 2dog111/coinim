# Local homepage preview

The second iteration is now current. See CHANGE_REPORT.md. The first-pass checks
below are historical; use `scripts/qa-evidence.cjs` for the current form and UI.
The website field is now mandatory and domains without a scheme normalize to HTTPS.
The original Python environment is still preserved; use `COIN_PYTHON` with npm
scripts to select `/tmp/coin-im-qa-env/bin/python` in this session.

The current homepage implements the owner's Pilot / Scale brief in `reference/brief.txt`.
It is based on the existing `index.html` at Git baseline `81f219c`, not a replacement application.
No source was pushed and no deployment was performed.

Use Python 3.11 or newer. The imported `.venv` uses Python 3.9 and is preserved.

```sh
python3.12 -m venv /tmp/coin-im-preview-env
/tmp/coin-im-preview-env/bin/pip install -r server/requirements.txt
/tmp/coin-im-preview-env/bin/python scripts/preview.py
```

Open http://127.0.0.1:4173. The preview runs the existing intake API with its own
temporary encryption key and storage. Submitted enquiries stay on this computer;
the preview does not contact production or notify anyone externally. Local enquiry
files are removed when the preview exits normally. This is a preview, not a place
to collect customer enquiries. Keep the terminal process running to use it.

The current session uses `/tmp/coin-im-qa-env/bin/python scripts/preview.py`.

## Implemented scope

- The exact two offers appear after the hero and near the final form: 1,000 letters
  for $3,800 ($3.80 each), and 10,000 letters for $30,000 ($3.00 each).
- Hero, three-step mechanism, contrast section, seven hooks, five sample letters,
  historical offer sentence, final CTA and metadata follow the supplied brief.
- Existing grabber images precede deep research. Every original Market Scan
  paragraph remains; topic disclosures keep the development material out of the
  initial reading flow. The separate Market Scan page is unchanged.
- Other existing copy, cities, contacts and operational claims are preserved.
- All campaign CTAs lead to the final form. The website field uses the existing
  intake URL validation and encrypted storage; the existing admin already displays
  it. Older forms without website keep their previous retry fingerprint.
- No new evidence, customers, performance numbers, guarantees or visuals were invented.

## Verification

- Seven intake tests and 38 existing market tests pass under Python 3.12.
- JS syntax, Python static checks, legacy `/mail` copy lock and Git whitespace checks pass.
- Isolated headless Chromium checks pass at 375, 390, 393, 430, 768, 1024, 1440 and
  1920 pixels: no overflow, broken images or unexpected HTTP/page errors.
- At 390×844 and 1440×900: all research and letter disclosures, CTA anchors,
  required fields, channel selection, failed-send recovery and real local encrypted
  submission pass. No production enquiry was submitted.
- Original paragraphs outside explicitly replaced copy remain unchanged; all five
  letter bodies match the owner's brief. `/mail`, `/ms`, `/open` and `/handling`
  mirrors are byte-identical.
- Generated screenshots and browser results are in `qa-screens/pilot-scale/`, ignored by Git.

The historical `desktop-browser-qa` skill referenced by AGENTS.md is not present
on this computer. Equivalent isolated headless checks are in `scripts/qa-homepage.cjs`;
they require Playwright and its Chromium browser. No ordinary Chrome profile is used.
