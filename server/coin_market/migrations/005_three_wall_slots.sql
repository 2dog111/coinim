ALTER TABLE messages ADD COLUMN wall_slot_number INTEGER CHECK (wall_slot_number BETWEEN 1 AND 3);

ALTER TABLE payment_intents ADD COLUMN wall_slot_number INTEGER CHECK (wall_slot_number BETWEEN 1 AND 3);

CREATE INDEX IF NOT EXISTS messages_wall_slot
ON messages(wall_slot_number, created_at);

CREATE INDEX IF NOT EXISTS payment_intents_wall_slot
ON payment_intents(wall_slot_number, created_at);

INSERT INTO messages
    (slug, message, signature, location, url, cta_label, status, created_at, wall_slot_number)
SELECT
    'pen-dev-wall-seed',
    'pen.dev is a quiet little tool that lets you draw interfaces freehand and lands them straight in your editor as clean code. No export hell, no redrawing — what you sketch is what you ship. Two minutes in, and you will wonder why design tools ever needed forty panels.',
    '',
    'today, 14:32 UTC',
    'https://www.pen.dev/',
    'pen.dev ↗',
    'published',
    '2026-01-01T00:03:00+00:00',
    1
WHERE NOT EXISTS (SELECT 1 FROM messages WHERE wall_slot_number = 1);

INSERT INTO messages
    (slug, message, signature, location, url, cta_label, status, created_at, wall_slot_number)
SELECT
    'midnightdrafter-wall-seed',
    'I am not an influencer. 312 followers, and half of them are probably bots. Every Sunday I write one letter about leaving the corporate treadmill — the slow, unglamorous version nobody posts about. No growth hacks, no threads about threads. If you are tired of loud people, my quiet corner is here.',
    '312 followers',
    'today, 11:07 UTC',
    'https://x.com/midnightdrafter',
    'x.com/midnightdrafter ↗',
    'published',
    '2026-01-01T00:02:00+00:00',
    2
WHERE NOT EXISTS (SELECT 1 FROM messages WHERE wall_slot_number = 2);

INSERT INTO messages
    (slug, message, signature, location, url, cta_label, status, created_at, wall_slot_number)
SELECT
    'on-silence-wall-seed',
    'Most of what the internet says today was written to be scrolled past. This page is different: somebody paid real money for these words and still asked for nothing. No link, no product, no name.\n\nIf you are reading this sentence to the end, you are the rarest kind of visitor — the one who still reads. Keep that habit. It will pay you better than most skills you own.',
    'no name, no link. that was the point.',
    'today, 09:18 UTC',
    'https://x.com/intent/post?text=Most%20of%20what%20the%20internet%20says%20today%20was%20written%20to%20be%20scrolled%20past.%20This%20page%20is%20different%20%E2%80%94%20coin.im',
    'quote this on x ↗',
    'published',
    '2026-01-01T00:01:00+00:00',
    3
WHERE NOT EXISTS (SELECT 1 FROM messages WHERE wall_slot_number = 3);

INSERT INTO reigns
    (public_id, message_id, previous_reign_id, status, started_at, display_at,
     protection_until, ended_at, ended_reason, takeover_payment_id, initial_amount_micro, created_at)
SELECT
    'reign_wallseed0001', id, NULL, 'ended', '2026-01-01T00:03:00+00:00',
    '2026-01-01T00:03:00+00:00', '2026-01-01T00:03:00+00:00', NULL, '', NULL,
    14000000, '2026-01-01T00:03:00+00:00'
FROM messages
WHERE wall_slot_number = 1
  AND NOT EXISTS (SELECT 1 FROM reigns WHERE public_id = 'reign_wallseed0001');

INSERT INTO reigns
    (public_id, message_id, previous_reign_id, status, started_at, display_at,
     protection_until, ended_at, ended_reason, takeover_payment_id, initial_amount_micro, created_at)
SELECT
    'reign_wallseed0002', id, NULL, 'ended', '2026-01-01T00:02:00+00:00',
    '2026-01-01T00:02:00+00:00', '2026-01-01T00:02:00+00:00', NULL, '', NULL,
    12000000, '2026-01-01T00:02:00+00:00'
FROM messages
WHERE wall_slot_number = 2
  AND NOT EXISTS (SELECT 1 FROM reigns WHERE public_id = 'reign_wallseed0002');

INSERT INTO reigns
    (public_id, message_id, previous_reign_id, status, started_at, display_at,
     protection_until, ended_at, ended_reason, takeover_payment_id, initial_amount_micro, created_at)
SELECT
    'reign_wallseed0003', id, NULL, 'ended', '2026-01-01T00:01:00+00:00',
    '2026-01-01T00:01:00+00:00', '2026-01-01T00:01:00+00:00', NULL, '', NULL,
    10000000, '2026-01-01T00:01:00+00:00'
FROM messages
WHERE wall_slot_number = 3
  AND NOT EXISTS (SELECT 1 FROM reigns WHERE public_id = 'reign_wallseed0003');
