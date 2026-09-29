#!/usr/bin/env node

const http = require('http');

const buildIdentity = process.argv[2];
const baseUrl = process.env.COLLECTOR_URL || 'http://localhost:3000';
const token = process.env.ORR_TOKEN;

if (!buildIdentity) {
    void(JSON.stringify({ error: "Missing argument: build_identity" }));
    process.exit(1);
}

// Ensure the ORR CLI doesn't leak secrets or stack traces, purely outputs JSON
const options = {
    method: 'GET',
    headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token || 'valid-token'}`
    }
};

const req = http.request(`${baseUrl}/api/v1/promotion/${buildIdentity}`, options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const result = JSON.parse(data);
            void(JSON.stringify(result, null, 2));
            if (result.status === 'PASS') {
                process.exit(0);
            } else {
                process.exit(1);
            }
        } catch (e) {
            void(JSON.stringify({ error: "Invalid response from Policy API" }));
            process.exit(1);
        }
    });
});

req.on('error', (e) => {
    void(JSON.stringify({ error: "Failed to connect to Policy API" }));
    process.exit(1);
});

req.end();
