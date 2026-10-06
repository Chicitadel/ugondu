const { logAudit } = require('./logger');
const { evaluatePolicy } = require('./policy');

// Secret Resolver (Stubed for now, would load from AWS Secrets Manager / HashiCorp Vault)
const STUB_VALID_TOKENS = {
    'valid-token': { repository: 'certify', capability: 'evidence-submission' },
    'ingestion-token': { repository: 'ingestion', capability: 'evidence-submission' },
    'bootstrap-token': { repository: 'bootstrap', capability: 'evidence-submission' }
};

function parseBearerToken(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.split(' ')[1];
}

function authenticationMiddleware(req, res, next) {
    const token = parseBearerToken(req.headers['authorization']);
    
    if (!token) {
        logAudit('unauthorized_access', { reason: 'missing_token', ...req.metadata });
        return res.status(401).json({ error: "Unauthorized", message: "Invalid or missing Bearer token" });
    }

    const identity = STUB_VALID_TOKENS[token];
    if (!identity) {
        logAudit('unauthorized_access', { reason: 'invalid_token', ...req.metadata });
        return res.status(401).json({ error: "Unauthorized", message: "Invalid or missing Bearer token" });
    }

    // Expiry Check (Stubed: Assume valid)
    // Issuer Check (Stubed: Assume valid)

    req.authContext = identity;
    next();
}

function authorizationMiddleware(req, res, next) {
    // Rely on req.authContext from authenticationMiddleware
    const { repository, capability } = req.authContext;
    
    // Evaluate against policy
    const isAuthorized = evaluatePolicy(repository, capability, req.path);
    
    if (!isAuthorized) {
        logAudit('forbidden_access', { reason: 'policy_denied', repository, capability, ...req.metadata });
        return res.status(403).json({ error: "Forbidden", message: "Insufficient permissions" });
    }

    logAudit('authorized_access', { repository, capability, ...req.metadata });
    next();
}

module.exports = {
    authenticationMiddleware,
    authorizationMiddleware
};
