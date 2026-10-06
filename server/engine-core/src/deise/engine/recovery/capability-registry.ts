import { RecoveryCapability } from './capabilities/recovery-capability';
export class CapabilityRegistry {
    private plugins: Map<string, RecoveryCapability> = new Map();

    constructor() {
        // P3: Plugins will be dynamically discovered or registered via an external loader
        // engine-core no longer imports concrete plugins directly.
    }

    registerCapability(capability: RecoveryCapability): void {
        if (!capability || typeof capability.capabilityId !== 'string') {
            throw new Error(__t('invalid_capability_contract'));
        }
        this.plugins.set(capability.capabilityId, capability);
    }

    getCapability(id: string): any {
        return this.plugins.get(id);
    }

    listCapabilities(): any[] {
        return Array.from(this.plugins.values());
    }
}

export const GlobalCapabilityRegistry = new CapabilityRegistry();

