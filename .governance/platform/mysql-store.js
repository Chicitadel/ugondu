const mysql = require('mysql2/promise');
const { EvidenceStore } = require('./store');
const { logError, logInfo } = require('./logger');

class MysqlStore extends EvidenceStore {
    constructor(connectionUri) {
        super();
        this.pool = mysql.createPool({
            uri: connectionUri || process.env.MYSQL_DATABASE_URL || 'mysql://root:password@localhost:3306/governance',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
    }

    async save(identity, record) {
        if (!record.lifecycleEvents) {
            record.lifecycleEvents = [
                { event: "EVIDENCE_RECEIVED", timestamp: new Date().toISOString() },
                { event: "EVIDENCE_VALIDATED", timestamp: new Date().toISOString() },
                { event: "EVIDENCE_REGISTERED", timestamp: new Date().toISOString() }
            ];
        }

        const buildIdentity = record.provenance?.buildIdentity || 'unknown';

        try {
            await this.pool.execute(
                'INSERT INTO evidence (identity, build_identity, payload) VALUES (?, ?, ?)',
                [identity, buildIdentity, JSON.stringify(record)]
            );
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                throw new Error("DuplicateEvidenceError: Evidence identity already exists");
            }
            logError('mysql_save_error', err, { identity });
            throw err;
        }
    }

    async get(identity) {
        try {
            const [rows] = await this.pool.execute('SELECT payload FROM evidence WHERE identity = ?', [identity]);
            if (rows.length === 0) {
                return null;
            }
            return rows[0].payload; // mysql2 automatically parses JSON if the column is JSON, but it might be string depending on version.
        } catch (err) {
            logError('mysql_get_error', err, { identity });
            throw err;
        }
    }

    async getByBuildIdentity(buildIdentity) {
        try {
            const [rows] = await this.pool.execute('SELECT payload FROM evidence WHERE build_identity = ? LIMIT 1', [buildIdentity]);
            if (rows.length === 0) {
                return null;
            }
            return rows[0].payload;
        } catch (err) {
            logError('mysql_get_build_error', err, { buildIdentity });
            throw err;
        }
    }
}

module.exports = { MysqlStore };
