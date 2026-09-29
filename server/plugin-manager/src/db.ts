import path from 'path';
import fs from 'fs';

const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'plugins.json');

// Represents which plugins are installed/active per tenant
export interface TenantPluginLedger {
    [tenantId: string]: string[]; // array of active plugin names
}

class PluginDatabase {
    private data: TenantPluginLedger = {};

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

    getActivePlugins(tenantId: string): string[] {
        return this.data[tenantId] || [];
    }

    activatePlugin(tenantId: string, pluginName: string) {
        if (!this.data[tenantId]) {
            this.data[tenantId] = [];
        }
        if (!this.data[tenantId].includes(pluginName)) {
            this.data[tenantId].push(pluginName);
            this.save();
        }
    }

    deactivatePlugin(tenantId: string, pluginName: string) {
        if (this.data[tenantId]) {
            this.data[tenantId] = this.data[tenantId].filter(p => p !== pluginName);
            this.save();
        }
    }
}

export const pluginStore = new PluginDatabase();
