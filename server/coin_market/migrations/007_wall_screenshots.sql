ALTER TABLE messages ADD COLUMN screenshot_blob BLOB;

ALTER TABLE messages ADD COLUMN screenshot_mime TEXT;

ALTER TABLE payment_intents ADD COLUMN screenshot_blob BLOB;

ALTER TABLE payment_intents ADD COLUMN screenshot_mime TEXT;
