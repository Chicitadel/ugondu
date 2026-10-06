const { Pool } = require('pg');
const { EvidenceStore } = require('./store');

class PostgresStore extends EvidenceStore {
    constructor(connectionString) {
        super();
        this.pool = new Pool({
            connectionString: connectionString || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres'
        });
    }

    async save(identity, record) {
        // Add a lifecycle state if not present (Append-Only Event Log)
        if (!record.lifecycleEvents) {
            record.lifecycleEvents = [
                { event: "EVIDENCE_RECEIVED", timestamp: new Date().toISOString() },
                { event: "EVIDENCE_VALIDATED", timestamp: new Date().toISOString() },
                { event: "EVIDENCE_REGISTERED", timestamp: new Date().toISOString() }
            ];
        }

        const buildIdentity = record.provenance?.buildIdentity || 'unknown';

        try {
            await this.pool.query(
                'INSERT INTO evidence(identity, build_identity, payload) VALUES($1, $2, $3)',
                [identity, buildIdentity, record]
            );
        } catch (err) {
            if (err.code === '23505') { // unique violation
                throw new Error("DuplicateEvidenceError: Evidence identity already exists");
            }
            throw err;
        }
    }

    async get(identity) {
        const res = await this.pool.query('SELECT payload FROM evidence WHERE identity = $1', [identity]);
        if (res.rows.length === 0) {
            return null;
        }
        return res.rows[0].payload;
    }

    async getByBuildIdentity(buildIdentity) {
        const res = await this.pool.query('SELECT payload FROM evidence WHERE build_identity = $1 LIMIT 1', [buildIdentity]);
        if (res.rows.length === 0) {
            return null;
        }
        return res.rows[0].payload;
    }
}

module.exports = { PostgresStore };
