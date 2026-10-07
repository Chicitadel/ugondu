import { LiveEnvironmentAdapterContract, RecoveryScope } from '../../recovery/live-environment-adapter-contract';
import { EnvironmentTwin } from '../../../twin/environment-twin';
import { RepairPlan } from '../../repair-engine';
import { execFileSync } from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

interface RecoveryOperation {
    id: string;
    targetPath: string;
    kind: 'CREATE_DIRECTORY' | 'WRITE_FILE' | 'DELETE_FILE';
    content?: string;
    mode?: number;
    expectedHash?: string;
}

interface CheckpointOperation {
    operationId: string;
    path: string;
    existedBefore: boolean;
    backupPath?: string;
    previousHash?: string;
}

interface RecoveryCheckpoint {
    checkpointId: string;
    target: string;
    createdAt: string;
    operations: CheckpointOperation[];
}

export class SshLiveAdapter implements LiveEnvironmentAdapterContract {
    private getTarget(scope: RecoveryScope): string {
        if (!scope.targetUri || scope.targetUri === 'local') {
            return 'localhost';
        }

        return scope.targetUri;
    }

    private checkpointDir(): string {
        const dir = process.env.UGONDU_CHECKPOINT_DIR ||
            path.join(os.homedir(), '.ugondu', 'checkpoints');

        fs.mkdirSync(dir, { recursive: true });
        return dir;
    }

    private checkpointPath(checkpointId: string): string {
        return path.join(this.checkpointDir(), `${checkpointId}.json`);
    }

    private persistCheckpoint(checkpoint: RecoveryCheckpoint): void {
        const file = this.checkpointPath(checkpoint.checkpointId);
        const tmp = `${file}.${process.pid}.${crypto.randomBytes(8).toString('hex')}.tmp`;
        fs.writeFileSync(tmp, JSON.stringify(checkpoint, null, 2), 'utf8');
        fs.renameSync(tmp, file);
    }

    private loadCheckpoint(checkpointId: string): RecoveryCheckpoint {
        const file = this.checkpointPath(checkpointId);

        if (!fs.existsSync(file)) {
            throw new Error('RECOVERY_CHECKPOINT_NOT_FOUND');
        }

        const checkpoint = JSON.parse(
            fs.readFileSync(file, 'utf8')
        ) as RecoveryCheckpoint;

        if (checkpoint.checkpointId !== checkpointId) {
            throw new Error('RECOVERY_CHECKPOINT_ID_MISMATCH');
        }

        return checkpoint;
    }

    private execRemote(target: string, command: string, args: string[] = []): string {
        if (target === 'localhost') {
            return execFileSync(command, args, {
                stdio: ['ignore', 'pipe', 'pipe'],
                encoding: 'utf8'
            }).trim();
        }

        const knownHosts = process.env.UGONDU_SSH_KNOWN_HOSTS;
        const keyPath = process.env.UGONDU_SSH_KEY_PATH;
        const user = process.env.UGONDU_SSH_USER;

        if (!knownHosts || !keyPath || !user) {
            throw new Error('SSH_TRUST_CONFIGURATION_MISSING');
        }

        const port = process.env.UGONDU_SSH_PORT || '22';
        const remote = `${user}@${target}`;

        const remoteCommand = [command, ...args]
            .map(v => this.shellQuote(v))
            .join(' ');

        return execFileSync(
            'ssh',
            [
                '-o', 'BatchMode=yes',
                '-o', 'StrictHostKeyChecking=yes',
                '-o', `UserKnownHostsFile=${knownHosts}`,
                '-i', keyPath,
                '-p', port,
                remote,
                '--',
                remoteCommand
            ],
            {
                stdio: ['ignore', 'pipe', 'pipe'],
                encoding: 'utf8'
            }
        ).trim();
    }

    private shellQuote(value: string): string {
        return `'${value.replace(/'/g, `'\\''`)}'`;
    }

    async identify(scope: RecoveryScope): Promise<any> {
        const target = this.getTarget(scope);

        return {
            host: this.execRemote(target, 'hostname'),
            os: this.execRemote(target, 'uname', ['-a']),
            kernel: this.execRemote(target, 'uname', ['-r'])
        };
    }

    async captureState(scope: RecoveryScope): Promise<EnvironmentTwin> {
        const id = await this.identify(scope);

        const twin = {
            provider: {
                platform: 'ssh',
                region: 'remote'
            },
            topology: {
                nodes: [{
                    id: id.host,
                    type: 'compute',
                    provider: 'ssh',
                    config: {
                        os: id.os,
                        kernel: id.kernel
                    }
                }]
            },
            application: {
                name: scope.applicationId || 'default'
            },
            runtime: {
                variables: {}
            },
            resourceGraphEdges: []
        };

        return twin as unknown as EnvironmentTwin;
    }

    async verifyState(
        scope: RecoveryScope,
        expectedState: any
    ): Promise<{
        verified: boolean;
        actualState: any;
        verificationEvidence: any;
    }> {
        const actualState = await this.identify(scope);

        const expectedOperations: RecoveryOperation[] =
            Array.isArray(expectedState?.operations)
                ? expectedState.operations
                : [];

        const operationResults = expectedOperations.map(operation => {
            const actualHash = this.hashPath(scope, operation.targetPath);

            return {
                operationId: operation.id,
                expected: operation.expectedHash || null,
                actual: actualHash,
                matched: operation.expectedHash
                    ? actualHash === operation.expectedHash
                    : true
            };
        });

        const verified =
            actualState.host === expectedState?.host &&
            operationResults.every(result => result.matched);

        return {
            verified,
            actualState,
            verificationEvidence: {
                checkedAt: new Date().toISOString(),
                match: verified,
                targetFingerprint: await this.fingerprintRepository(scope),
                operationResults
            }
        };
    }

    async rollback(checkpointId: string): Promise<boolean> {
        try {
            const checkpoint = this.loadCheckpoint(checkpointId);

            for (const operation of [...checkpoint.operations].reverse()) {
                if (operation.backupPath) {
                    this.execRemote(
                        checkpoint.target,
                        'cp',
                        [operation.backupPath, operation.path]
                    );
                } else if (!operation.existedBefore) {
                    this.execRemote(
                        checkpoint.target,
                        'rm',
                        ['-f', operation.path]
                    );
                }
            }

            return true;
        } catch {
            return false;
        }
    }

    async dryRun(
        plan: RepairPlan,
        _scope: RecoveryScope
    ): Promise<{ safe: boolean; plannedMutations: any[] }> {
        const repairs = Array.isArray(plan.infrastructureRepairs)
            ? plan.infrastructureRepairs
            : [];

        const invalid = repairs.filter(
            repair => !repair ||
                typeof repair.id !== 'string' ||
                typeof repair.targetPath !== 'string' ||
                !['CREATE_DIRECTORY', 'WRITE_FILE', 'DELETE_FILE'].includes(repair.kind)
        );

        if (invalid.length > 0) {
            return {
                safe: false,
                plannedMutations: repairs
            };
        }

        return {
            safe: true,
            plannedMutations: repairs
        };
    }

    async executeAtomicRecovery(
        plan: RepairPlan,
        scope: RecoveryScope
    ): Promise<{
        success: boolean;
        evidence: any;
        checkpointId: string;
    }> {
        const target = this.getTarget(scope);
        const repairs = (plan.infrastructureRepairs || []) as RecoveryOperation[];

        if (repairs.length === 0) {
            throw new Error('EXECUTION_PLAN_NOT_EXECUTABLE');
        }

        const checkpointId = crypto.randomBytes(16).toString('hex');
        const checkpoint: RecoveryCheckpoint = {
            checkpointId,
            target,
            createdAt: new Date().toISOString(),
            operations: []
        };

        const evidence: any[] = [];

        try {
            for (const repair of repairs) {
                const exists = this.pathExists(scope, repair.targetPath);
                const previousHash = exists
                    ? this.hashPath(scope, repair.targetPath)
                    : undefined;

                let backupPath: string | undefined;

                if (exists) {
                    backupPath = `/tmp/ugondu-checkpoint-${checkpointId}-${crypto.randomBytes(8).toString('hex')}`;
                    this.execRemote(
                        target,
                        'cp',
                        [repair.targetPath, backupPath]
                    );
                }

                checkpoint.operations.push({
                    operationId: repair.id,
                    path: repair.targetPath,
                    existedBefore: exists,
                    backupPath,
                    previousHash
                });

                this.persistCheckpoint(checkpoint);

                switch (repair.kind) {
                    case 'CREATE_DIRECTORY':
                        this.execRemote(target, 'mkdir', ['-p', repair.targetPath]);
                        break;

                    case 'WRITE_FILE':
                        if (typeof repair.content !== 'string') {
                            throw new Error(`MISSING_CONTENT_${repair.id}`);
                        }

                        this.execRemote(
                            target,
                            'sh',
                            ['-c', `printf '%s' ${this.shellQuote(repair.content)} > ${this.shellQuote(repair.targetPath)}`]
                        );
                        break;

                    case 'DELETE_FILE':
                        this.execRemote(target, 'rm', ['-f', repair.targetPath]);
                        break;

                    default:
                        throw new Error(`UNSUPPORTED_RECOVERY_OPERATION_${repair.id}`);
                }

                evidence.push({
                    repairId: repair.id,
                    operation: repair.kind,
                    targetPath: repair.targetPath,
                    status: 'MUTATED',
                    target,
                    executedAt: new Date().toISOString()
                });
            }

            return {
                success: true,
                evidence,
                checkpointId
            };
        } catch (error) {
            await this.rollback(checkpointId);

            return {
                success: false,
                evidence: [
                    ...evidence,
                    {
                        status: 'FAILED',
                        error: error instanceof Error ? error.message : String(error)
                    }
                ],
                checkpointId
            };
        }
    }

    async fingerprintRepository(scope: RecoveryScope): Promise<string> {
        const target = this.getTarget(scope);
        const root = scope.repositoryPath || '/';

        const listing = this.execRemote(
            target,
            'find',
            [root, '-xdev', '-type', 'f', '-printf', '%p\\0%u\\0%g\\0%m\\0%s\\0%T@\\0']
        );

        const normalized = listing
            .split('\0')
            .filter(Boolean)
            .join('\0');

        if (!normalized) {
            throw new Error('FINGERPRINT_SCOPE_EMPTY');
        }

        return crypto
            .createHash('sha256')
            .update(normalized, 'utf8')
            .digest('hex');
    }

    async checkDrift(
        scope: RecoveryScope,
        baselineFingerprint: string
    ): Promise<boolean> {
        const current = await this.fingerprintRepository(scope);

        // true means "safe: no drift".
        return current === baselineFingerprint;
    }

    private pathExists(scope: RecoveryScope, targetPath: string): boolean {
        try {
            this.execRemote(this.getTarget(scope), 'test', ['-e', targetPath]);
            return true;
        } catch {
            return false;
        }
    }

    private hashPath(scope: RecoveryScope, targetPath: string): string {
        const target = this.getTarget(scope);

        try {
            return this.execRemote(
                target,
                'sha256sum',
                [targetPath]
            ).split(/\s+/)[0];
        } catch {
            return '';
        }
    }
}
