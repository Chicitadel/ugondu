import { RecoveryCapability } from '../../../engine-core/src/deise/engine/recovery/capabilities/recovery-capability';
import { EnvironmentTwin } from '../../../engine-core/src/deise/twin/environment-twin';
import { RecoveryScope } from '../../../engine-core/src/deise/engine/recovery/live-environment-adapter-contract';

export class ComposerIntegrityValidation implements RecoveryCapability {
    get capabilityId(): string {
        return 'ComposerIntegrityValidation';
    }
    
    async diagnose(twin: EnvironmentTwin, scope: RecoveryScope): Promise<any> {
        const hasComposer = twin.application.manifests && twin.application.manifests.includes('composer.json');
        if (!hasComposer) {
            return { issue: 'NoIssue', requiresComposerInstall: false, confidence: 1.0 };
        }
        
        return { issue: 'ComposerIntegrityLost', requiresComposerInstall: true, confidence: 0.95 };
    }
    
    async plan(diagnosis: any, scope: RecoveryScope): Promise<any> {
        if (!diagnosis.requiresComposerInstall) {
            return { requiresDependencyRepair: false, actions: [], safeToProceed: true };
        }
        
        return {
            requiresDependencyRepair: true,
            actions: [
                { type: 'COMPOSER_INSTALL' }
            ],
            safeToProceed: true
        };
    }
    
    async execute(plan: any, adapter: any, scope: RecoveryScope): Promise<boolean> {
        if (!plan.requiresDependencyRepair) return true;
        // COR-008: Do not fake success
        
        for (const action of plan.actions) {
            if (action.type === 'COMPOSER_INSTALL') {
                if (typeof adapter.executeComposerInstall === 'function') {
                    await adapter.executeComposerInstall(scope.repositoryPath);
                } else if (typeof adapter.executeAction === 'function') {
                    await adapter.executeAction('COMPOSER_INSTALL', { workingDirectory: scope.repositoryPath });
                } else {
                    throw new Error('Adapter does not support executeComposerInstall abstraction');
                }
            }
        }
        
        return true;
    }
}

