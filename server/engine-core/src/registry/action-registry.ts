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
        govEngine.registerAdapter(new AwsGovernanceAdapter());
        
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

export function createProductionActionRegistry(region?: string): UniversalActionRegistry {
    const urre = new URREngine();
    const aws = new AwsNativeClient(region || process.env.UGONDU_CERT_REGION || 'us-east-1');

    urre.registerHandler('aws', 'CREATE_EC2',
        async (node) => {
            const res = await aws.runInstances('t3.micro', node.output.ami, node.output.vpcId);
            return { instanceId: res.id, ip: res.ip };
        },
        async (node) => {
            if (node.output?.instanceId) {
                await aws.terminateInstances(node.output.instanceId);
            }
        }
    );

    urre.registerHandler('aws', 'TERMINATE_EC2',
        async (node) => {
            if (node.output?.instanceId) {
                await aws.terminateInstances(node.output.instanceId);
            }
            return {};
        },
        async () => {}
    );

    urre.registerHandler('aws', 'CREATE_VPC',
        async (node) => {
            const vpcId = await aws.createVpc(node.output.cidrBlock || '10.0.0.0/16', 'ugondu-vpc');
            return { vpcId };
        },
        async (node) => {
            if (node.output?.vpcId) {
                await aws.deleteVpc(node.output.vpcId);
            }
        }
    );

    urre.registerHandler('aws', 'TERMINATE_VPC',
        async (node) => {
            if (node.output?.vpcId) {
                await aws.deleteVpc(node.output.vpcId);
            }
            return {};
        },
        async () => {}
    );

    return new UniversalActionRegistry(urre);
}

