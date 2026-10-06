/**
 * Orchestration Engine (Infrastructure Layer)
 * Consumes the pure math `execution_plan` output by the Domain's Resolution Engine
 * and executes side-effects (e.g. provisioning databases, pulling docker containers).
 */
class OrchestrationEngine {
    execute(executionPlan) {
        if (executionPlan.errors && executionPlan.errors.length > 0) {
            throw new Error(`Cannot orchestrate. Execution Plan has errors: ${executionPlan.errors.join(', ')}`);
        }
        
        const logs = [];
        logs.push(`[Orchestration] Starting deployment for product: ${executionPlan.product?.id || 'Unknown'}`);
        
        // Iterate through resolved providers and simulate provisioning
        for (const [capability, providerId] of Object.entries(executionPlan.resolved_providers)) {
            logs.push(`[Orchestration] Provisioning capability [${capability}] using provider [${providerId}]...`);
        }
        
        logs.push(`[Orchestration] Deployment complete.`);
        return { success: true, logs };
    }
}

module.exports = new OrchestrationEngine();
