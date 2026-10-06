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
            configurationRepairs: [{ type: 'INJECT_ENV_FROM_VAULT', source: '.mandatag.env', target: 'current/.env' }],
            safeToProceed: true
        };
    }

    async execute(plan: any, adapter: any, scope: RecoveryScope): Promise<boolean> {
        if (!plan.requiresConfigurationRepair) return true;
        
        for (const repair of plan.configurationRepairs) {
            if (repair.type === 'INJECT_ENV_FROM_VAULT') {
                // We assume adapter has a universal capability to copy or inject configuration artifacts
                if (typeof adapter.copyConfigurationArtifact === 'function') {
                    await adapter.copyConfigurationArtifact(repair.source, repair.target, scope);
                } else {
                    throw new Error('Adapter does not support copyConfigurationArtifact');
                }
            }
        }
        return true; 
    }
}
