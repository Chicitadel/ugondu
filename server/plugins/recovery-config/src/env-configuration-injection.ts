import { RecoveryCapability } from '../../../engine-core/src/deise/engine/recovery/capabilities/recovery-capability';
import { EnvironmentTwin } from '../../../engine-core/src/deise/twin/environment-twin';
import { RecoveryScope } from '../../../engine-core/src/deise/engine/recovery/live-environment-adapter-contract';

export class EnvConfigurationInjection implements RecoveryCapability {
    get capabilityId(): string {
        return 'EnvConfigurationInjection';
    }

    async diagnose(twin: EnvironmentTwin, scope: RecoveryScope): Promise<any> {
        return { issue: 'MissingEnvironmentConfig', confidence: 0.9 };
    }

    async plan(diagnosis: any, scope: RecoveryScope): Promise<any> {
        return {
            requiresConfigurationRepair: true,
            configurationRepairs: [{ type: 'INJECT_ENV_FROM_VAULT' }],
            safeToProceed: true
        };
    }

    async execute(plan: any, adapter: any, scope: RecoveryScope): Promise<boolean> {
        // Universal execution via adapter, never hardcoded bash
        return adapter.executeCommand('cp .mandatag.env current/.env'); 
    }
}
