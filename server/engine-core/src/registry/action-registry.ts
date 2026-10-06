import { URREngine } from '../urre/execution/urre-engine';
import { TransactionDag } from '../urre/transaction/transaction-dag';
import { AwsNativeClient } from '../fabric/providers/aws-native-client';
import { AwsGovernanceAdapter } from '../governance/providers/aws/adapter';
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

    constructor() {
        this.urre = new URREngine();
        this.initializeCanonicalActions();
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

    private async dispatchToURRE(operationType: string, params: Record<string, any>): Promise<Record<string, any>> {
        // Enforce ActionResolver -> Governance -> URRE -> Provider path
        const txId = `tx-canonical-${Date.now()}`;
        const dag = new TransactionDag(txId);
        dag.addNode('OP', 'aws', operationType as any); (dag.getNode('OP') as any).output = params;

        // Governance Policy evaluation
        const govEngine = new PolicyGovernanceEngine();
        govEngine.registerAdapter(new AwsGovernanceAdapter());
        const decision = govEngine.evaluateIntent('aws', [{ action: operationType, resource: '*' }], 'action-resolver');
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

    public listActions(domain?: string): ActionContract[] {
        const all = Array.from(this.actions.values());
        if (domain) return all.filter(a => a.domain === domain);
        return all;
    }
}
