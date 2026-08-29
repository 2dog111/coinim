PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    message TEXT NOT NULL,
    signature TEXT,
    location TEXT,
    url TEXT,
    cta_label TEXT,
    status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'hidden')),
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT NOT NULL UNIQUE,
    message_id INTEGER NOT NULL REFERENCES messages(id),
    previous_reign_id INTEGER REFERENCES reigns(id),
    status TEXT NOT NULL CHECK (status IN ('active', 'ended', 'moderated')),
    started_at TEXT NOT NULL,
    display_at TEXT NOT NULL,
    protection_until TEXT NOT NULL,
    ended_at TEXT,
    ended_reason TEXT,
    takeover_payment_id INTEGER,
    initial_amount_micro INTEGER NOT NULL CHECK (initial_amount_micro >= 0),
    created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS one_active_reign
ON reigns(status) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS payment_intents (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('takeover', 'defend')),
    current_reign_id INTEGER REFERENCES reigns(id),
    target_message_id INTEGER REFERENCES messages(id),
    draft_message TEXT,
    draft_signature TEXT,
    draft_location TEXT,
    draft_url TEXT,
    draft_cta_label TEXT,
    quoted_amount_micro INTEGER,
    requested_amount_micro INTEGER NOT NULL CHECK (requested_amount_micro > 0),
    quote_expires_at TEXT,
    secret_token_hash TEXT NOT NULL UNIQUE,
    submitted_txid TEXT,
    status TEXT NOT NULL CHECK (status IN (
        'created', 'payment_found', 'confirmed', 'expired', 'underpaid',
        'failed', 'requires_review', 'cancelled'
    )),
    visitor_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    confirmed_at TEXT
);

CREATE INDEX IF NOT EXISTS payment_intents_status ON payment_intents(status, created_at);
CREATE INDEX IF NOT EXISTS payment_intents_visitor ON payment_intents(visitor_hash, created_at);

CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    intent_id TEXT NOT NULL UNIQUE REFERENCES payment_intents(id),
    reign_id INTEGER REFERENCES reigns(id),
    message_id INTEGER REFERENCES messages(id),
    type TEXT NOT NULL CHECK (type IN ('takeover', 'defend')),
    txid TEXT NOT NULL,
    event_index INTEGER NOT NULL,
    amount_micro INTEGER NOT NULL CHECK (amount_micro > 0),
    contract_address TEXT NOT NULL,
    receiving_address TEXT NOT NULL,
    confirmed_at TEXT NOT NULL,
    power_expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE (txid, event_index)
);

CREATE INDEX IF NOT EXISTS payments_reign ON payments(reign_id, confirmed_at);

CREATE TABLE IF NOT EXISTS takeover_locks (
    current_reign_key TEXT PRIMARY KEY,
    current_reign_id INTEGER REFERENCES reigns(id),
    intent_id TEXT NOT NULL UNIQUE REFERENCES payment_intents(id),
    expires_at TEXT NOT NULL,
    found_transaction_at TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS result_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('takeover', 'defend', 'completed')),
    reign_id INTEGER NOT NULL REFERENCES reigns(id),
    message_id INTEGER NOT NULL REFERENCES messages(id),
    payment_id INTEGER REFERENCES payments(id),
    previous_reign_id INTEGER REFERENCES reigns(id),
    snapshot_json TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS metric_visitors (
    day_utc TEXT NOT NULL,
    reign_id INTEGER,
    visitor_hash TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('visit', 'reader', 'share_arrival')),
    created_at TEXT NOT NULL,
    PRIMARY KEY (day_utc, reign_id, visitor_hash, kind)
);

CREATE TABLE IF NOT EXISTS message_metrics_daily (
    date_utc TEXT NOT NULL,
    message_id INTEGER NOT NULL REFERENCES messages(id),
    reign_id INTEGER,
    unique_visitors INTEGER NOT NULL DEFAULT 0,
    verified_readers INTEGER NOT NULL DEFAULT 0,
    outbound_clicks INTEGER NOT NULL DEFAULT 0,
    countries_count INTEGER NOT NULL DEFAULT 0,
    share_arrivals INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (date_utc, message_id, reign_id)
);

CREATE TABLE IF NOT EXISTS metric_countries (
    date_utc TEXT NOT NULL,
    reign_id INTEGER NOT NULL REFERENCES reigns(id),
    country_code TEXT NOT NULL,
    PRIMARY KEY (date_utc, reign_id, country_code)
);

CREATE TABLE IF NOT EXISTS metric_sources (
    date_utc TEXT NOT NULL,
    source TEXT NOT NULL,
    device_class TEXT NOT NULL,
    os_family TEXT NOT NULL,
    visitors INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (date_utc, source, device_class, os_family)
);

CREATE TABLE IF NOT EXISTS outbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    idempotency_key TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    attempts INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TEXT NOT NULL,
    last_error TEXT,
    created_at TEXT NOT NULL,
    completed_at TEXT
);

CREATE TABLE IF NOT EXISTS live_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reign_id INTEGER,
    type TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL
);
