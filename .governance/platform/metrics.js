const promClient = require('prom-client');

// Initialize the default metrics (CPU, memory, event loop, etc.)
promClient.collectDefaultMetrics();

// Metrics counters
const evidenceReceivedTotal = new promClient.Counter({
    name: 'evidence_received_total',
    help: 'Total number of evidence payloads received by the collector'
});

const evidenceValidatedTotal = new promClient.Counter({
    name: 'evidence_validated_total',
    help: 'Total number of evidence payloads successfully validated'
});

const evidenceRejectedTotal = new promClient.Counter({
    name: 'evidence_rejected_total',
    help: 'Total number of evidence payloads rejected',
    labelNames: ['reason'] // e.g., 'auth', 'schema', 'stale'
});

const promotionPassTotal = new promClient.Counter({
    name: 'promotion_pass_total',
    help: 'Total number of successful promotions'
});

const promotionFailTotal = new promClient.Counter({
    name: 'promotion_fail_total',
    help: 'Total number of failed promotions'
});

const replayMatchTotal = new promClient.Counter({
    name: 'replay_match_total',
    help: 'Total number of replay evaluations that perfectly matched historical decisions'
});

const replayMismatchTotal = new promClient.Counter({
    name: 'replay_mismatch_total',
    help: 'Total number of replay evaluations that mismatched historical decisions'
});

// Duration histograms
const requestDurationSeconds = new promClient.Histogram({
    name: 'request_duration_seconds',
    help: 'Total duration of evidence collection requests',
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 5]
});

const validationDurationSeconds = new promClient.Histogram({
    name: 'validation_duration_seconds',
    help: 'Duration of schema and freshness validation',
    buckets: [0.005, 0.01, 0.05, 0.1, 0.5, 1]
});

const persistenceDurationSeconds = new promClient.Histogram({
    name: 'persistence_duration_seconds',
    help: 'Duration of registry persistence operations',
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 5]
});

const replayDurationSeconds = new promClient.Histogram({
    name: 'replay_duration_seconds',
    help: 'Duration of replay evaluation',
    buckets: [0.1, 0.5, 1, 5, 10]
});

const promotionDurationSeconds = new promClient.Histogram({
    name: 'promotion_duration_seconds',
    help: 'Duration of promotion evaluation',
    buckets: [0.1, 0.5, 1, 5, 10]
});

module.exports = {
    promClient,
    counters: {
        evidenceReceivedTotal,
        evidenceValidatedTotal,
        evidenceRejectedTotal,
        promotionPassTotal,
        promotionFailTotal,
        replayMatchTotal,
        replayMismatchTotal
    },
    histograms: {
        requestDurationSeconds,
        validationDurationSeconds,
        persistenceDurationSeconds,
        replayDurationSeconds,
        promotionDurationSeconds
    }
};
