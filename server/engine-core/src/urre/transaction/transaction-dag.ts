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

export interface TransactionDag {
    id: string;
    status: TransactionState;
    nodes: DagNode[];
    edges: DagEdge[];
    createdAt: number;
    updatedAt: number;
}
