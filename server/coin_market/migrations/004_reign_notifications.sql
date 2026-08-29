CREATE TABLE IF NOT EXISTS reign_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reign_id INTEGER NOT NULL REFERENCES reigns(id),
    contact_type TEXT NOT NULL CHECK (contact_type IN ('email', 'telegram')),
    contact_value TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'sent', 'failed', 'cancelled')),
    created_at TEXT NOT NULL,
    sent_at TEXT,
    last_error TEXT,
    UNIQUE (reign_id, contact_type, contact_value)
);

CREATE INDEX IF NOT EXISTS reign_notifications_active
ON reign_notifications(reign_id, status);
