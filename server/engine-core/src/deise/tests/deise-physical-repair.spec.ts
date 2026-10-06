import { DirectAdminNativeClient } from '../../fabric/providers/directadmin-native-client';
import { DeploymentRepairEngine } from '../../deise/engine/repair-engine';
import { EnvironmentTwin } from '../../deise/twin/environment-twin';
import { PhysicalRepairExecutor } from '../../deise/engine/physical-repair-executor';
import { NodeSSH } from 'node-ssh';

// Mock NodeSSH to intercept the physical commands
jest.mock('node-ssh', () => {
  return {
    NodeSSH: jest.fn().mockImplementation(() => {
      return {
        connect: jest.fn().mockResolvedValue(true),
        execCommand: jest.fn().mockResolvedValue({ code: 0, stdout: 'OK', stderr: '' }),
        dispose: jest.fn()
      };
    })
  };
});

describe('Gate D: DEISE Physical Repair E2E (DirectAdmin)', () => {
    let client: DirectAdminNativeClient;
    let engine: DeploymentRepairEngine;
    let executor: PhysicalRepairExecutor;

    beforeEach(() => {
        client = new DirectAdminNativeClient('127.0.0.1', 22, 'admin', '/fake/key');
        engine = new DeploymentRepairEngine();
        executor = new PhysicalRepairExecutor(client);
    });

    it('detects a broken public_html symlink and physically repairs it without re-upload', async () => {
        // 1. Model the Broken State (The DirectAdmin Incident)
        const twin: any = { provider: {}, runtime: {} };
        twin.topology = {
            id: 'da-prod',
            version: '1.0',
            currentSymlinkValid: false, components: [
                { id: 'public_html', type: 'SYMLINK', state: 'BROKEN_TARGET' }
            ]
        };
        twin.application = {
            id: 'app-release',
            version: '2.4',
            checksum: 'valid-checksum',
            currentSymlinkValid: false, components: [
                { id: 'index.php', type: 'FILE', state: 'VALID' }
            ]
        };

        // 2. Generate Repair Plan
        const plan = await engine.diagnoseEnvironment(twin, 'expected-v2');

        // Assert: Topology is broken, but app is intact. We MUST NOT blindly reupload.
        expect(plan.requiresTopologyRepair).toBe(true);
        expect(plan.requiresApplicationUpload).toBe(false); // NO RE-UPLOAD!
        expect(plan.destructiveDeleteBlocked).toBe(true); // Don't wipe the app!

        // 3. Execute Physical Repair
        const execSpy = jest.spyOn((client as any).ssh, 'execCommand');
        const success = await executor.executeRepair(plan, 'ugondu_site', 'admin');

        expect(success).toBe(true);

        // 4. Verify the exact SSH command was issued
        expect(execSpy).toHaveBeenCalledWith("mkdir -p /home/'admin'/domains/'ugondu_site'/public_html");
    });
});

import { AwsPhysicalRepairExecutor } from '../../deise/engine/aws-physical-repair-executor';
describe('Gate D: DEISE Physical Repair E2E (AWS)', () => {
    it('detects EC2 infrastructure drift and dispatches reconciliation', async () => {
        const mockAwsClient: any = { };
        const engine = new DeploymentRepairEngine();
        const executor = new AwsPhysicalRepairExecutor(mockAwsClient);

        const twin: any = { provider: {}, topology: {}, application: {}, runtime: {}, infrastructure: [
            { id: 'i-12345', type: 'EC2', expectedState: { instanceType: 't3.micro' }, actualState: { instanceType: 't3.large' } }
        ] };

        const plan = await engine.diagnoseEnvironment(twin, 'expected-v2');

        expect(plan.requiresInfrastructureRepair).toBe(true);
        const success = await executor.executeRepair(plan);
        expect(success).toBe(true);
    });
});

