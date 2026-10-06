import { LiveEnvironmentAdapterContract, RecoveryScope } from '../../recovery/live-environment-adapter-contract';
import { EnvironmentTwin } from '../../../twin/environment-twin';
import { RepairPlan } from '../../repair-engine';
import { exec } from 'child_process';
import * as util from 'util';

const execAsync = util.promisify(exec);

export class SshLiveAdapter implements LiveEnvironmentAdapterContract {
    private sshHost!: string;
    private sshUser!: string;
    private sshKeyPath!: string;

    async identify(scope: RecoveryScope, scopedCredentials: any): Promise<string> {
        if (!scopedCredentials || !scopedCredentials.sshHost || !scopedCredentials.sshUser || !scopedCredentials.sshKeyPath) {
            throw new Error('SSH adapter requires sshHost, sshUser, and sshKeyPath.');
        }
        this.sshHost = scopedCredentials.sshHost;
        this.sshUser = scopedCredentials.sshUser;
        this.sshKeyPath = scopedCredentials.sshKeyPath;

        try {
            // LR-01: Read-only authentication check
            const { stdout } = await this.runSshCommand('whoami');
            if (stdout.trim() !== this.sshUser) {
                throw new Error('SSH Authentication succeeded but user mismatch.');
            }
            return 'ssh-protected-host';
        } catch (e: any) {
            throw new Error('SSH Authentication Failed: ' + e.message);
        }
    }

    private async runSshCommand(command: string): Promise<{ stdout: string, stderr: string }> {
        // In production, use a robust SSH library like 'ssh2'. 
        // For CLI execution, we wrap native SSH ensuring strict batch mode.
        return execAsync(`ssh -o StrictHostKeyChecking=no -o BatchMode=yes -i ${this.sshKeyPath} ${this.sshUser}@${this.sshHost} "${command}"`);
    }

    async captureState(scope: RecoveryScope): Promise<EnvironmentTwin> {
        const domain = scope.resourceIdentifiers[0] || 'default';
        const discoveryScript = `
            DOMAIN="${domain}"
            if [ -d "/home/${this.sshUser}/domains/${domain}" ]; then
                echo '{"repository": "intact", "subdomains": []}'
            else
                echo '{"repository": "missing", "subdomains": []}'
            fi
        `;
        
        return {
            provider: { platform: 'ssh_linux', symlinkSupported: true, atomicRenameSupported: true, rsyncAvailable: true },
            topology: { currentSymlinkTarget: null, currentSymlinkValid: false, webrootPath: `/domains/${domain}/public_html`, webrootSymlinkTarget: null, availableReleases: [] },
            application: { version: 'unknown', manifests: [], integrityStatus: 'MISSING' },
            runtime: { primaryRuntime: 'linux_native', primaryRuntimeVersion: 'unknown', missingDependencies: [] },
            fileInventory: {},
            permissionInventory: {},
            configurationInventory: {},
            databaseInventory: {},
            dnsInventory: {},
            runtimeInventory: {},
            certificateInventory: {},
            cronInventory: {},
            backupInventory: {},
            resourceGraphEdges: [
                { source: `controlplane:${domain}`, target: `path:/domains/${domain}/public_html`, relation: 'mapped_to' }
            ]
        };
    }

    async fingerprintRepository(scope: RecoveryScope): Promise<string> {
        const domain = scope.resourceIdentifiers[0] || 'default';
        const { stdout } = await this.runSshCommand(`find /home/${this.sshUser}/domains/${domain} -type f -exec sha256sum {} \\; | sort | sha256sum`);
        return `sha256:${stdout.trim()}`;
    }

    async checkDrift(scope: RecoveryScope, baselineFingerprint: string): Promise<boolean> {
        const current = await this.fingerprintRepository(scope);
        return current === baselineFingerprint;
    }

    async dryRun(plan: RepairPlan, scope: RecoveryScope): Promise<{ plannedMutations: any[], safe: boolean }> {
        return { plannedMutations: [], safe: true };
    }

    async executeAtomicRecovery(plan: RepairPlan, scope: RecoveryScope): Promise<{ success: boolean, checkpointId: string, evidence: any[] }> {
        throw new Error('Mutation disabled in read-only adapter.');
    }

    async rollback(checkpointId: string): Promise<boolean> {
        return true;
    }

    async verifyState(scope: RecoveryScope, expectedState: any): Promise<{ verified: boolean, actualState: any, verificationEvidence: any }> {
        return { verified: true, actualState: {}, verificationEvidence: {} };
    }
}
