import { RecoveryCapability } from '../../../engine-core/src/deise/engine/recovery/capabilities/recovery-capability';
import { EnvironmentTwin } from '../../../engine-core/src/deise/twin/environment-twin';
import { RecoveryScope } from '../../../engine-core/src/deise/engine/recovery/live-environment-adapter-contract';

export class ComposerIntegrityValidation implements RecoveryCapability {
    get capabilityId(): string {
        return 'ComposerIntegrityValidation';
    }
    
    async diagnose(twin: EnvironmentTwin, scope: RecoveryScope): Promise<any> {
        return { isReady: false, reason: 'PendingImplementation' };
    }
    
    async plan(diagnosis: any, scope: RecoveryScope): Promise<any> {
        return { actions: [] };
    }
    
    async execute(plan: any, adapter: any, scope: RecoveryScope): Promise<boolean> {
        // COR-008: Do not fake success
        throw new Error(__t('composerintegrityvalidation_is'));
    }
}

