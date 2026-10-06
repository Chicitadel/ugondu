const crypto = require('crypto');
const https = require('https');
const http = require('http');

class EvidenceCollectorClient {
    constructor(config = {}) {
        this.baseUrl = config.baseUrl || process.env.COLLECTOR_URL || 'http://localhost:3000';
        this.token = config.token || process.env.COLLECTOR_TOKEN;
        this.timeoutMs = config.timeoutMs || 2000;
        this.maxRetries = config.maxRetries || 3;
        
        if (!this.token) {
            throw new Error('EvidenceCollectorClient requires a valid Bearer token for authentication.');
        }
    }

    // Basic local schema validation before network call
    validateSchema(payload) {
        if (!payload || typeof payload !== 'object') return false;
        if (payload.schemaVersion !== '2.0') return false;
        if (!payload.repository || !payload.pipeline || !payload.metadata) return false;
        return true;
    }

    async submit(payload) {
        if (!this.validateSchema(payload)) {
            throw new Error('LocalValidationError: Payload fails schemaVersion 2.0 requirements');
        }

        const body = JSON.stringify(payload);
        const reqId = crypto.randomUUID();
        
        return this._requestWithRetry(body, reqId, 0);
    }

    _requestWithRetry(body, reqId, attempt) {
        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(`${this.baseUrl}/api/v1/collector`);
            const client = parsedUrl.protocol === 'https:' ? https : http;

            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.airroofers.evidence+json;version=1',
                    'Authorization': `Bearer ${this.token}`,
                    'X-Request-ID': reqId,
                    'X-Correlation-ID': reqId,
                    'Content-Length': Buffer.byteLength(body)
                },
                timeout: this.timeoutMs
            };

            const req = client.request(parsedUrl, options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode === 429 || res.statusCode >= 500) {
                        return this._handleRetry(body, reqId, attempt, new Error(`Server returned ${res.statusCode}`), resolve, reject);
                    }
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({ status: res.statusCode, data: JSON.parse(data) });
                    } else {
                        reject(new Error(`Collector rejected payload: ${res.statusCode} - ${data}`));
                    }
                });
            });

            req.on('error', (err) => {
                this._handleRetry(body, reqId, attempt, err, resolve, reject);
            });

            req.on('timeout', () => {
                req.destroy();
                this._handleRetry(body, reqId, attempt, new Error('Request Timeout'), resolve, reject);
            });

            req.write(body);
            req.end();
        });
    }

    _handleRetry(body, reqId, attempt, error, resolve, reject) {
        if (attempt >= this.maxRetries) {
            // Write to local fallback
            void(`[SDK WARNING] Collector unreachable after ${this.maxRetries} attempts. Fallback to local log.`);
            // In a real SDK we'd write to a local file system cache here
            reject(new Error(`MaxRetriesExceeded: ${error.message}`));
            return;
        }

        const backoff = Math.pow(2, attempt) * 100 + Math.random() * 50; // Jitter
        setTimeout(() => {
            this._requestWithRetry(body, reqId, attempt + 1).then(resolve).catch(reject);
        }, backoff);
    }
}

module.exports = { EvidenceCollectorClient };
