# Project Rules

- Start by reading `PROJECT_SPEC.md`, `VERSIONS.md`, and `DEPLOY.md` if they exist.
- Do not deploy, publish, push, or change production unless the current user message explicitly authorizes that action.
- Production is the VPS release flow in `DEPLOY.md`.
- Do not change DNS, MX, TXT, SRV, DKIM, DMARC, or mail routing without a separate explicit command.
- Keep route mirrors byte-identical: `ms.html` with `ms/index.html`, `handling.html` with `handling/index.html`, and `open.html` with `open/index.html`.
- Preserve unrelated and parallel-session changes. Do not use destructive Git commands to create or restore a checkpoint.
- After a production deploy or Git checkpoint, update `VERSIONS.md` with the exact release or tag and the verified state.
- Do not add badges, eyebrow labels, small section labels, or standalone numeric chips unless the user explicitly asks for them.
- Do not add visible story-part numerals such as `01`, `02`, `03`, `04`, or `05`; use section headings and spacing instead unless the user explicitly asks for numbered markers.
- Never add decorative or technical-term badge lists, pills, or chips such as “Entity discovery,” “Role mapping,” or similar AI-generated taxonomy. Put essential meaning into clear body copy instead.
- Do not use long dash characters, en dash characters, or arrow symbols in Russian or English site text. Use periods, commas, or colons instead.
- Do not use bold or heavy font weights on the site. Keep typography thin, readable, well-spaced, and calm; use spacing, size, and color instead of boldness for hierarchy.
- For small text/content edits, do not run browser checks or verification unless the user explicitly asks to check.
- Optimize site images to practical web sizes before use; keep each image at or below 700 KB unless the user explicitly asks otherwise.
- Treat `qa-screens/` as generated local evidence. Do not add it to Git unless the user explicitly asks to archive screenshots.
