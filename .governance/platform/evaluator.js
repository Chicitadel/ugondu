const { logInfo, logAudit, logWarn } = require('./logger');

// Hardcoded policy rules for MVP (Tech Debt tracked in Section 28 for Wave 8)
const PROMOTION_POLICIES = {
    'default': {
        requiredEvidence: [
            'compile.status=SUCCESS',
            'security.sast=PASS',
            'test.unit=PASS'
        ]
    }
};

/**
 * Pure functional evaluation of an evidence record against a policy.
 * @param {Object} evidenceRecord - The raw evidence from the registry.
 * @returns {Object} { status: 'PASS' | 'FAIL', missing: [], failed: [] }
 */
function evaluateEvidence(evidenceRecord) {
    // Determine policy to apply (default for now)
    const policy = PROMOTION_POLICIES['default'];
    
    let status = 'PASS';
    const missing = [];
    const failed = [];

    // Helper to traverse dot notation path safely
    const getPath = (obj, path) => path.split('.').reduce((acc, part) => acc && acc[part], obj);

    for (const rule of policy.requiredEvidence) {
        const [path, expectedValue] = rule.split('=');
        
        // Evidence paths are typically under the 'build.evidence' or similar depending on schema
        // We'll search broadly across standard root keys: 'build', 'deploy', etc.
        let foundValue = null;
        for (const root of ['build', 'deploy', 'security', 'test']) {
            if (evidenceRecord[root] && evidenceRecord[root].evidence) {
                const val = getPath(evidenceRecord[root].evidence, path);
                if (val !== undefined) {
                    foundValue = val;
                    break;
                }
            }
        }

        if (foundValue === null) {
            status = 'FAIL';
            missing.push(path);
        } else if (foundValue !== expectedValue) {
            status = 'FAIL';
            failed.push({ path, expected: expectedValue, actual: foundValue });
        }
    }

    return { status, missing, failed };
}

module.exports = {
    evaluateEvidence
};
