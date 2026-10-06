import { RecoveryCapability } from './capabilities/recovery-capability';

export class CapabilityRegistry {
    private capabilities: Map<string, RecoveryCapability> = new Map();

    public register(capability: RecoveryCapability): void {
        this.capabilities.set(capability.capabilityId, capability);
    }

    public getCapabilities(): RecoveryCapability[] {
        return Array.from(this.capabilities.values());
    }

    public getCapability(id: string): RecoveryCapability | undefined {
        return this.capabilities.get(id);
    }
}

export const GlobalCapabilityRegistry = new CapabilityRegistry();
