import path from 'path';
import fs from 'fs';

const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'events.json');

// Persistent Webhook Ledger
class EventDatabase {
    // Map of eventName -> array of webhook URLs
    private data: Record<string, string[]> = {};

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

    getSubscribers(event: string): string[] {
        return this.data[event] || [];
    }

    addSubscriber(event: string, webhookUrl: string) {
        if (!this.data[event]) {
            this.data[event] = [];
        }
        if (!this.data[event].includes(webhookUrl)) {
            this.data[event].push(webhookUrl);
            this.save();
        }
    }
}

export const eventStore = new EventDatabase();
