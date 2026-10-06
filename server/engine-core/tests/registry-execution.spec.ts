import { UniversalActionRegistry } from '../../src/registry/action-registry';

describe('UniversalActionRegistry', () => {
    it('should invoke ugondu:deploy universally', async () => {
        const registry = new UniversalActionRegistry();
        const action = registry.getAction('ugondu:deploy');
        expect(action).toBeDefined();

        const res = await action!.execute({});
        expect(res.status).toBe('success');
        expect(res.resourceId).toBe('deploy-canonical-123');
    });
});
