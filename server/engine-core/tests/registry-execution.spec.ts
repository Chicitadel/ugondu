import { UniversalActionRegistry } from '../../src/registry/action-registry';

describe('UniversalActionRegistry', () => {
    it(__t('should_invoke_ugondu_deploy_un'), async () => {
        const registry = new UniversalActionRegistry();
        const action = registry.getAction('ugondu:deploy');
        expect(action).toBeDefined();

        const res = await action!.execute({});
        expect(res.status).toBe('success');
        expect(res.resourceId).toBe('deploy-production-resolver');
    });
});
