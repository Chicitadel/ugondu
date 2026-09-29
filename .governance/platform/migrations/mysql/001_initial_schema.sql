CREATE TABLE IF NOT EXISTS evidence (
    identity VARCHAR(64) PRIMARY KEY,
    build_identity VARCHAR(64) NOT NULL,
    payload JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_evidence_build_identity ON evidence(build_identity);
