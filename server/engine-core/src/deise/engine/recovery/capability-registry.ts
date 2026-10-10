import { __t } from '@ugondu/shared';
import { RecoveryCapability } from './capabilities/recovery-capability';

export class CapabilityRegistry {
    private readonly plugins = new Map<string, RecoveryCapability>();

    public registerCapability(capability: RecoveryCapability): void {
        if (
            !capability ||
            typeof capability.capabilityId !== 'string' ||
            capability.capabilityId.trim() === ''
        ) {
            throw new Error(__t('invalid_capability_contract'));
        }

        if (
            typeof capability.diagnose !== 'function' ||
            typeof capability.plan !== 'function' ||
            typeof capability.execute !== 'function'
        ) {
            throw new Error(__t('invalid_capability_contract'));
        }

        if (this.plugins.has(capability.capabilityId)) {
            throw new Error(
                `CAPABILITY_ALREADY_REGISTERED:${capability.capabilityId}`
            );
        }

        this.plugins.set(capability.capabilityId, capability);
    }

    public getCapability(
        id: string
    ): RecoveryCapability | undefined {
        return this.plugins.get(id);
    }

    public listCapabilities(): RecoveryCapability[] {
        return Array.from(this.plugins.values());
    }
}

export const GlobalCapabilityRegistry =
    new CapabilityRegistry();
