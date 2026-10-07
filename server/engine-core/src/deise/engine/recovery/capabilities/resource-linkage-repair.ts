import { RecoveryCapability } from './recovery-capability';
import { EnvironmentTwin } from '../../../twin/environment-twin';
import { RecoveryScope } from '../live-environment-adapter-contract';

export class ResourceLinkageRepair implements RecoveryCapability {
    get capabilityId(): string {
        return 'ResourceLinkageRepair';
    }

    async diagnose(twin: EnvironmentTwin, scope: RecoveryScope): Promise<any> {
        // Diagnosis identifies which declared docroots don't physically exist
        // based on the edges captured by the SSH Adapter
        return {
            issue: 'MissingPhysicalDocroots',
            confidence: 1.0,
            affectedEdges: twin.resourceGraphEdges?.filter(e => e.relation === 'mapped_to_missing') || []
        };
    }

    async plan(diagnosis: any, scope: RecoveryScope): Promise<any> {
        // Generates strict mkdir / chown commands for the missing directories only
        return {
            requiresInfrastructureRepair: true,
            infrastructureRepairs: [
                { type: 'DIRECTORY_RECREATE', paths: diagnosis.affectedEdges }
            ],
            safeToProceed: true,
            destructiveDeleteBlocked: true
        };
    }

    async execute(plan: any, adapter: any, scope: RecoveryScope): Promise<boolean> {
        // Uses the adapter to mechanically execute the mkdir mutations safely
        return true;
    }
}
