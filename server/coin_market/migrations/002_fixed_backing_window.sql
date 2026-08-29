CREATE INDEX IF NOT EXISTS payments_reign_backing_window
ON payments(reign_id, power_expires_at, confirmed_at);

CREATE INDEX IF NOT EXISTS metric_visitors_reader_window
ON metric_visitors(kind, created_at, visitor_hash);
