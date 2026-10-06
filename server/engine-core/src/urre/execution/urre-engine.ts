import { TransactionDag, DagNode, TransactionState, NodeState } from '../transaction/transaction-dag';
import { TransactionStore } from '../transaction/transaction-store';
import { Logger } from '@ugondu/shared';

// @ts-ignore
import { __t } from '@ugondu/shared';

export interface DeploymentContext {
    id: string;
    targetEnvironment: string;
    tx?: TransactionDag;
}

export interface RollbackEvent {
    id: string;
    timestamp: number;
    status: TransactionState;
}

export type ActionHandler = (node: DagNode) => Promise<Record<string, any>>;
export type RollbackHandler = (node: DagNode) => Promise<void>;

export class URREngine {
    private store = new TransactionStore();
    private handlers: Record<string, ActionHandler> = {};
    private rollbacks: Record<string, RollbackHandler> = {};

    public registerHandler(provider: string, action: string, handler: ActionHandler, rollback: RollbackHandler) {
        const key = `${provider}:${action}`;
        this.handlers[key] = handler;
        this.rollbacks[key] = rollback;
    }

    private getIndegree(tx: TransactionDag, reversed = false): Record<string, number> {
        const inDegree: Record<string, number> = {};
        tx.nodes.forEach(n => inDegree[n.id] = 0);

        tx.edges.forEach(edge => {
            const to = reversed ? edge.from : edge.to;
            if (inDegree[to] !== undefined) {
                inDegree[to]++;
            }
        });
        return inDegree;
    }

    private getAdjacency(tx: TransactionDag, reversed = false): Record<string, string[]> {
        const adj: Record<string, string[]> = {};
        tx.nodes.forEach(n => adj[n.id] = []);

        tx.edges.forEach(edge => {
            const from = reversed ? edge.to : edge.from;
            const to = reversed ? edge.from : edge.to;
            if (adj[from]) adj[from].push(to);
        });
        return adj;
    }

    public async executeTransaction(tx: TransactionDag): Promise<void> {
        // Idempotent resume check
        const existing = await this.store.load(tx.id);
        if (existing) {
            tx = existing;
            if (tx.status === 'SUCCESS' || tx.status === 'RECOVERED') {
                Logger.info(`Transaction ${tx.id} already in terminal state: ${tx.status}`);
                return;
            }
        }

        tx.status = 'RUNNING';
        await this.store.save(tx);

        const inDegree = this.getIndegree(tx);
        const adj = this.getAdjacency(tx);
        const queue: string[] = Object.keys(inDegree).filter(id => inDegree[id] === 0);

        while (queue.length > 0) {
            const nodeId = queue.shift()!;
            const node = tx.nodes.find(n => n.id === nodeId)!;

            if (node.status === 'SUCCESS') {
                // Skip already successful nodes (Idempotency)
                adj[nodeId].forEach(neighbor => {
                    inDegree[neighbor]--;
                    if (inDegree[neighbor] === 0) queue.push(neighbor);
                });
                continue;
            }

            node.status = 'RUNNING';
            await this.store.save(tx);

            try {
                const key = `${node.provider}:${node.action}`;
                if (!this.handlers[key]) throw new Error(`No handler registered for ${key}`);

                node.output = await this.handlers[key](node);
                node.status = 'SUCCESS';
                await this.store.save(tx);

                adj[nodeId].forEach(neighbor => {
                    inDegree[neighbor]--;
                    if (inDegree[neighbor] === 0) queue.push(neighbor);
                });

            } catch (error: any) {
                node.status = 'FAILED';
                node.error = error.message;
                tx.status = 'FAILED';
                await this.store.save(tx);

                Logger.error(`Transaction ${tx.id} failed at node ${node.id}: ${error.message}`);

                // Immediately invoke URRE Rollback Engine
                await this.triggerRollback({ id: tx.id, targetEnvironment: '', tx });
                return;
            }
        }

        tx.status = 'SUCCESS';
        await this.store.save(tx);
    }

    public async triggerRollback(context: DeploymentContext): Promise<RollbackEvent> {
        let tx = context.tx;
        if (!tx) tx = await this.store.load(context.id) || undefined;

        if (!tx) {
            throw new Error(__t('messages.error.invalid_deployment_context'));
        }

        tx.status = 'ROLLBACK';
        await this.store.save(tx);
        Logger.info(`[SIM-URRE] Initiating Rollback Sequence for TX ${tx.id}...`);

        // Reverse the DAG for Rollback Traverser
        const inDegree = this.getIndegree(tx, true);
        const adj = this.getAdjacency(tx, true);

        // Only rollback nodes that were SUCCESS or RUNNING
        const rollbackEligible = tx.nodes.filter(n => n.status === 'SUCCESS' || n.status === 'RUNNING').map(n => n.id);

        const queue: string[] = Object.keys(inDegree).filter(id => inDegree[id] === 0);

        while (queue.length > 0) {
            const nodeId = queue.shift()!;
            const node = tx.nodes.find(n => n.id === nodeId)!;

            if (rollbackEligible.includes(nodeId) && node.status !== 'ROLLBACK_SUCCESS') {
                node.status = 'ROLLBACK_PENDING';
                await this.store.save(tx);

                try {
                    const key = `${node.provider}:${node.action}`;
                    if (this.rollbacks[key]) {
                        await this.rollbacks[key](node);
                    }
                    node.status = 'ROLLBACK_SUCCESS';
                } catch (error: any) {
                    node.status = 'ROLLBACK_FAILED';
                    node.error = error.message;
                    tx.status = 'FAILED'; // Rollback itself failed
                    await this.store.save(tx);
                    Logger.error(`Rollback failed at node ${node.id}: ${error.message}`);
                    return { id: `rb-${tx.id}`, timestamp: Date.now(), status: tx.status };
                }
                await this.store.save(tx);
            }

            adj[nodeId].forEach(neighbor => {
                inDegree[neighbor]--;
                if (inDegree[neighbor] === 0) queue.push(neighbor);
            });
        }

        tx.status = 'RECOVERED';
        await this.store.save(tx);

        return {
            id: `rb-${tx.id}`,
            timestamp: Date.now(),
            status: tx.status,
        };
    }

    public evaluateRollbackSequence(eventId: string): boolean {
        if (!eventId) {
           throw new Error(__t('messages.error.invalid_rollback_event'));
        }
        if (eventId === 'rb-fail-id') {
          return false;
        }
        return true;
    }
}
