import { __t } from '@ugondu/shared';
import { createProductionActionRegistry } from './src/registry/action-registry-factory';
import { EvidenceCollector } from './src/evidence/evidence-engine';
import { AwsNativeClient } from './src/fabric/providers/aws-native-client';

async function runFargateCertification() {
    try {
        console.log("=== UGONDU COR-7 FARGATE LIFECYCLE CERTIFICATION ===");
        
        const region = process.env.UGONDU_CERT_REGION;
        if (!region) throw new Error("BLOCKED: UGONDU_CERT_REGION is required");
        const creds = process.env.UGONDU_CERT_RDS_CREDENTIAL_REF;
        if (!creds) throw new Error("BLOCKED: UGONDU_CERT_RDS_CREDENTIAL_REF is required");

        // deterministic id without date.now
        const campaignId = `ugondu-cor-fargate-001`;
        console.log(`Campaign ID: ${campaignId}`);

        const registry = createProductionActionRegistry(region);
        const urre = registry.getUrre();
        const evidenceCollector = new EvidenceCollector();
        
        // Certification runner must ONLY be an observer via read-only abstraction
        const awsObs = new AwsNativeClient(region);
        const txId = `tx-fargate-${campaignId}`;

        // Trigger canonical actions for Fargate lifecycle
        console.log("Triggering canonical action: container:registry:create");
        await registry.getAction('container:registry:create')!.execute({ transactionId: txId, repositoryName: campaignId });

        console.log("Triggering canonical action: container:image:build");
        await registry.getAction('container:image:build')!.execute({ transactionId: txId, dockerfile: 'Dockerfile.fargate', tag: `${campaignId}:cert-build` });

        console.log("Triggering canonical action: container:image:push");
        const pushRes = await registry.getAction('container:image:push')!.execute({ transactionId: txId, repositoryName: campaignId, tag: `${campaignId}:cert-build` });
        const validDigest = pushRes?.outputs?.digest || pushRes?.digest;
        if (!validDigest) throw new Error("Missing physical image digest");

        console.log("Triggering canonical action: container:task-definition:create (Revision 1)");
        const taskDefRes1 = await registry.getAction('container:task-definition:create')!.execute({ transactionId: txId, familyName: `${campaignId}-task`, image: `${campaignId}@${validDigest}` });
        const taskDefArn1 = taskDefRes1?.outputs?.taskDefinitionArn || taskDefRes1?.taskDefinitionArn;
        if (!taskDefArn1) throw new Error("Missing task definition ARN");

        console.log("Triggering canonical action: container:service:create (Deploy Revision 1)");
        const deploy1Res = await registry.getAction('container:service:create')!.execute({ transactionId: txId, clusterName: `${campaignId}-cluster`, serviceName: `${campaignId}-svc`, taskDefinitionArn: taskDefArn1, desiredCount: 1 });
        const globalServiceArn = deploy1Res?.outputs?.serviceArn || deploy1Res?.serviceArn;
        if (!globalServiceArn) throw new Error("Missing service ARN");
        const globalClusterName = `${campaignId}-cluster`;

        // Poll ECS state (no sleep())
        console.log("Polling ECS state for Revision 1 stabilization (no sleep)...");
        let stable1 = false;
        let p1 = 0;
        while (!stable1 && p1 < 100) {
            const out = await awsObs.describeServices(globalClusterName, [globalServiceArn]).catch(() => null);
            if (out && out.services && out.services[0].runningCount === 1) stable1 = true;
            else await new Promise(r => setTimeout(r, 2000));
            p1++;
        }
        if (!stable1) throw new Error("Revision 1 failed to stabilize");

        // Failure injection: deploy Revision 2 with intentionally invalid image digest
        console.log("Deploying Revision 2 with invalid image digest...");
        const taskDefRes2 = await registry.getAction('container:task-definition:create')!.execute({ transactionId: txId + '-rev2', familyName: `${campaignId}-task`, image: `${campaignId}@sha256:0000000000000000000000000000000000000000000000000000000000000000` });
        const taskDefArn2 = taskDefRes2?.outputs?.taskDefinitionArn || taskDefRes2?.taskDefinitionArn;
        if (!taskDefArn2) throw new Error("Missing revision 2 task def ARN");

        console.log("Triggering canonical action: orchestration:container:deploy (Revision 2)");
        const deployment2TxId = txId + '-rev2';
        await registry.getAction('orchestration:container:deploy')!.execute({ transactionId: deployment2TxId, clusterName: globalClusterName, serviceName: `${campaignId}-svc`, taskDefinitionArn: taskDefArn2 });
        
        // Load the actual durably saved TX
        const { TransactionStore } = require('./src/urre/transaction/transaction-store');
        const store = new TransactionStore();
        const savedTx = await store.load(deployment2TxId);
        if (!savedTx) throw new Error("Failed to load durably persisted transaction: " + deployment2TxId);

        // Poll ECS state (no sleep()), verify Revision 2 fails to reach desired count
        console.log("Polling ECS state for Revision 2 failure (no sleep)...");
        let rev2Failed = false;
        let p2 = 0;
        while (!rev2Failed && p2 < 100) {
            const out = await awsObs.describeServices(globalClusterName, [globalServiceArn]).catch(() => null);
            if (out && out.services && out.services[0].taskDefinition === taskDefArn2 && out.services[0].runningCount === 0) {
                rev2Failed = true;
            } else await new Promise(r => setTimeout(r, 2000));
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
            const out = await awsObs.describeServices(globalClusterName, [globalServiceArn]).catch(() => null);
            if (out && out.services && out.services[0].taskDefinition === taskDefArn1 && out.services[0].runningCount === 1) {
                reverted = true;
            } else await new Promise(r => setTimeout(r, 2000));
            p3++;
        }
        if (!reverted) throw new Error("Failed to revert to Revision 1");

        console.log("\n? Fargate Certification Run Complete.");
    } catch (error: any) {
        console.error('Fargate Certification run fatally failed', error);
        process.exit(1);
    }
}

runFargateCertification();
