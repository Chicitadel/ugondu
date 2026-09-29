/**
 * P0.1 / P0.6: Registry Core and Storage (Domain Model)
 */

const KERNEL_REGISTRY = {
    capabilities: {
        'cms': {
            id: 'cms',
            requires: ['identity', 'licensing', 'telemetry'],
            optional: ['ai', 'analytics'],
            providers: [
                { id: 'wordpress', status: 'Preferred' },
                { id: 'drupal', status: 'Certified' },
                { id: 'strapi', status: 'Experimental' }
            ]
        },
        'identity': {
            id: 'identity',
            requires: [],
            optional: [],
            providers: [
                { id: 'auth0', status: 'Certified' },
                { id: 'keycloak', status: 'Preferred' }
            ]
        },
        'licensing': { id: 'licensing', requires: [], providers: [{ id: 'mandatag', status: 'Preferred' }] },
        'telemetry': { id: 'telemetry', requires: [], providers: [{ id: 'prometheus', status: 'Preferred' }] },
        'ai': { id: 'ai', requires: [], providers: [{ id: 'gemini', status: 'Certified' }, { id: 'local-vllm', status: 'Experimental' }] }
    },
    profiles: {
        'airroofers/base-web-product': {
            capabilities: {
                telemetry: { enabled: true },
                identity: { enabled: true },
                licensing: { enabled: true }
            }
        }
    }
};

class RegistryCore {
    getCapability(id) {
        return KERNEL_REGISTRY.capabilities[id] || null;
    }

    getProfile(id) {
        return KERNEL_REGISTRY.profiles[id] || null;
    }

    getProvidersForCapability(capId) {
        const cap = this.getCapability(capId);
        return cap ? cap.providers : [];
    }
}

module.exports = new RegistryCore();
