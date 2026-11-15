/**
 * P0.2: Resolution Engine (Domain Model)
 * Deterministic selection of providers for capabilities.
 */

const registry = require('./registry');

class ResolutionEngine {
    
    resolveManifest(manifest) {
        const execution_plan = {
            product: manifest.product,
            resolved_providers: {},
            errors: []
        };

        const capabilities = manifest.capabilities || {};
        
        for (const [capId, config] of Object.entries(capabilities)) {
            if (config.enabled !== false) {
                try {
                    const provider = this.resolveProvider(capId, config);
                    execution_plan.resolved_providers[capId] = provider.id;
                    
                    // Automatically resolve hard dependencies recursively
                    this.resolveDependencies(capId, execution_plan.resolved_providers, execution_plan.errors);
                } catch (e) {
                    execution_plan.errors.push(e.message);
                }
            }
        }

        return { execution_plan };
    }

    resolveDependencies(capId, resolvedProviders, errors) {
        const capability = registry.getCapability(capId);
        if (!capability) return;

        for (const reqCap of capability.requires) {
            if (!resolvedProviders[reqCap]) {
                try {
                    const provider = this.resolveProvider(reqCap, {});
                    resolvedProviders[reqCap] = provider.id;
                    this.resolveDependencies(reqCap, resolvedProviders, errors);
                } catch (e) {
                    errors.push(`Dependency Resolution Failed: ${reqCap} (required by ${capId}) - ${e.message}`);
                }
            }
        }
    }

    resolveProvider(capId, productOverrideConfig) {
        const capability = registry.getCapability(capId);
        if (!capability) {
            throw new Error(`Unknown capability: ${capId}`);
        }

        const providers = capability.providers;
        
        // 1. Product Override
        if (productOverrideConfig.provider) {
            const requested = providers.find(p => p.id === productOverrideConfig.provider);
            if (requested) {
                if (requested.status === 'Experimental' && productOverrideConfig.allow_experimental !== true) {
                    throw new Error(`Provider ${requested.id} is Experimental. Must explicitly set allow_experimental: true`);
                }
                return requested;
            } else {
                throw new Error(`Provider ${productOverrideConfig.provider} is not registered for capability ${capId}`);
            }
        }

        // 2. Deployment Profile (Stubed skip for now, but would check env vars)
        // 3. Preferred Certified Provider
        const preferred = providers.find(p => p.status === 'Preferred');
        if (preferred) return preferred;

        // 4. Certified Provider
        const certified = providers.find(p => p.status === 'Certified');
        if (certified) return certified;

        // 5. Fail (Cannot auto-resolve Experimental)
        throw new Error(`No certified or preferred provider available for capability ${capId}`);
    }
}

module.exports = new ResolutionEngine();
