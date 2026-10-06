import { __t } from '@ugondu/shared';
import { UniversalActionRegistry } from './src/registry/action-registry';
import { URREngine } from './src/urre/execution/urre-engine';
import { EvidenceCollector } from './src/evidence/evidence-engine';
import { ECSClient, DescribeServicesCommand } from '@aws-sdk/client-ecs';

async function runFargateCertification() {
    try {
        console.log("=== UGONDU COR-7 FARGATE LIFECYCLE CERTIFICATION ===");
        
        const region = process.env.UGONDU_CERT_REGION || 'us-east-1';
        process.env.UGONDU_CERT_REGION = region;

        const campaignId = `ugondu-cor-fargate-${new Date().getTime()}`;
        console.log(`Campaign ID: ${campaignId}`);

        const urre = new URREngine();
        const registry = new UniversalActionRegistry(urre);
        const evidenceCollector = new EvidenceCollector();
        
        // Certification runner must ONLY be an observer
        const ecsClient = new ECSClient({ region });

        // Trigger canonical actions for Fargate lifecycle
        console.log("Triggering canonical action: container:registry:create");
        await registry.getAction('container:registry:create')!.execute({ repositoryName: campaignId });

        console.log("Triggering canonical action: container:image:build");
        await registry.getAction('container:image:build')!.execute({ dockerfile: 'Dockerfile.fargate', tag: `${campaignId}:latest` });

        console.log("Triggering canonical action: container:image:push");
        const pushRes = await registry.getAction('container:image:push')!.execute({ repositoryName: campaignId, tag: `${campaignId}:latest` });
        const validDigest = pushRes?.digest || 'sha256:dummy';

        console.log("Triggering canonical action: container:task-definition:create (Revision 1)");
        const taskDefRes1 = await registry.getAction('container:task-definition:create')!.execute({ familyName: `${campaignId}-task`, image: `${campaignId}@${validDigest}` });
        const taskDefArn1 = taskDefRes1?.taskDefinitionArn || 'dummy-arn-1';

        console.log("Triggering canonical action: container:service:create (Deploy Revision 1)");
        const deploy1Res = await registry.getAction('container:service:create')!.execute({ clusterName: `${campaignId}-cluster`, serviceName: `${campaignId}-svc`, taskDefinitionArn: taskDefArn1, desiredCount: 1 });
        const globalServiceArn = deploy1Res?.serviceArn || 'dummy-svc-arn';
        const globalClusterName = `${campaignId}-cluster`;

        // Poll ECS state (no sleep())
        console.log("Polling ECS state for Revision 1 stabilization (no sleep)...");
        let stable1 = false;
        let p1 = 0;
        while (!stable1 && p1 < 100) {
            const out = await ecsClient.send(new DescribeServicesCommand({ cluster: globalClusterName, services: [globalServiceArn] }));
            if (out.services && out.services[0].runningCount === 1) stable1 = true;
            p1++;
        }
        if (!stable1) throw new Error("Revision 1 failed to stabilize");

        // Failure injection: deploy Revision 2 with intentionally invalid image digest
        console.log("Deploying Revision 2 with invalid image digest...");
        const taskDefRes2 = await registry.getAction('container:task-definition:create')!.execute({ familyName: `${campaignId}-task`, image: `${campaignId}@sha256:invalid` });
        const taskDefArn2 = taskDefRes2?.taskDefinitionArn || 'dummy-arn-2';

        console.log("Triggering canonical action: orchestration:container:deploy (Revision 2)");
        const deploy2Res = await registry.getAction('orchestration:container:deploy')!.execute({ clusterName: globalClusterName, serviceName: `${campaignId}-svc`, taskDefinitionArn: taskDefArn2 });
        const deployment2TxId = deploy2Res?.transactionId || 'dummy-tx-id';

        // Poll ECS state (no sleep()), verify Revision 2 fails to reach desired count
        console.log("Polling ECS state for Revision 2 failure (no sleep)...");
        let rev2Failed = false;
        let p2 = 0;
        while (!rev2Failed && p2 < 100) {
            const out = await ecsClient.send(new DescribeServicesCommand({ cluster: globalClusterName, services: [globalServiceArn] }));
            if (out.services && out.services[0].taskDefinition === taskDefArn2 && out.services[0].runningCount === 0) {
                rev2Failed = true;
            }
            p2++;
        }
        if (!rev2Failed) throw new Error("Revision 2 did not fail as expected");

        // Capture the exact deployment.transactionId and invoke urre.triggerRollback
        console.log(`Triggering rollback for transactionId: ${deployment2TxId}`);
        await urre.triggerRollback({ id: deployment2TxId });

        // Wait for Revision 1 to stabilize
        console.log("Waiting for Revision 1 to stabilize after rollback...");
        let reverted = false;
        let p3 = 0;
        while (!reverted && p3 < 100) {
            const out = await ecsClient.send(new DescribeServicesCommand({ cluster: globalClusterName, services: [globalServiceArn] }));
            if (out.services && out.services[0].taskDefinition === taskDefArn1 && out.services[0].runningCount === 1) {
                reverted = true;
            }
            p3++;
        }
        if (!reverted) throw new Error("Failed to revert to Revision 1");

        console.log("\n✅ Fargate Certification Run Complete.");
    } catch (error: any) {
        console.error('Fargate Certification run fatally failed', error);
        process.exit(1);
    }
}

runFargateCertification();
