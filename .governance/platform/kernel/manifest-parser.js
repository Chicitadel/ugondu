/**
 * Manifest Parser & Validator (Program 0: Platform Kernel)
 * Validates product manifests against the frozen schema and checks governance versioning.
 */

// A simple fallback YAML parser for the manifest (in production, we'd use 'yaml' or 'js-yaml')
function parseYaml(yamlString) {
    const obj = {};
    let currentBlock = obj;
    let currentBlockName = null;
    
    const lines = yamlString.split('\n');
    for (let line of lines) {
        line = line.replace(/\r/g, '').trimEnd();
        if (!line || line.startsWith('#')) continue;
        
        // Match block headers like "product:"
        const blockMatch = line.match(/^([a-z_]+):$/);
        if (blockMatch) {
            currentBlockName = blockMatch[1];
            obj[currentBlockName] = {};
            currentBlock = obj[currentBlockName];
            continue;
        }

        // Match key-value pairs like "  id: mediadna" or "id: mediadna"
        const kvMatch = line.match(/^[\s]*([a-z_]+):\s*(.*)$/);
        if (kvMatch) {
            let [, key, val] = kvMatch;
            val = val.replace(/^["'](.*)["']$/, '$1'); // remove quotes
            if (currentBlockName) {
                currentBlock[key] = val;
            } else {
                obj[key] = val;
            }
        }
    }
    return obj;
}

function validateManifest(manifestStr) {
    let manifest;
    try {
        manifest = parseYaml(manifestStr);
    } catch (e) {
        return { valid: false, errors: ['Failed to parse YAML manifest'] };
    }

    const errors = [];

    // 1. Check Product block
    if (!manifest.product) {
        errors.push('Missing "product" declaration block.');
    } else {
        if (!manifest.product.id) errors.push('product.id is required.');
        if (!manifest.product.type) errors.push('product.type is required.');
    }

    // 2. Check Governance versioning block
    if (!manifest.governance) {
        errors.push('Missing "governance" versioning block. Products must declare target governance versions.');
    } else {
        const requiredGovKeys = ['capability_catalog', 'manifest_schema', 'planning_standard'];
        for (const key of requiredGovKeys) {
            if (!manifest.governance[key]) {
                errors.push(`governance.${key} is required to guarantee platform backwards compatibility.`);
            }
        }
    }

    // 3. Capability declarations (ensure they exist as objects or are at least declared)
    const knownCapabilities = ['runtime', 'deployment', 'storage', 'identity', 'licensing', 'cms', 'ai'];
    const declaredCapabilities = Object.keys(manifest).filter(k => knownCapabilities.includes(k));

    return {
        valid: errors.length === 0,
        errors,
        parsed: manifest,
        capabilities: declaredCapabilities
    };
}

module.exports = {
    parseYaml,
    validateManifest
};
