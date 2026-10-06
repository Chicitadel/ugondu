import { RecoveryCapability } from '../../../engine-core/src/deise/engine/recovery/capabilities/recovery-capability';
import { EnvironmentTwin } from '../../../engine-core/src/deise/twin/environment-twin';
import { RecoveryScope } from '../../../engine-core/src/deise/engine/recovery/live-environment-adapter-contract';

export class LiveDatabaseStateReconstruction implements RecoveryCapability {
    get capabilityId(): string {
        return 'LiveDatabaseStateReconstruction';
    }
    
    async diagnose(twin: EnvironmentTwin, scope: RecoveryScope): Promise<any> {
        return { isReady: false, reason: 'PendingImplementation' };
    }

    async plan(diagnosis: any, scope: RecoveryScope): Promise<any> {
        return { actions: [] };
    }

    async execute(plan: any, adapter: any, scope: RecoveryScope): Promise<boolean> {
        // COR-009: Do not fake success
        throw new Error(__t('livedatabasestatereconstructio'));
    }
}

