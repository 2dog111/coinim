CREATE TABLE IF NOT EXISTS payment_credits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_id INTEGER NOT NULL UNIQUE REFERENCES payments(id),
    amount_micro INTEGER NOT NULL CHECK (amount_micro > 0),
    status TEXT NOT NULL CHECK (status IN ('available', 'applied', 'refunded')),
    reason TEXT NOT NULL,
    created_at TEXT NOT NULL,
    applied_at TEXT
);

CREATE INDEX IF NOT EXISTS payment_credits_status
ON payment_credits(status, created_at);
