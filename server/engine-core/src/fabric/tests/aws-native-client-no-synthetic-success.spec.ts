import { AwsNativeClient } from '../providers/aws-native-client';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

describe('AwsNativeClient refuses synthetic deployment success', () => {
  const savedEnv: Record<string, string | undefined> = {};
  const envKeys = [
    'UGONDU_ECS_EXECUTION_ROLE_ARN',
    'UGONDU_ECS_TASK_ROLE_ARN',
    'UGONDU_ECS_LOG_GROUP',
    'UGONDU_ECS_TASK_CPU',
    'UGONDU_ECS_TASK_MEMORY',
    'UGONDU_ECS_SUBNET_IDS',
    'UGONDU_ECS_SECURITY_GROUP_IDS',
    'UGONDU_ECS_DESIRED_COUNT',
  ];

  let client: AwsNativeClient;
  let runtimeCalls: Array<{ command: string; args: string[]; stdin?: string }>;
  let runtime: { run: jest.Mock };

  beforeEach(() => {
    for (const key of envKeys) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
    runtimeCalls = [];
    runtime = {
      run: jest.fn(async (command: string, args: string[], stdin?: string) => {
        runtimeCalls.push({ command, args, stdin });
        if (args[0] === 'image' && args[1] === 'inspect' && args[2] === '--format' && args[3] === '{{.Id}}') {
          return { stdout: `sha256:${'b'.repeat(64)}`, stderr: '' };
        }
        if (args[0] === 'image' && args[1] === 'inspect' && args[2] === '--format' && args[3] === '{{index .RepoDigests 0}}') {
          return { stdout: `123456789012.dkr.ecr.eu-west-3.amazonaws.com/repo@sha256:${'a'.repeat(64)}`, stderr: '' };
        }
        return { stdout: '', stderr: '' };
      }),
    };
    client = new AwsNativeClient('eu-west-3', undefined, 'test-tx', runtime);
  });

  afterEach(() => {
    for (const key of envKeys) {
      const oldValue = savedEnv[key];
      if (oldValue === undefined) delete process.env[key];
      else process.env[key] = oldValue;
    }
    jest.restoreAllMocks();
  });

  it('builds a real Docker image from a real Dockerfile instead of hashing input text', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-image-build-'));
    const dockerfile = path.join(dir, 'Dockerfile');
    fs.writeFileSync(dockerfile, 'FROM scratch\n');
    try {
      const result = await client.buildContainerImage(dockerfile, 'ugondu-test:local');
      expect(result.id).toBe(`sha256:${'b'.repeat(64)}`);
      expect(runtime.run).toHaveBeenCalledWith('docker', ['build', '--file', dockerfile, '--tag', 'ugondu-test:local', dir]);
      expect(runtimeCalls.some((call) => call.args[0] === 'build')).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects a missing Dockerfile without returning a fabricated image ID', async () => {
    await expect(client.buildContainerImage('/missing/ugondu/Dockerfile', 'ugondu-test:local'))
      .rejects.toThrow('CONTAINER_DOCKERFILE_NOT_FOUND');
    expect(runtime.run).not.toHaveBeenCalled();
  });

  it('authenticates to the configured-region ECR registry and verifies the pushed digest', async () => {
    (client as any).ecr.send = jest.fn().mockResolvedValue({
      authorizationData: [{
        authorizationToken: Buffer.from('AWS:test-password').toString('base64'),
        proxyEndpoint: 'https://123456789012.dkr.ecr.eu-west-3.amazonaws.com',
      }],
    });
    const result = await client.pushContainerImage(`sha256:${'b'.repeat(64)}`, '123456789012.dkr.ecr.eu-west-3.amazonaws.com/repo:release');
    expect(result.digest).toBe(`sha256:${'a'.repeat(64)}`);
    expect(result.id).toContain('@sha256:');
    expect(runtimeCalls[0].args).toEqual(['login', '--username', 'AWS', '--password-stdin', 'https://123456789012.dkr.ecr.eu-west-3.amazonaws.com']);
    expect(runtimeCalls[0].stdin).toBe('test-password');
    expect(runtimeCalls.some((call) => call.args[0] === 'push')).toBe(true);
  });

  it('rejects an ECR repository URI from a different region before Docker login', async () => {
    await expect(client.pushContainerImage('sha256:abc', '123456789012.dkr.ecr.us-east-1.amazonaws.com/repo'))
      .rejects.toThrow('ECR_REPOSITORY_URI_OUTSIDE_CONFIGURED_REGION');
    expect(runtime.run).not.toHaveBeenCalled();
  });

  it('does not manufacture an ECS task-definition ARN when deployment roles are missing', async () => {
    await expect(client.createTaskDefinition('ugondu-api', 'image:tag'))
      .rejects.toThrow('ECS_TASK_DEFINITION_CONFIGURATION_MISSING');
  });

  it('registers and deregisters real task definitions through the ECS client', async () => {
    process.env.UGONDU_ECS_EXECUTION_ROLE_ARN = 'arn:aws:iam::123456789012:role/ecs-execution';
    process.env.UGONDU_ECS_TASK_ROLE_ARN = 'arn:aws:iam::123456789012:role/ugondu-task';
    process.env.UGONDU_ECS_LOG_GROUP = '/ugondu/staging';
    const taskArn = 'arn:aws:ecs:eu-west-3:123456789012:task-definition/ugondu-api:7';
    jest.spyOn(client, 'registerTaskDefinition').mockResolvedValue(taskArn);
    await expect(client.createTaskDefinition('ugondu-api', '123456789012.dkr.ecr.eu-west-3.amazonaws.com/ugondu:1'))
      .resolves.toEqual({ id: taskArn });
    expect(client.registerTaskDefinition).toHaveBeenCalledWith(
      'ugondu-api',
      '123456789012.dkr.ecr.eu-west-3.amazonaws.com/ugondu:1',
      '512',
      '1024',
      process.env.UGONDU_ECS_EXECUTION_ROLE_ARN,
      process.env.UGONDU_ECS_TASK_ROLE_ARN,
      '/ugondu/staging',
    );
    const send = jest.fn().mockResolvedValue({});
    (client as any).ecs.send = send;
    await client.deleteTaskDefinition(taskArn);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].input.taskDefinition).toBe(taskArn);
  });

  it('creates ECS services only with bounded, explicitly configured networking', async () => {
    process.env.UGONDU_ECS_SUBNET_IDS = 'subnet-a,subnet-b';
    process.env.UGONDU_ECS_SECURITY_GROUP_IDS = 'sg-a';
    const serviceArn = 'arn:aws:ecs:eu-west-3:123456789012:service/ugondu-staging/ugondu-api';
    jest.spyOn(client, 'createEcsService').mockResolvedValue(serviceArn);
    await expect(client.createContainerService('ugondu-staging', 'ugondu-api', 'arn:aws:ecs:eu-west-3:123456789012:task-definition/ugondu-api:7'))
      .resolves.toEqual({ id: serviceArn });
    expect(client.createEcsService).toHaveBeenCalledWith(
      'ugondu-staging', 'ugondu-api',
      'arn:aws:ecs:eu-west-3:123456789012:task-definition/ugondu-api:7',
      1, ['subnet-a', 'subnet-b'], ['sg-a'],
    );
  });

  it('rejects an unbounded ECS desired count and does not claim a successful rollout', async () => {
    process.env.UGONDU_ECS_SUBNET_IDS = 'subnet-a,subnet-b';
    process.env.UGONDU_ECS_SECURITY_GROUP_IDS = 'sg-a';
    process.env.UGONDU_ECS_DESIRED_COUNT = '20';
    await expect(client.createContainerService('ugondu-staging', 'ugondu-api', 'arn:aws:ecs:eu-west-3:123456789012:task-definition/ugondu-api:7'))
      .rejects.toThrow('ECS_SERVICE_CONFIGURATION_INVALID');
  });

  it('updates a real ECS service and requires a concrete previous revision for rollback', async () => {
    const serviceArn = 'arn:aws:ecs:eu-west-3:123456789012:service/ugondu-staging/ugondu-api';
    const taskArn = 'arn:aws:ecs:eu-west-3:123456789012:task-definition/ugondu-api:8';
    const send = jest.fn().mockResolvedValue({ service: { serviceArn } });
    (client as any).ecs.send = send;
    await expect(client.deployFargate({ cluster: 'ugondu-staging', serviceName: 'ugondu-api', taskDefinitionArn: taskArn, desiredCount: 1 }))
      .resolves.toEqual({ id: serviceArn });
    expect(send.mock.calls[0][0].input.taskDefinition).toBe(taskArn);
    await expect(client.rollbackFargateDeployment(serviceArn))
      .rejects.toThrow('ECS_ROLLBACK_PREVIOUS_TASK_DEFINITION_REQUIRED');
    await expect(client.rollbackFargateDeployment(serviceArn, 'arn:aws:ecs:eu-west-3:123456789012:task-definition/ugondu-api:7'))
      .resolves.toBeUndefined();
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('uses real ECS service describe results and never synthesizes an ACTIVE service', async () => {
    const send = jest.fn().mockResolvedValue({ services: [], failures: [{ reason: 'MISSING' }] });
    (client as any).ecs.send = send;
    await expect(client.describeServices('ugondu-staging', ['missing-service']))
      .rejects.toThrow();
  });
});
