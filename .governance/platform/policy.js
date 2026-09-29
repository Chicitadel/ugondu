// Simple Role Policy Matcher

const POLICIES = {
    'certify': {
        allowedCapabilities: ['evidence-submission', 'evidence-read'],
        allowedPaths: ['/api/v1/collector', '/api/v1/evidence']
    },
    'ingestion': {
        allowedCapabilities: ['evidence-submission'],
        allowedPaths: ['/api/v1/collector']
    },
    'bootstrap': {
        allowedCapabilities: ['evidence-submission'],
        allowedPaths: ['/api/v1/collector']
    }
};

function evaluatePolicy(repository, capability, path) {
    const policy = POLICIES[repository];
    if (!policy) return false;

    if (!policy.allowedCapabilities.includes(capability)) return false;

    // Check if path matches any allowed path prefix
    for (const allowedPath of policy.allowedPaths) {
        if (path.startsWith(allowedPath)) {
            return true;
        }
    }

    return false;
}

module.exports = {
    evaluatePolicy
};
