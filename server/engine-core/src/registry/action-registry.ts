import { URREngine } from '../urre/execution/urre-engine';
import { TransactionDag } from '../urre/transaction/transaction-dag';
import { PolicyGovernanceEngine } from '../governance/engine/policy-engine';
import { __t } from "@ugondu/shared";

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
    private urre: URREngine;

    constructor(urre?: URREngine) {
        this.urre = urre || new URREngine();
        this.initializeCanonicalActions();
    }

    public getUrre(): URREngine {
        return this.urre;
    }

    private initializeCanonicalActions() {
        const canonical: ActionContract[] = [
            {
                id: 'compute:instance:create', domain: 'compute', operation: 'create', providerAgnostic: true, description: __t('msg_provision_compute_instance'),
                inputSchema: {}, outputSchema: {}, risk: 'MEDIUM', requiredCapabilities: ['compute.provision'],
                execute: async (p) => this.dispatchToURRE('CREATE_EC2', p)
            },
            {
                id: 'compute:instance:terminate', domain: 'compute', operation: 'terminate', providerAgnostic: true, description: __t('msg_terminate_compute_instance'),
                inputSchema: {}, outputSchema: {}, risk: 'HIGH', requiredCapabilities: ['compute.destroy'],
                execute: async (p) => this.dispatchToURRE('TERMINATE_EC2', p)
            },
            {
                id: 'database:relational:create', domain: 'database', operation: 'create', providerAgnostic: true, description: __t('msg_provision_rdbms'),
                inputSchema: {}, outputSchema: {}, risk: 'MEDIUM', requiredCapabilities: ['database.provision'],
                execute: async (p) => this.dispatchToURRE('CREATE_RDS', p)
            },
            {
                id: 'database:relational:terminate', domain: 'database', operation: 'terminate', providerAgnostic: true, description: __t('msg_terminate_rdbms'),
                inputSchema: {}, outputSchema: {}, risk: 'HIGH', requiredCapabilities: ['database.destroy'],
                execute: async (p) => this.dispatchToURRE('TERMINATE_RDS', p)
            },
            {
                id: 'storage:object:put', domain: 'storage', operation: 'put', providerAgnostic: true, description: __t('msg_put_object_in_storage'),
                inputSchema: {}, outputSchema: {}, risk: 'LOW', requiredCapabilities: ['storage.write'],
                execute: async (p) => this.dispatchToURRE('PUT_S3', p)
            },
            {
                id: 'network:vpc:create', domain: 'network', operation: 'create', providerAgnostic: true, description: __t('msg_create_isolated_network'),
                inputSchema: {}, outputSchema: {}, risk: 'HIGH', requiredCapabilities: ['network.provision'],
                execute: async (p) => this.dispatchToURRE('CREATE_VPC', p)
            },
            {
                id: 'network:vpc:terminate', domain: 'network', operation: 'terminate', providerAgnostic: true, description: __t('msg_terminate_isolated_network'),
                inputSchema: {}, outputSchema: {}, risk: 'HIGH', requiredCapabilities: ['network.destroy'],
                execute: async (p) => this.dispatchToURRE('TERMINATE_VPC', p)
            },
            {
                    id: 'container:registry:create', domain: 'container', operation: 'create', providerAgnostic: true, description: __t('msg_create_container_registry'),
                    inputSchema: {}, outputSchema: {}, risk: 'MEDIUM', requiredCapabilities: ['orchestration.deploy'],
                    execute: async (p) => this.dispatchToURRE('CREATE_CONTAINER_REGISTRY', p)
                },
                {
                    id: 'container:image:build', domain: 'container', operation: 'build', providerAgnostic: true, description: __t('msg_build_container_image'),
                    inputSchema: {}, outputSchema: {}, risk: 'LOW', requiredCapabilities: ['orchestration.deploy'],
                    execute: async (p) => this.dispatchToURRE('BUILD_CONTAINER_IMAGE', p)
                },
                {
                    id: 'container:image:push', domain: 'container', operation: 'push', providerAgnostic: true, description: __t('msg_push_container_image'),
                    inputSchema: {}, outputSchema: {}, risk: 'LOW', requiredCapabilities: ['orchestration.deploy'],
                    execute: async (p) => this.dispatchToURRE('PUSH_CONTAINER_IMAGE', p)
                },
                {
                    id: 'container:task-definition:create', domain: 'container', operation: 'create', providerAgnostic: true, description: __t('msg_create_task_definition'),
                    inputSchema: {}, outputSchema: {}, risk: 'MEDIUM', requiredCapabilities: ['orchestration.deploy'],
                    execute: async (p) => this.dispatchToURRE('CREATE_TASK_DEFINITION', p)
                },
                {
                    id: 'container:service:create', domain: 'container', operation: 'create', providerAgnostic: true, description: __t('msg_create_container_service'),
                    inputSchema: {}, outputSchema: {}, risk: 'HIGH', requiredCapabilities: ['orchestration.deploy'],
                    execute: async (p) => this.dispatchToURRE('CREATE_CONTAINER_SERVICE', p)
                },
                {
                    id: 'orchestration:container:deploy', domain: 'orchestration', operation: 'deploy', providerAgnostic: true, description: __t('msg_deploy_container_orchestration'),
                inputSchema: {}, outputSchema: {}, risk: 'HIGH', requiredCapabilities: ['orchestration.deploy'],
                execute: async (p) => this.dispatchToURRE('DEPLOY_FARGATE', p)
            },
            {
                id: 'ugondu:deploy', domain: 'orchestration', operation: 'deploy', providerAgnostic: true, description: __t('msg_universal_deployment_action'),
                inputSchema: {}, outputSchema: {}, risk: 'HIGH', requiredCapabilities: ['orchestration.deploy'],
                execute: async (p) => this.dispatchToURRE('DEPLOY_UNIVERSAL', p)
            }
        ];

        for (const act of canonical) {
            this.actions.set(act.id, act);
        }
    }

    public async dispatchToURRE(operationType: string, params: Record<string, any>): Promise<Record<string, any>> {
        // Enforce ActionResolver -> Governance -> URRE -> Provider path
        const txId = params.transactionId || `tx-canonical-${Date.now()}`;
        const dag = new TransactionDag(txId);
        dag.addNode('OP', 'aws', operationType as any); (dag.getNode('OP') as any).output = params;

        // Governance Policy evaluation
        const govEngine = new PolicyGovernanceEngine();
        // govEngine.registerAdapter(providerAdapter); // Injected from outside
        
        const resourceIdentity = params.resourceId || params.id || `urn:ugondu:aws:${operationType.toLowerCase()}`;
        
        const decision = govEngine.evaluateIntent('aws', [{ action: operationType, resource: resourceIdentity }], 'action-resolver');
        if (decision.decision === 'DENY') {
            throw new Error(`Governance Denied: ${decision.reason}`);
        }

        // Execute via URREngine
        await this.urre.executeTransaction(dag);
        if (dag.status === 'FAILED') {
            throw new Error(`Action execution failed through URRE: ${dag.nodes.find(n=>n.status==='FAILED')?.error || __t('msg_unknown_error')}`);
        }

        // Extract outputs
        const opNode = dag.getNode('OP');
        return { status: 'success', resourceId: opNode?.output?.resourceId || undefined, outputs: opNode?.output };
    }

    public getAction(id: string): ActionContract | null {
        return this.actions.get(id) || null;
    }

    public registerAction(action: ActionContract): void {
        this.actions.set(action.id, action);
    }

    public listActions(domain?: string): ActionContract[] {
        const all = Array.from(this.actions.values());
        if (domain) return all.filter(a => a.domain === domain);
        return all;
    }
}

