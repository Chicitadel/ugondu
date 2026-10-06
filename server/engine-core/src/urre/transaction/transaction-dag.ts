export type TransactionState = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'ROLLBACK' | 'RECOVERED';

export type NodeState = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'ROLLBACK_PENDING' | 'ROLLBACK_SUCCESS' | 'ROLLBACK_FAILED';

export interface DagNode {
    id: string;
    type: 'PROVISION' | 'CONFIGURE' | 'MIGRATE' | 'CLEANUP';
    provider: string; // e.g. aws, azure, directadmin
    action: string; // e.g. CREATE_VPC, CREATE_DB
    params: Record<string, any>;
    status: NodeState;
    output?: Record<string, any>;
    error?: string;
}

export interface DagEdge {
    from: string;
    to: string;
}

export class TransactionDag {
    public id: string;
    public status: TransactionState = 'PENDING';
    public nodes: DagNode[] = [];
    public edges: DagEdge[] = [];
    public createdAt: number = Date.now();
    public updatedAt: number = Date.now();

    constructor(id: string) {
        this.id = id;
    }

    public addNode(id: string, provider: string, action: string, type: 'PROVISION'|'CONFIGURE'|'MIGRATE'|'CLEANUP' = 'PROVISION'): void {
        this.nodes.push({ id, provider, action, type, params: {}, status: 'PENDING' });
    }

    public getNode(id: string): DagNode | undefined {
        return this.nodes.find(n => n.id === id);
    }

    public serialize(): Record<string, any> {
        return {
            id: this.id,
            status: this.status,
            nodes: this.nodes,
            edges: this.edges,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    public static deserialize(data: Record<string, any>): TransactionDag {
        const tx = new TransactionDag(data.id);
        tx.status = data.status;
        tx.edges = data.edges || [];
        tx.createdAt = data.createdAt;
        tx.updatedAt = data.updatedAt;
        tx.nodes = data.nodes || [];
        return tx;
    }
}
