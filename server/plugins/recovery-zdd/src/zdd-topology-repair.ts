import { RecoveryCapability } from '../../../engine-core/src/deise/engine/recovery/capabilities/recovery-capability';
import { EnvironmentTwin } from '../../../engine-core/src/deise/twin/environment-twin';
import { RecoveryScope } from '../../../engine-core/src/deise/engine/recovery/live-environment-adapter-contract';

export class ZddTopologyRepair implements RecoveryCapability {
    get capabilityId(): string {
        return 'ZddTopologyRepair';
    }

    async diagnose(twin: EnvironmentTwin, scope: RecoveryScope): Promise<any> {
        throw new Error(__t('unimplemented_zdd_diagnose_is_'));
    }

    async plan(diagnosis: any, scope: RecoveryScope): Promise<any> {
        throw new Error(__t('unimplemented_zdd_plan_is_scaf'));
    }

    async execute(plan: any, adapter: any, scope: RecoveryScope): Promise<boolean> {
        if (!plan.requiresInfrastructureRepair) return true;
        // Automatically executes the ZDD cleanup, rename, and symlink restoration sequence
        // COR-013: Do not return true if incomplete
        
        for (const repair of plan.infrastructureRepairs) {
            if (repair.type === 'REMOVE_DUMMY_DOCROOTS') {
                if (typeof adapter.removeDirectory === 'function') {
                    await adapter.removeDirectory(`${scope.repositoryPath}/public_html`);
                } else if (typeof adapter.executeAction === 'function') {
                    await adapter.executeAction('REMOVE_DIRECTORY', { target: `${scope.repositoryPath}/public_html` });
                } else {
                    throw new Error(__t('adapter_does_not_support_remov'));
                }
            } else if (repair.type === 'RESTORE_BKUP_DIRECTORIES') {
                if (typeof adapter.renameDirectory === 'function') {
                    await adapter.renameDirectory(`${scope.repositoryPath}/public_html_bkup`, `${scope.repositoryPath}/public_html`);
                } else if (typeof adapter.executeAction === 'function') {
                    await adapter.executeAction('RENAME_DIRECTORY', { source: `${scope.repositoryPath}/public_html_bkup`, target: `${scope.repositoryPath}/public_html` });
                } else {
                    throw new Error(__t('adapter_does_not_support_renam'));
                }
            } else if (repair.type === 'REBUILD_SYMLINK_CHAIN') {
                if (typeof adapter.createSymlink === 'function') {
                    // chain is ['public_html', 'current', 'releases/latest']
                    // current -> public_html
                    await adapter.createSymlink(`${scope.repositoryPath}/${repair.chain[1]}`, `${scope.repositoryPath}/${repair.chain[0]}`);
                    // releases/latest -> current
                    await adapter.createSymlink(`${scope.repositoryPath}/${repair.chain[2]}`, `${scope.repositoryPath}/${repair.chain[1]}`);
                } else if (typeof adapter.executeAction === 'function') {
                    await adapter.executeAction('SYMLINK', { target: `${scope.repositoryPath}/${repair.chain[1]}`, link: `${scope.repositoryPath}/${repair.chain[0]}` });
                    await adapter.executeAction('SYMLINK', { target: `${scope.repositoryPath}/${repair.chain[2]}`, link: `${scope.repositoryPath}/${repair.chain[1]}` });
                } else {
                    throw new Error(__t('adapter_does_not_support_creat'));
                }
            }
        }
        
        return true;
    }
}

