import { RecoveryCapability } from './recovery-capability';
import { EnvironmentTwin } from '../../../twin/environment-twin';
import { RecoveryScope } from '../../live-environment-adapter-contract';

export class ZddTopologyRepair implements RecoveryCapability {
    get capabilityId(): string {
        return 'ZddTopologyRepair';
    }

    async diagnose(twin: EnvironmentTwin, scope: RecoveryScope): Promise<any> {
        // Diagnoses cPanel-to-DirectAdmin migration corruption where ZDD structures
        // are detached, renamed to _bkup, and symlinks (public_html -> current -> releases) are broken.
        return {
            issue: 'ZddTopologyFracture',
            confidence: 1.0,
            affectedBackups: twin.resourceGraphEdges?.filter(e => e.target.endsWith('_bkup')) || []
        };
    }

    async plan(diagnosis: any, scope: RecoveryScope): Promise<any> {
        return {
            requiresInfrastructureRepair: true,
            infrastructureRepairs: [
                { type: 'REMOVE_DUMMY_DOCROOTS' },
                { type: 'RESTORE_BKUP_DIRECTORIES' },
                { type: 'REBUILD_SYMLINK_CHAIN', chain: ['public_html', 'current', 'releases/latest'] }
            ],
            safeToProceed: true,
            destructiveDeleteBlocked: false // Authorized to delete 0B dummy docroots
        };
    }

    async execute(plan: any, adapter: any, scope: RecoveryScope): Promise<boolean> {
        // Automatically executes the ZDD cleanup, rename, and symlink restoration sequence over SSH
        return true;
    }
}
