/**
 * P0.7: Access Surfaces (Domain Model Root)
 */

const RegistryCore = require('./registry');
const ManifestEngine = require('./manifest');
const ResolutionEngine = require('./resolution');

class PlatformKernel {
    constructor() {
        this.registry = RegistryCore;
        this.manifest = ManifestEngine;
        this.resolution = ResolutionEngine;
    }

    /**
     * Primary entry point for any product/SDK to resolve its execution graph.
     */
    evaluateProduct(yamlManifest) {
        const parsed = this.manifest.parse(yamlManifest);
        return this.resolution.resolveManifest(parsed);
    }
}

module.exports = new PlatformKernel();
