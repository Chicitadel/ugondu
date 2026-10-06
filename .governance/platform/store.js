const fs = require('fs');
const path = require('path');
const yaml = require('./node_modules/js-yaml');

/**
 * Interface for Evidence Storage
 */
class EvidenceStore {
    async save(identity, record) { throw new Error("Not implemented"); }
    async get(identity) { throw new Error("Not implemented"); }
}

/**
 * Local Filesystem Implementation
 */
class FilesystemStore extends EvidenceStore {
    constructor(baseDir) {
        super();
        this.registryDir = path.join(baseDir, 'evidence');
        fs.mkdirSync(this.registryDir, { recursive: true });
    }

    async save(identity, record) {
        const filePath = path.join(this.registryDir, `${identity}.yaml`);
        if (fs.existsSync(filePath)) {
            throw new Error("DuplicateEvidenceError: Evidence identity already exists");
        }
        
        // Add a lifecycle state if not present (Append-Only Event Log)
        if (!record.lifecycleEvents) {
            record.lifecycleEvents = [
                { event: "EVIDENCE_RECEIVED", timestamp: new Date().toISOString() },
                { event: "EVIDENCE_VALIDATED", timestamp: new Date().toISOString() },
                { event: "EVIDENCE_REGISTERED", timestamp: new Date().toISOString() }
            ];
        }
        
        fs.writeFileSync(filePath, yaml.dump(record));
    }

    async get(identity) {
        const filePath = path.join(this.registryDir, `${identity}.yaml`);
        if (!fs.existsSync(filePath)) {
            return null;
        }
        return yaml.load(fs.readFileSync(filePath, 'utf8'));
    }
}

/**
 * Mock Memory Implementation for tests/upgrades
 */
class MemoryStore extends EvidenceStore {
    constructor() {
        super();
        this.store = new Map();
    }
    
    async save(identity, record) {
        if (this.store.has(identity)) throw new Error("DuplicateEvidenceError");
        
        if (!record.lifecycleEvents) {
            record.lifecycleEvents = [
                { event: "EVIDENCE_RECEIVED", timestamp: new Date().toISOString() },
                { event: "EVIDENCE_VALIDATED", timestamp: new Date().toISOString() },
                { event: "EVIDENCE_REGISTERED", timestamp: new Date().toISOString() }
            ];
        }
        
        this.store.set(identity, JSON.parse(JSON.stringify(record)));
    }
    
    async get(identity) {
        return this.store.get(identity) || null;
    }
}

module.exports = {
    EvidenceStore,
    FilesystemStore,
    MemoryStore
};
