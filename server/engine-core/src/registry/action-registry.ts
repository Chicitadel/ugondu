export interface UniversalAction {
    id: string;
    domain: string;
    operation: string;
    providerAgnostic: boolean;
    description: string;
}

export class UniversalActionRegistry {
    private actions = new Map<string, UniversalAction>();

    constructor() {
        this.initializeCanonicalActions();
    }

    private initializeCanonicalActions() {
        const canonical = [
            { id: 'compute:instance:create', domain: 'compute', operation: 'create', providerAgnostic: true, description: 'Provision compute instance' },
            { id: 'compute:instance:terminate', domain: 'compute', operation: 'terminate', providerAgnostic: true, description: 'Terminate compute instance' },
            { id: 'database:relational:create', domain: 'database', operation: 'create', providerAgnostic: true, description: 'Provision RDBMS' },
            { id: 'storage:object:put', domain: 'storage', operation: 'put', providerAgnostic: true, description: 'Put object in storage' },
            { id: 'network:vpc:create', domain: 'network', operation: 'create', providerAgnostic: true, description: 'Create isolated network' },
            { id: 'orchestration:container:deploy', domain: 'orchestration', operation: 'deploy', providerAgnostic: true, description: 'Deploy container orchestration' }
        ];

        for (const act of canonical) {
            this.actions.set(act.id, act);
        }
    }

    public getAction(id: string): UniversalAction | null {
        return this.actions.get(id) || null;
    }

    public listActions(domain?: string): UniversalAction[] {
        const all = Array.from(this.actions.values());
        if (domain) return all.filter(a => a.domain === domain);
        return all;
    }
}
