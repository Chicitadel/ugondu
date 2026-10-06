const express = require('express');
const { evaluateEvidence } = require('./evaluator');
const { logAudit } = require('./logger');
const metrics = require('./metrics');

function createPolicyApi(store) {
    const router = express.Router();

    // S5.3: Policy API Endpoint
    router.get('/api/v1/promotion/:build_identity', async (req, res) => {
        const buildIdentity = req.params.build_identity;
        
        // Auth is assumed to be handled by middleware upstream
        try {
            // Find evidence by build_identity
            // Note: Our EvidenceStore interface currently gets by `identity`, not `build_identity`.
            // For MVP, we need to adapt the Postgres/Mysql stores to support searching, but we'll stub it 
            // by assuming the store has a `searchByBuildIdentity` if we need it, or we rely on the primary `identity`.
            // The prompt says "Find evidence by build_identity". Let's assume store.getByBuildIdentity exists.
            
            // To keep the interface clean without breaking the frozen contract, we use standard SQL lookup if we can,
            // but `store` only has `get(identity)` and `save(identity, payload)`.
            // The `collector-api.js` returns `identity` and `buildIdentity`. The user can pass either.
            // Let's implement `getByBuildIdentity` on the store.

            const record = await store.getByBuildIdentity(buildIdentity);
            if (!record) {
                logAudit('promotion_denied', { buildIdentity, reason: 'missing_evidence' });
                return res.status(404).json({ status: 'FAIL', reason: 'Evidence not found for build identity' });
            }

            const result = evaluateEvidence(record);
            
            if (result.status === 'PASS') {
                metrics.counters.promotionPassTotal.inc();
                logAudit('promotion_approved', { buildIdentity });
                return res.status(200).json(result);
            } else {
                metrics.counters.promotionFailTotal.inc();
                logAudit('promotion_denied', { buildIdentity, ...result });
                // We use 403 Forbidden to explicitly block deployment based on policy failure.
                return res.status(403).json(result);
            }

        } catch (error) {
            logAudit('promotion_error', { buildIdentity, error: error.message });
            return res.status(500).json({ error: 'InternalServerError' });
        }
    });

    return router;
}

module.exports = { createPolicyApi };
