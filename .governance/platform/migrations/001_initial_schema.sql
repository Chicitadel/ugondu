CREATE TABLE IF NOT EXISTS evidence (
    identity VARCHAR(64) PRIMARY KEY,
    build_identity VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_build_identity ON evidence(build_identity);
