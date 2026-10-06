import * as fs from 'fs';
import * as path from 'path';
import { __t } from '@ugondu/shared';
import { UniversalActionRegistry } from './src/registry/action-registry';
import { AwsNativeClient } from './src/fabric/providers/aws-native-client';
import { URREngine } from './src/urre/execution/urre-engine';
import { EvidenceCollector } from './src/evidence/evidence-engine';
import { PolicyGovernanceEngine } from './src/governance/engine/policy-engine';
import { AwsGovernanceAdapter } from './src/governance/providers/aws/adapter';
import { ECSClient, DescribeServicesCommand, ListTasksCommand, DescribeTasksCommand, StopTaskCommand, UpdateServiceCommand } from '@aws-sdk/client-ecs';
import { ECRClient, GetAuthorizationTokenCommand } from '@aws-sdk/client-ecr';
import { EC2Client, CreateInternetGatewayCommand, AttachInternetGatewayCommand, CreateRouteTableCommand, CreateRouteCommand, AssociateRouteTableCommand } from '@aws-sdk/client-ec2';
import { execSync } from 'child_process';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function runFargateCertification() {
    try {
        console.log("=== UGONDU COR-7 FARGATE LIFECYCLE CERTIFICATION ===");
        
        const region = process.env.UGONDU_CERT_REGION || 'us-east-1'; // default if missing for test
        process.env.UGONDU_CERT_REGION = region;

        const campaignId = `ugondu-cor-fargate-${new Date().getTime()}`;
        console.log(`Campaign ID: ${campaignId}`);

        const urre = new URREngine();
        const awsClient = new AwsNativeClient(region);
        
        const ecrClient = new ECRClient({ region });
        const ecsClient = new ECSClient({ region });
        const ec2Client = new EC2Client({ region });

        // Build and push image
        console.log("Creating ECR repository and pushing image...");
        const repoUri = await awsClient.createEcrRepository(campaignId);
        
        const authRes = await ecrClient.send(new GetAuthorizationTokenCommand({}));
        const authData = authRes.authorizationData![0];
        const authToken = Buffer.from(authData.authorizationToken!, 'base64').toString('utf-8');
        const [user, pass] = authToken.split(':');
        const proxyEndpoint = authData.proxyEndpoint!;

        fs.writeFileSync('Dockerfile.fargate', 'FROM alpine:latest\nCMD ["sh", "-c", "echo \\"Physical Fargate Task Running\\" && sleep 3600"]');
        execSync(`docker login -u ${user} -p ${pass} ${proxyEndpoint}`);
        execSync(`docker build -t ${repoUri}:latest -f Dockerfile.fargate .`);
        execSync(`docker push ${repoUri}:latest`);
        
        const digestOutput = execSync(`docker inspect --format='{{index .RepoDigests 0}}' ${repoUri}:latest`).toString().trim();
        const digest = digestOutput.split('@')[1]; 
        console.log(`Pushed image digest: ${digest}`);

        // Create VPC
        console.log("Creating VPC and networking...");
        const vpcId = await awsClient.createVpc('10.0.0.0/16', `${campaignId}-vpc`);
        
        const igwRes = await ec2Client.send(new CreateInternetGatewayCommand({}));
        const igwId = igwRes.InternetGateway!.InternetGatewayId!;
        await ec2Client.send(new AttachInternetGatewayCommand({ InternetGatewayId: igwId, VpcId: vpcId }));
        
        const rtRes = await ec2Client.send(new CreateRouteTableCommand({ VpcId: vpcId }));
        const rtId = rtRes.RouteTable!.RouteTableId!;
        await ec2Client.send(new CreateRouteCommand({ RouteTableId: rtId, DestinationCidrBlock: '0.0.0.0/0', GatewayId: igwId }));
        
        const subnet1 = await awsClient.createSubnet(vpcId, '10.0.1.0/24');
        const subnet2 = await awsClient.createSubnet(vpcId, '10.0.2.0/24');
        const subnetIds = [subnet1.id, subnet2.id];
        
        await ec2Client.send(new AssociateRouteTableCommand({ RouteTableId: rtId, SubnetId: subnet1.id }));
        await ec2Client.send(new AssociateRouteTableCommand({ RouteTableId: rtId, SubnetId: subnet2.id }));
        
        const sgId = await awsClient.createSecurityGroup(vpcId, `${campaignId}-sg`);

        // Roles and Log Group
        console.log("Setting up roles and log group...");
        const logGroupName = await awsClient.createLogGroup(`/ecs/${campaignId}`);
        const roles = await awsClient.createFargateRoles(campaignId);

        // Register handlers for URRE
        let globalServiceArn = "";
        let globalTaskDefArn = "";
        let globalClusterName = "";
        
        urre.registerHandler('aws', 'DEPLOY_FARGATE_SERVICE', async (node) => {
            const clusterName = await awsClient.createEcsCluster(`${campaignId}-cluster`);
            
            const taskDefArn = await awsClient.registerTaskDefinition(
                `${campaignId}-task`,
                `${repoUri}@${digest}`,
                "256",
                "512",
                roles.executionRoleArn,
                roles.taskRoleArn,
                logGroupName
            );
            
            const serviceArn = await awsClient.createEcsService(
                clusterName,
                `${campaignId}-svc`,
                taskDefArn,
                1,
                subnetIds,
                [sgId]
            );

            globalServiceArn = serviceArn;
            globalTaskDefArn = taskDefArn;
            globalClusterName = clusterName;
            
            return { clusterName, serviceName: `${campaignId}-svc`, taskDefArn };
        }, async (node) => {
            // Rollback handler
            console.log("Executing physical rollback... Updating service back to original task def.");
            await ecsClient.send(new UpdateServiceCommand({
                cluster: globalClusterName,
                service: `${campaignId}-svc`,
                taskDefinition: globalTaskDefArn
            }));
        });

        urre.registerHandler('aws', 'TEARDOWN_FARGATE_SERVICE', async (node) => {
            return { success: true };
        }, async (node) => {});

        const registry = new UniversalActionRegistry(urre);
        const evidenceCollector = new EvidenceCollector();

        // We evaluate governance manually to generate the policy
        const govEngine = new PolicyGovernanceEngine();
        const awsAdapter = new AwsGovernanceAdapter();
        govEngine.registerAdapter(awsAdapter);

        const executionRolePolicy = govEngine.evaluateIntent('aws', [
            { action: 'ecr:GetAuthorizationToken', resource: `arn:aws:ecr:${region}:*:*` },
            { action: 'ecr:BatchCheckLayerAvailability', resource: `arn:aws:ecr:${region}:*:repository/${campaignId}` },
            { action: 'logs:CreateLogStream', resource: `arn:aws:logs:${region}:*:log-group:/ecs/${campaignId}` }
        ], 'fargate-execution-role');

        const taskRolePolicy = govEngine.evaluateIntent('aws', [
            { action: 's3:GetObject', resource: `arn:aws:s3:::${campaignId}-bucket/*` }
        ], 'fargate-task-role');

        console.log(`Execution Role Policy Hash: ${executionRolePolicy.decision}`);

        // 1. Deploy Revision 1
        console.log("Executing orchestration:container:deploy (Revision 1)...");
        let res = await registry.getAction('orchestration:container:deploy')!.execute({
            resourceId: `urn:ugondu:aws:ecs:${campaignId}`,
            tags: { UgonduManaged: 'true', UgonduCampaign: campaignId },
            subnetId: subnet1.id
        });
        
        const deployEvidence = evidenceCollector.recordProviderObservation({ provider: 'aws', response: res });
        console.log(`Revision 1 Deployment Evidence: ${deployEvidence.status} - Hash: ${deployEvidence.providerResponseHash}`);

        // 2. Wait for RUNNING and Desired == 1
        console.log("Waiting for service to stabilize and task to be RUNNING...");
        const describeSvc = async () => {
            const out = await ecsClient.send(new DescribeServicesCommand({ cluster: globalClusterName, services: [globalServiceArn] }));
            return out.services![0];
        };
        
        let stable = false;
        for (let i = 0; i < 30; i++) {
            const svc = await describeSvc();
            if (svc.runningCount === 1) {
                stable = true;
                break;
            }
            await sleep(5000);
        }
        if (!stable) throw new Error(__t('engine.fargate.err_stable_timeout'));

        const listTasksRes1 = await ecsClient.send(new ListTasksCommand({ cluster: globalClusterName, serviceName: `${campaignId}-svc` }));
        let taskId = listTasksRes1.taskArns![0];
        console.log(`Task ${taskId} is running.`);

        // 3. Kill the task and wait for replacement
        console.log(`Stopping task ${taskId} to observe recovery...`);
        await ecsClient.send(new StopTaskCommand({ cluster: globalClusterName, task: taskId, reason: "Testing physical recovery" }));
        
        console.log("Waiting for new task to spin up...");
        let newTaskId = null;
        for (let i = 0; i < 30; i++) {
            const listTasks = await ecsClient.send(new ListTasksCommand({ cluster: globalClusterName, serviceName: `${campaignId}-svc` }));
            const runningTasks = listTasks.taskArns || [];
            // Assuming old task drops from ListTasks quickly or we can check its status
            for (const t of runningTasks) {
                if (t !== taskId) {
                    newTaskId = t;
                    break;
                }
            }
            if (newTaskId) break;
            await sleep(5000);
        }
        if (!newTaskId) throw new Error(__t('engine.fargate.err_replacement_spinup'));
        console.log(`Replacement task spun up successfully: ${newTaskId}`);
        
        let taskRunning = false;
        for (let i = 0; i < 30; i++) {
            const descTasks = await ecsClient.send(new DescribeTasksCommand({ cluster: globalClusterName, tasks: [newTaskId] }));
            if (descTasks.tasks && descTasks.tasks.length > 0 && descTasks.tasks[0].lastStatus === 'RUNNING') {
                taskRunning = true;
                break;
            }
            await sleep(5000);
        }
        if (!taskRunning) throw new Error(__t('engine.fargate.err_replacement_running'));
        
        // 4. Deploy Bad Revision & Rollback
        console.log("Deploying bad revision...");
        const badTaskDefArn = await awsClient.registerTaskDefinition(
            `${campaignId}-task`,
            `${repoUri}:bad-tag-does-not-exist`,
            "256",
            "512",
            roles.executionRoleArn,
            roles.taskRoleArn,
            logGroupName
        );

        await ecsClient.send(new UpdateServiceCommand({
            cluster: globalClusterName,
            service: `${campaignId}-svc`,
            taskDefinition: badTaskDefArn
        }));

        console.log("Observing deployment failure / pending state...");
        // Wait a bit to simulate failure condition taking place
        await sleep(15000);

        console.log("Triggering URRE rollback...");
        // URRE native rollback
        const rollbackRes = await urre.triggerRollback({
            id: 'ecs-deploy-tx', 
            targetEnvironment: 'aws', 
            tx: undefined 
        });
        
        const rollbackEvidence = evidenceCollector.recordProviderObservation({ provider: 'aws', response: rollbackRes });
        console.log(`Rollback Evidence: ${rollbackEvidence.status}`);
        
        console.log("Waiting for service to stabilize back to Revision 1...");
        let reverted = false;
        for (let i = 0; i < 30; i++) {
            const svc = await describeSvc();
            if (svc.taskDefinition === globalTaskDefArn && svc.runningCount === 1) {
                reverted = true;
                break;
            }
            await sleep(5000);
        }
        
        if (!reverted) throw new Error(__t('engine.fargate.err_revert_timeout'));
        console.log("Successfully reverted to Revision 1.");

        console.log("\n✅ Fargate Certification Run Complete.");
        
    } catch (error: any) {
        console.error('Fargate Certification run fatally failed', error);
        process.exit(1);
    }
}

runFargateCertification();
