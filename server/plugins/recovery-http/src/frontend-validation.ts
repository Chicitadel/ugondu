import { RecoveryCapability } from '../../../engine-core/src/deise/engine/recovery/capabilities/recovery-capability';
import { EnvironmentTwin } from '../../../engine-core/src/deise/twin/environment-twin';
import { RecoveryScope } from '../../../engine-core/src/deise/engine/recovery/live-environment-adapter-contract';

export class FrontendValidation implements RecoveryCapability {
    get capabilityId(): string {
        return 'FrontendValidation';
    }

    async diagnose(twin: EnvironmentTwin, scope: RecoveryScope): Promise<any> {
        // COR-011: Universal frontend validator
        const domain = scope.resourceIdentifiers[0] || 'localhost';
        const targetUrl = `https://${domain}`;
        
        try {
            const response = await fetch(targetUrl);
            const body = await response.text();

            if (response.status === 500) {
                if (body.includes('missing_environment_variable') || body.includes('DB_HOST')) {
                    return {
                        issue: 'MissingApplicationConfiguration',
                        confidence: 1.0,
                        details: __t('application_execution_succeede')
                    };
                }
                return {
                    issue: 'ApplicationInternalError',
                    confidence: 0.8,
                    details: __t('server_returned_500_could_be_m')
                };
            }

            return { issue: null, confidence: 1.0, details: __t('frontend_http_validation_succe') };
            
        } catch (error) {
            return {
                issue: 'RoutingFailure',
                confidence: 1.0,
                details: __t('frontend_http_validation_faile')
            };
        }
    }

    async plan(diagnosis: any, scope: RecoveryScope): Promise<any> {
        if (diagnosis.issue === 'MissingApplicationConfiguration') {
            const domain = scope.resourceIdentifiers[0] || 'localhost';
            return {
                requiresInfrastructureRepair: false,
                requiresConfigurationRepair: true,
                configurationRepairs: [
                    { type: 'RESTORE_ENV_FILE', target: `/domains/${domain}/current/.env` }
                ],
                safeToProceed: true
            };
        }
        return { requiresInfrastructureRepair: false, safeToProceed: false };
    }

    async execute(plan: any, adapter: any, scope: RecoveryScope): Promise<boolean> {
        if (!plan.requiresConfigurationRepair) {
            return true;
        }
        
        // Execute configuration repairs
        for (const repair of plan.configurationRepairs || []) {
            try {
                await adapter.applyConfigurationRepair(repair.type, repair.target);
            } catch (error) {
                console.error(`[FrontendValidation] Repair failed for ${repair.type}:`, error);
                return false;
            }
        }

        // HTTP health check execution loop logic via abstract fetch patterns
        const domain = scope.resourceIdentifiers[0] || 'localhost';
        const targetUrl = `https://${domain}`;
        const maxRetries = 3;
        const retryDelayMs = 3000;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch(targetUrl);
                if (response.ok) {
                    return true;
                }
            } catch (error) {
                // Fetch failed, loop will retry
                console.warn(`[FrontendValidation] Health check attempt ${attempt} failed.`);
            }
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, retryDelayMs));
            }
        }

        return false;
    }
}

