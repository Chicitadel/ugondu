/**
 * Kernel Registry API (Program 0: Platform Kernel)
 * Centralizes discovery and versioning for all capabilities and governance assets.
 */
const express = require('express');

// In-memory cache representing the Immutable Kernel Database
// In a real environment this would be backed by PostgresStore/MysqlStore
const KERNEL_REGISTRY = {
    versions: {
        'Capability Catalog': '1.0.0',
        'Capability Registry': '1.0.0',
        'Product Manifest Schema': '1.0.0',
        'Adapter Contracts': '1.0.0',
        'Schema Registry': '1.0.0',
        'Policy Registry': '1.0.0',
        'Version Registry': '1.0.0',
        'Governance Policies': '1.0.0',
        'Execution Planning Standard': '2.0.0',
        'Capability Lifecycle': '1.0.0',
        'Capability Maturity Model': '1.0.0',
        'Evidence Schema': '1.0.0'
    },
    capabilities: {
        'cms': {
            id: 'cms',
            program: 'C',
            maturity: 'L2',
            requires: ['identity', 'licensing', 'telemetry'],
            optional: ['ai', 'analytics'],
            contract_version: '1.0.0',
            providers: [
                { id: 'wordpress', status: 'Certified' },
                { id: 'drupal', status: 'Certified' },
                { id: 'strapi', status: 'Experimental' }
            ]
        },
        'identity': {
            id: 'identity',
            program: 'A',
            maturity: 'L6',
            requires: [],
            optional: [],
            contract_version: '1.0.0',
            providers: [
                { id: 'auth0', status: 'Certified' },
                { id: 'keycloak', status: 'Certified' }
            ]
        }
    }
};

function createKernelApi() {
    const router = express.Router();

    // Middleware to enforce Internal-Service / Admin read roles
    // We mock this slightly for the example
    router.use('/kernel/v1/*', (req, res, next) => {
        const auth = req.headers.authorization;
        if (!auth) {
            return res.status(401).json({ error: 'Missing Authorization header' });
        }
        // In a real system, validate the Bearer token matches 'Admin' or 'Internal-Service'
        next();
    });

    // P0.A: GET Capability Registry
    router.get('/kernel/v1/capability/:id', (req, res) => {
        const capId = req.params.id.toLowerCase();
        const capability = KERNEL_REGISTRY.capabilities[capId];
        
        if (!capability) {
            return res.status(404).json({ error: `Capability '${capId}' not found in registry.` });
        }
        
        res.status(200).json(capability);
    });

    // P0.A: GET Version Registry
    router.get('/kernel/v1/version/:asset', (req, res) => {
        // Simple decode to handle spaces, e.g., 'Capability Catalog'
        const assetName = decodeURIComponent(req.params.asset);
        const version = KERNEL_REGISTRY.versions[assetName];
        
        if (!version) {
            return res.status(404).json({ error: `Asset '${assetName}' not found in version registry.` });
        }
        
        res.status(200).json({ asset: assetName, version: version });
    });

    return router;
}

module.exports = { createKernelApi };
