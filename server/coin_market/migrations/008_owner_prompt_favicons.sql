ALTER TABLE messages ADD COLUMN favicon_blob BLOB;

ALTER TABLE messages ADD COLUMN favicon_mime TEXT;

ALTER TABLE payment_intents ADD COLUMN favicon_blob BLOB;

ALTER TABLE payment_intents ADD COLUMN favicon_mime TEXT;

INSERT INTO messages
    (slug, message, signature, location, url, cta_label, status, created_at, wall_slot_number)
SELECT
    'owner-website-20260901',
    'Каждое слово здесь куплено. Не за лайки. Не за просмотры. За настоящие деньги. И это меняет всё.' || char(10) || char(10) ||
    'Coin.im не доска объявлений. Это стена, где слова имеют цену. Хочешь сказать миру что-то важное, плати. Хочешь промолчать, плати дороже.' || char(10) || char(10) ||
    'Три слота. Три способа быть услышанным. Сайт. Соцсеть. Сообщение. Каждый следующий стоит на 1 USDT больше предыдущего. Просто, как правило хорошего тона: если ты говоришь последним, говори лучше всех.' || char(10) || char(10) ||
    'Здесь нет SEO. Нет алгоритмов. Есть только ты, твои слова и цена, которую ты готов за них заплатить.' || char(10) || char(10) ||
    'Добро пожаловать на единственную площадку, где честность стоит ровно столько, сколько написано на кнопке.',
    'Coin.im. Стена, где слова имеют цену.',
    '',
    'https://coin.im/',
    'Открыть coin.im',
    'published',
    '2026-09-01T00:00:00Z',
    1
WHERE NOT EXISTS (SELECT 1 FROM messages WHERE slug = 'owner-website-20260901')
  AND EXISTS (
      SELECT 1 FROM reigns r JOIN messages m ON m.id = r.message_id
      WHERE r.id = (
          SELECT latest.id FROM reigns latest JOIN messages current ON current.id = latest.message_id
          WHERE current.wall_slot_number = 1 ORDER BY latest.started_at DESC, latest.id DESC LIMIT 1
      )
        AND m.slug = 'pen-dev-wall-seed' AND r.takeover_payment_id IS NULL
  );

INSERT INTO messages
    (slug, message, signature, location, url, cta_label, status, created_at, wall_slot_number)
SELECT
    'owner-social-20260901',
    'Майами не город. Это фильтр.' || char(10) || char(10) ||
    'Проходят только те, кто не боится солнца в лицо и правды в кадре.' || char(10) || char(10) ||
    'Я снимаю не контент. Я снимаю жизнь без купюр: пляжи, перелёты, четыре утра в чужих часовых поясах. Без сценария. Без команды. Без притворства.' || char(10) || char(10) ||
    '312 подписчиков? Нет. 312 свидетелей.' || char(10) || char(10) ||
    'Если вам надоели идеальные картинки из Pinterest, добро пожаловать. Здесь песок в волосах и настоящий загар.' || char(10) || char(10) ||
    'Instagram: @adrieves19. Не для всех. Только для тех, кто ещё верит, что красота это не фильтр.',
    '312 подписчиков',
    'instagram',
    'https://www.instagram.com/adrieves19/',
    'Открыть в Instagram',
    'published',
    '2026-09-01T00:00:00Z',
    2
WHERE NOT EXISTS (SELECT 1 FROM messages WHERE slug = 'owner-social-20260901')
  AND EXISTS (
      SELECT 1 FROM reigns r JOIN messages m ON m.id = r.message_id
      WHERE r.id = (
          SELECT latest.id FROM reigns latest JOIN messages current ON current.id = latest.message_id
          WHERE current.wall_slot_number = 2 ORDER BY latest.started_at DESC, latest.id DESC LIMIT 1
      )
        AND m.slug = 'midnightdrafter-wall-seed' AND r.takeover_payment_id IS NULL
  );

INSERT INTO messages
    (slug, message, signature, location, url, cta_label, status, created_at, wall_slot_number)
SELECT
    'owner-message-20260901',
    'Большинство интернета написано, чтобы его пролистали.' || char(10) || char(10) ||
    'Я заплатил за эти слова реальные деньги и не оставил ни ссылки, ни продукта, ни имени.' || char(10) || char(10) ||
    'Если вы дочитали до сюда, вы всё ещё читаете. Сохраните эту привычку. Она окупается лучше большинства навыков.' || char(10) || char(10) ||
    'Мы привыкли, что внимание бесплатно. Что можно кричать в пустоту и ждать эха. Но эхо не отвечает. Эхо только повторяет.' || char(10) || char(10) ||
    'Когда вы платите за слово, оно обретает вес. Когда вы убираете ссылку, оно обретает смысл.' || char(10) || char(10) ||
    'Это не реклама. Это не контент. Это просто сообщение от человека, который решил, что некоторые вещи стоят того, чтобы о них сказать, даже если никто не кликнет.' || char(10) || char(10) ||
    'Читайте дальше. Или не читайте. Но перестаньте скроллить.',
    '',
    '',
    '',
    '',
    'published',
    '2026-09-01T00:00:00Z',
    3
WHERE NOT EXISTS (SELECT 1 FROM messages WHERE slug = 'owner-message-20260901')
  AND EXISTS (
      SELECT 1 FROM reigns r JOIN messages m ON m.id = r.message_id
      WHERE r.id = (
          SELECT latest.id FROM reigns latest JOIN messages current ON current.id = latest.message_id
          WHERE current.wall_slot_number = 3 ORDER BY latest.started_at DESC, latest.id DESC LIMIT 1
      )
        AND m.slug = 'on-silence-wall-seed' AND r.takeover_payment_id IS NULL
  );

INSERT INTO reigns
    (public_id, message_id, previous_reign_id, status, started_at, display_at,
     protection_until, ended_at, ended_reason, takeover_payment_id, initial_amount_micro, created_at)
SELECT
    'reign_ownerprompt01', owner.id, previous.id, 'ended',
    '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z',
    '2026-09-01T00:00:00Z', NULL, '', NULL,
    previous.initial_amount_micro, '2026-09-01T00:00:00Z'
FROM messages owner
JOIN reigns previous ON previous.id = (
    SELECT r.id FROM reigns r JOIN messages m ON m.id = r.message_id
    WHERE m.wall_slot_number = 1 AND m.slug != owner.slug
    ORDER BY r.started_at DESC, r.id DESC LIMIT 1
)
WHERE owner.slug = 'owner-website-20260901'
  AND NOT EXISTS (SELECT 1 FROM reigns WHERE public_id = 'reign_ownerprompt01');

INSERT INTO reigns
    (public_id, message_id, previous_reign_id, status, started_at, display_at,
     protection_until, ended_at, ended_reason, takeover_payment_id, initial_amount_micro, created_at)
SELECT
    'reign_ownerprompt02', owner.id, previous.id, 'ended',
    '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z',
    '2026-09-01T00:00:00Z', NULL, '', NULL,
    previous.initial_amount_micro, '2026-09-01T00:00:00Z'
FROM messages owner
JOIN reigns previous ON previous.id = (
    SELECT r.id FROM reigns r JOIN messages m ON m.id = r.message_id
    WHERE m.wall_slot_number = 2 AND m.slug != owner.slug
    ORDER BY r.started_at DESC, r.id DESC LIMIT 1
)
WHERE owner.slug = 'owner-social-20260901'
  AND NOT EXISTS (SELECT 1 FROM reigns WHERE public_id = 'reign_ownerprompt02');

INSERT INTO reigns
    (public_id, message_id, previous_reign_id, status, started_at, display_at,
     protection_until, ended_at, ended_reason, takeover_payment_id, initial_amount_micro, created_at)
SELECT
    'reign_ownerprompt03', owner.id, previous.id, 'ended',
    '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z',
    '2026-09-01T00:00:00Z', NULL, '', NULL,
    previous.initial_amount_micro, '2026-09-01T00:00:00Z'
FROM messages owner
JOIN reigns previous ON previous.id = (
    SELECT r.id FROM reigns r JOIN messages m ON m.id = r.message_id
    WHERE m.wall_slot_number = 3 AND m.slug != owner.slug
    ORDER BY r.started_at DESC, r.id DESC LIMIT 1
)
WHERE owner.slug = 'owner-message-20260901'
  AND NOT EXISTS (SELECT 1 FROM reigns WHERE public_id = 'reign_ownerprompt03');

UPDATE reigns
SET ended_at = COALESCE(ended_at, '2026-09-01T00:00:00Z'),
    ended_reason = CASE WHEN ended_reason IS NULL OR ended_reason = '' THEN 'owner_publication' ELSE ended_reason END
WHERE id IN (
    SELECT previous_reign_id FROM reigns
    WHERE public_id IN ('reign_ownerprompt01', 'reign_ownerprompt02', 'reign_ownerprompt03')
);

INSERT INTO admin_audit (action, target, note, created_at)
SELECT 'owner_publication', 'wall:1,2,3', 'Attached owner prompt published without an on-chain payment.',
       '2026-09-01T00:00:00Z'
WHERE NOT EXISTS (
    SELECT 1 FROM admin_audit WHERE action = 'owner_publication' AND target = 'wall:1,2,3'
)
  AND (SELECT COUNT(*) FROM messages WHERE slug IN (
      'owner-website-20260901', 'owner-social-20260901', 'owner-message-20260901'
  )) = 3;
