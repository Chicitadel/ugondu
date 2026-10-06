export interface ActionContract {
    id: string;
    domain: string;
    operation: string;
    providerAgnostic: boolean;
    description: string;
    inputSchema: Record<string, any>;
    outputSchema: Record<string, any>;
    risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    requiredCapabilities: string[];
    execute(params: Record<string, any>): Promise<Record<string, any>>;
}

export class UniversalActionRegistry {
    private actions = new Map<string, ActionContract>();

    constructor() {
        this.initializeCanonicalActions();
    }

    private initializeCanonicalActions() {
        const canonical: ActionContract[] = [
            {
                id: 'compute:instance:create', domain: 'compute', operation: 'create', providerAgnostic: true, description: 'Provision compute instance',
                inputSchema: {}, outputSchema: {}, risk: 'MEDIUM', requiredCapabilities: ['compute.provision'],
                execute: async (p) => ({ status: 'success', resourceId: 'i-placeholder' })
            },
            {
                id: 'compute:instance:terminate', domain: 'compute', operation: 'terminate', providerAgnostic: true, description: 'Terminate compute instance',
                inputSchema: {}, outputSchema: {}, risk: 'HIGH', requiredCapabilities: ['compute.destroy'],
                execute: async (p) => ({ status: 'success' })
            },
            {
                id: 'database:relational:create', domain: 'database', operation: 'create', providerAgnostic: true, description: 'Provision RDBMS',
                inputSchema: {}, outputSchema: {}, risk: 'MEDIUM', requiredCapabilities: ['database.provision'],
                execute: async (p) => ({ status: 'success', resourceId: 'db-placeholder' })
            },
            {
                id: 'storage:object:put', domain: 'storage', operation: 'put', providerAgnostic: true, description: 'Put object in storage',
                inputSchema: {}, outputSchema: {}, risk: 'LOW', requiredCapabilities: ['storage.write'],
                execute: async (p) => ({ status: 'success' })
            },
            {
                id: 'network:vpc:create', domain: 'network', operation: 'create', providerAgnostic: true, description: 'Create isolated network',
                inputSchema: {}, outputSchema: {}, risk: 'HIGH', requiredCapabilities: ['network.provision'],
                execute: async (p) => ({ status: 'success', resourceId: 'vpc-placeholder' })
            },
            {
                id: 'orchestration:container:deploy', domain: 'orchestration', operation: 'deploy', providerAgnostic: true, description: 'Deploy container orchestration',
                inputSchema: {}, outputSchema: {}, risk: 'HIGH', requiredCapabilities: ['orchestration.deploy'],
                execute: async (p) => ({ status: 'success', resourceId: 'ecs-placeholder' })
            },
            {
                id: 'ugondu:deploy', domain: 'orchestration', operation: 'deploy', providerAgnostic: true, description: 'Universal deployment action',
                inputSchema: {}, outputSchema: {}, risk: 'HIGH', requiredCapabilities: ['orchestration.deploy'],
                execute: async (p) => ({ status: 'success', resourceId: 'deploy-canonical-123' })
            }
        ];

        for (const act of canonical) {
            this.actions.set(act.id, act);
        }
    }

    public getAction(id: string): ActionContract | null {
        return this.actions.get(id) || null;
    }

    public listActions(domain?: string): ActionContract[] {
        const all = Array.from(this.actions.values());
        if (domain) return all.filter(a => a.domain === domain);
        return all;
    }
}
