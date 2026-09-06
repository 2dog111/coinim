# Project Rules

- Start by reading `PROJECT_SPEC.md`, `VERSIONS.md`, and `DEPLOY.md` if they exist.
- Do not deploy, publish, push, or change production unless the current user message explicitly authorizes that action.
- The product has no separate `demo`, `test`, `seed`, `manual`, or `real` placement classes. Treat every published website, social profile, or message as an ordinary real public placement unless the user explicitly requests a draft or test state.
- A direct instruction from the owner to publish or place specific content is sufficient publication authority even when the site has no corresponding payment or TRON transaction. Payment may have been settled through another channel. Do not require, fabricate, or imply an on-chain receipt; publish the content normally and use only price or payment facts the user explicitly supplies.
- Production is the VPS release flow in `DEPLOY.md`.
- Do not change DNS, MX, TXT, SRV, DKIM, DMARC, or mail routing without a separate explicit command.
- Keep route mirrors byte-identical: `mail.html` with `mail/index.html`, `ms.html` with `ms/index.html`, `handling.html` with `handling/index.html`, and `open.html` with `open/index.html`.
- Preserve unrelated and parallel-session changes. Do not use destructive Git commands to create or restore a checkpoint.
- After a production deploy or Git checkpoint, update `VERSIONS.md` with the exact release or tag and the verified state.
- Do not add badges, eyebrow labels, small section labels, or standalone numeric chips unless the user explicitly asks for them.
- Do not add visible story-part numerals such as `01`, `02`, `03`, `04`, or `05`; use section headings and spacing instead unless the user explicitly asks for numbered markers.
- Never add decorative or technical-term badge lists, pills, or chips such as “Entity discovery,” “Role mapping,” or similar AI-generated taxonomy. Put essential meaning into clear body copy instead.
- Do not use long dash characters, en dash characters, or arrow symbols in Russian or English site text. Use periods, commas, or colons instead.
- Write monetary amounts with digits and the currency symbol, for example `$20,196`, `$99 в месяц`, or `¥80`. Do not spell out prices or currency amounts in words. Generic nouns such as `деньги`, `рубли`, or `доллар` may remain when no amount is stated.
- Do not pad a reason with a false contrast such as `Не потому, что... Потому что...` or `Not because... Because...`. State the actual reason directly unless both sides of the contrast carry necessary facts.
- Do not use bold or heavy font weights on the site. Keep typography thin, readable, well-spaced, and calm; use spacing, size, and color instead of boldness for hierarchy.
- For small text or content edits, run the project's static checks and the global `desktop-browser-qa` headless Chromium smoke at `390x844` and `1440x900`. Do not use the user's ordinary Chrome.
- Optimize site images to practical web sizes before use; keep each image at or below 700 KB unless the user explicitly asks otherwise.
- Treat `qa-screens/` as generated local evidence. Do not add it to Git unless the user explicitly asks to archive screenshots.

## Защищённые тексты главной

- Главная услуги находится в `index.html`. Не путать её с `/message`, `/mail`, `/ru` или `/ms`. Ссылки на Message wall и старую `/mail` не возвращать на главную без новой прямой команды владельца.
- Раздел Market Scan на главной (`#market-scan`) не сокращать, не заменять кратким пересказом и не редактировать стилистически. Никогда не применять к нему `$anton` или другие текстовые skills. Только минимальная точечная фактическая/техническая правка по отдельной явной инструкции, с сохранением остального текста.
- Все пять собственных примеров продающих писем и пять исторических примеров на главной неприкосновенны. Не удалять, не заменять новым образцом, не сокращать, не оттачивать и не переписывать никаким скиллом. Сохранять тексты, цитаты, атрибуцию и ссылки. Не скрывать или убирать существующие примеры из вывода по общему редакторскому заданию.
- Общий промпт об улучшении, сокращении, устранении повторов, единообразии `we` или редизайне не отменяет эти исключения. При конфликте выполнять остальные части задания, а защищённые блоки оставлять без изменений.
- Перед правками главной снимать контрольные хеши разделов `#market-scan`, `#letters` и `#classic-letters`; после правок сравнивать. Хеши защищают текущую согласованную редакцию. Не восстанавливать произвольную старую версию и не переписывать оригинальные корпуса.
- При редакторской работе сохранять цену, объём, географию, контакты, изображения и атрибуцию, существенные условия вручения, поля и обработчики действующей формы. Вручение, прочтение и ответ не подменять друг другом.
- Не менять CRM, платёжную систему, обработку заявок, другие продуктовые маршруты, зависимости и дизайн-систему ради правки текста. Готовые английские формулировки владельца вставлять без литературной переработки, кроме явно защищённых выше блоков.
- Не добавлять юридические тексты от себя. Если владелец предоставил точную формулировку для конкретного места, использовать только её; сохранять действующие правила обращения с файлами и функциональные согласия.
