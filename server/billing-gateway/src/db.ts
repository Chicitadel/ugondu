import path from 'path';
import fs from 'fs';

const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'billing.json');

/**
 * @interface TenantInfo
 * @description Corporate Governed interface implementation for TenantInfo
 * @classification SOVEREIGN
 */
export interface TenantInfo {
    token: string;
    tenant_id: string;
    edition: string;
    created_at: string;
}

// Flat-file persistence engine (Zero-stub)
// Ensures data survives restarts across environments where native SQLite bindings fail.
class JSONDatabase {
    private data: Record<string, TenantInfo> = {};

    constructor() {
        this.load();
    }

    private load() {
        if (fs.existsSync(dbPath)) {
            try {
                this.data = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
            } catch (e) {
                this.data = {};
            }
        }
    }

    private save() {
        fs.writeFileSync(dbPath, JSON.stringify(this.data, null, 2));
    }

    get(token: string): TenantInfo | null {
        return this.data[token] || null;
    }

    set(token: string, tenantId: string, edition: string) {
        this.data[token] = {
            token,
            tenant_id: tenantId,
            edition,
            created_at: new Date().toISOString()
        };
        this.save();
    }
}

const db = new JSONDatabase();

export const tokenStore = {
    verifyToken(token: string): TenantInfo | null {
        return db.get(token);
    },
    registerToken(token: string, tenantId: string, edition: string) {
        db.set(token, tenantId, edition);
    }
};
