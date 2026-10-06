const express = require('express');
const yaml = require('./node_modules/js-yaml');
const path = require('path');
const crypto = require('crypto');
const { FilesystemStore } = require('./store');
const { PostgresStore } = require('./postgres-store');
const { MysqlStore } = require('./mysql-store');
const metrics = require('./metrics');
const { loadProfile } = require('./profile-loader');
const { validateEnvironment, configureSecurityHeaders } = require('./security-bootstrap');
const { logInfo, logAudit } = require('./logger');
const { authenticationMiddleware, authorizationMiddleware } = require('./auth');
const { createPolicyApi } = require('./policy-api');
const { createKernelApi } = require('./kernel/kernel-api');

// S1.1: Security Foundation Startup
validateEnvironment();
const profile = loadProfile();
logInfo('collector_starting', { profile: profile.storage });

const app = express();
configureSecurityHeaders(app);

// S3: Expose Prometheus metrics
app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', metrics.promClient.register.contentType);
        res.end(await metrics.promClient.register.metrics());
    } catch (ex) {
        res.status(500).end(ex.message);
    }
});

// S3.3: Health Endpoints
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

app.use(express.text({ type: 'application/yaml' }));
app.use(express.json());

// S1: Security Middleware (Stage 1 & 2 & 3)
app.use('/api/v1/collector', (req, res, next) => {
    // S1.4: Request Metadata
    const reqId = req.headers['x-request-id'] || crypto.randomUUID();
    const corrId = req.headers['x-correlation-id'] || reqId;
    req.metadata = { reqId, corrId };

    // Set them back on the response for traceability
    res.setHeader('X-Request-ID', reqId);
    res.setHeader('X-Correlation-ID', corrId);

    // Strict Transport Security Headers check
    if (!req.headers['x-request-id'] || !req.headers['x-correlation-id']) {
        metrics.counters.evidenceRejectedTotal.labels('missing_headers').inc();
        logAudit('unauthorized_access', { reason: 'missing_headers', ...req.metadata });
        return res.status(400).json({ error: "MissingSecurityHeaders", message: "X-Request-ID and X-Correlation-ID are required" });
    }

    // Version Negotiation
    const acceptHeader = req.headers['accept'];
    if (acceptHeader !== 'application/vnd.airroofers.evidence+json;version=1') {
        metrics.counters.evidenceRejectedTotal.labels('unsupported_version').inc();
        logAudit('unauthorized_access', { reason: 'unsupported_version', ...req.metadata });
        return res.status(406).json({ error: "UnsupportedVersion", message: "Required Accept header: application/vnd.airroofers.evidence+json;version=1" });
    }

    next();
});

app.use('/api/v1/collector', authenticationMiddleware, authorizationMiddleware);

// S0.1: Deployment Profiles determines the active store
let store;
if (profile.storage === 'MysqlStore') {
    store = new MysqlStore();
} else if (profile.storage === 'PostgresStore') {
    store = new PostgresStore();
} else {
    store = new FilesystemStore(path.join(__dirname, 'registry'));
}

// S5.3: Mount the Policy API router
app.use(createPolicyApi(store));

// P0.A: Mount the Kernel API router
app.use(createKernelApi());

app.post('/api/v1/collector', async (req, res) => {
    const requestTimer = metrics.histograms.requestDurationSeconds.startTimer();
    metrics.counters.evidenceReceivedTotal.inc();

    try {
        const payload = yaml.load(req.body);

        // 1. Schema Validation
        const validationTimer = metrics.histograms.validationDurationSeconds.startTimer();
        if (payload.schemaVersion !== "2.0") {
            metrics.counters.evidenceRejectedTotal.labels('schema').inc();
            requestTimer();
            return res.status(400).json({ error: "UnsupportedSchemaVersion", message: "Only schemaVersion 2.0 is supported" });
        }
        if (!payload.repository || !payload.pipeline || !payload.metadata) {
            metrics.counters.evidenceRejectedTotal.labels('schema').inc();
            requestTimer();
            return res.status(400).json({ error: "MalformedSchemaError", message: "Missing required top-level fields" });
        }

        // 2. Freshness Validation
        const now = new Date();
        const modules = ['tests', 'security', 'performance', 'contracts'];
        for (const mod of modules) {
            if (payload[mod]) {
                for (const sub of Object.values(payload[mod])) {
                    if (sub.validUntil && new Date(sub.validUntil) < now) {
                        metrics.counters.evidenceRejectedTotal.labels('stale').inc();
                        requestTimer();
                        return res.status(400).json({ error: "StaleEvidenceError", message: `Evidence for ${mod} is stale.` });
                    }
                }
            }
        }

        }
        validationTimer();

        // 3. Identity Generation
        const buildIdentityString = `${payload.repository.name}-${payload.repository.commit}-${payload.pipeline.id}-${payload.pipeline.started}`;
        const buildIdentity = crypto.createHash('sha256').update(buildIdentityString).digest('hex');

        const evidenceHash = crypto.createHash('sha256').update(req.body).digest('hex');
        const collectorVersion = "2.6.0"; // Upgraded version for hardening
        const evidenceIdentityString = `${buildIdentity}-${payload.schemaVersion}-${evidenceHash}-${collectorVersion}`;
        const evidenceIdentity = crypto.createHash('sha256').update(evidenceIdentityString).digest('hex');

        payload.provenance = {
            buildIdentity,
            evidenceIdentity,
            collectedAt: now.toISOString(),
            collectorVersion
        };

        // 4. Persistence via Store Interface
        // The store handles lifecycle wrapping (RECEIVED -> VALIDATED -> REGISTERED)
        const persistenceTimer = metrics.histograms.persistenceDurationSeconds.startTimer();
        try {
            await store.save(evidenceIdentity, payload);
            persistenceTimer();
            metrics.counters.evidenceValidatedTotal.inc();
            requestTimer();
            return res.status(201).json({ message: "EvidenceAccepted", identity: evidenceIdentity, buildIdentity });
        } catch (storeError) {
            persistenceTimer();
            requestTimer();
            if (storeError.message.includes("DuplicateEvidenceError")) {
                return res.status(409).json({ error: "DuplicateEvidenceError", message: "Evidence identity already exists" });
            }
            throw storeError;
        }

    } catch (e) {
        requestTimer();
        metrics.counters.evidenceRejectedTotal.labels('parse').inc();
        return res.status(400).json({ error: "ParseError", message: e.message });
    }
});

app.get('/api/v1/evidence/:identity', async (req, res) => {
    const record = await store.get(req.params.identity);
    if (!record) {
        return res.status(404).json({ error: "NotFound" });
    }
    res.type('application/yaml').send(yaml.dump(record));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    void(`Evidence Collector running statelessly on port ${PORT}`);
});
