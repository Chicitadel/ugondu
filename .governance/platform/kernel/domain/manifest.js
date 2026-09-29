/**
 * P0.5: Manifest Engine (Domain Model)
 * Parses YAML, resolves inheritance/overlays
 */

const registry = require('./registry');

function mergeManifests(base, overlay) {
    const merged = { ...base };
    for (const key of Object.keys(overlay)) {
        if (typeof overlay[key] === 'object' && overlay[key] !== null && !Array.isArray(overlay[key])) {
            merged[key] = mergeManifests(merged[key] || {}, overlay[key]);
        } else {
            merged[key] = overlay[key];
        }
    }
    return merged;
}

class ManifestEngine {
    /**
     * Accepts a pure JSON object manifest, resolves inheritance and overlays.
     */
    parse(manifestObj) {
        let manifest = { ...manifestObj };
        
        // Handle inheritance
        if (manifest.extends) {
            const baseProfile = registry.getProfile(manifest.extends);
            if (baseProfile) {
                manifest = mergeManifests(baseProfile, manifest);
            }
        }
        return manifest;
    }
}

module.exports = new ManifestEngine();
