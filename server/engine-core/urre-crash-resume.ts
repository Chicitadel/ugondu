import * as fs from 'fs';
import * as path from 'path';
import { URREngine } from './src/urre/execution/urre-engine';
import { TransactionDag, DagNode } from './src/urre/transaction/transaction-dag';
import { TransactionStore } from './src/urre/transaction/transaction-store';
import { EC2Client, CreateVpcCommand, DeleteVpcCommand, CreateSubnetCommand, DeleteSubnetCommand } from '@aws-sdk/client-ec2';
import { __t } from '@ugondu/shared';

const REGION = process.env.UGONDU_CERT_REGION;
if (!REGION) {
    throw new Error('UGONDU_CERT_REGION environment variable is required and must not be empty.');
}

async function registerRealHandlers(engine: URREngine) {
    const { EC2Client, DescribeInstancesCommand } = require('@aws-sdk/client-ec2');
const ec2 = new EC2Client({ region: REGION });
    
    engine.registerHandler('aws', 'CREATE_VPC_CRASH', async (node: DagNode) => {
        console.log('[URRE-CRASH] Process A executing CREATE_VPC_CRASH...');
        const res = await ec2.send(new CreateVpcCommand({ CidrBlock: '10.0.99.0/24' }));
        const vpcId = res.Vpc!.VpcId!;
        console.log(`[URRE-CRASH] Process A VPC Created: ${vpcId}`);
        return { vpcId };
    }, async (node: DagNode) => {
        if (node.output?.vpcId) {
            await ec2.send(new DeleteVpcCommand({ VpcId: node.output.vpcId }));
        }
    });

    engine.registerHandler('aws', 'CREATE_SUBNET_REAL', async (node: DagNode) => {
        console.log('[URRE-CRASH] Process B executing CREATE_SUBNET_REAL...');
        const store = new TransactionStore();
        const tx = await store.load('tx-p0-4-real');
        const vpcId = tx?.getNode('VPC')?.output?.vpcId;
        if (!vpcId) throw new Error(__t('missing_vpc_id'));
        const res = await ec2.send(new CreateSubnetCommand({ VpcId: vpcId, CidrBlock: '10.0.99.0/28' }));
        return { subnetId: res.Subnet!.SubnetId! };
    }, async (node: DagNode) => {
        if (node.output?.subnetId) {
            await ec2.send(new DeleteSubnetCommand({ SubnetId: node.output.subnetId }));
        }
    });
}

async function phase1() {
    console.log(__t('process_a_starting_transaction'));
    const engine = new URREngine({
        async afterNodePersisted(node: DagNode) {
            if (node.id === 'VPC' && node.status === 'SUCCESS') {
                console.log('[URRE-CRASH] Fault Injector: CRASHING PROCESS A intentionally after VPC SUCCESS.');
                process.exit(1);
            }
        }
    });
    await registerRealHandlers(engine);

    const tx = new TransactionDag('tx-p0-4-real');
    tx.addNode('VPC', 'aws', 'CREATE_VPC_CRASH');
    tx.addNode('SUBNET', 'aws', 'CREATE_SUBNET_REAL');
    tx.addEdge('VPC', 'SUBNET'); // SUBNET depends on VPC

    console.log(__t('process_a_submitting_transacti'));
    // This will trigger VPC creation, and then crash the process via the fault injector
    await engine.executeTransaction(tx);
    
    // We should not reach here if it crashes cleanly
    throw new Error(__t('engine.urre.err_process_a_no_crash'));
}

async function phase2() {
    console.log(__t('process_b_resuming_transaction'));
    const engine = new URREngine();
    await registerRealHandlers(engine);

    const store = new TransactionStore();
    const existingTx = await store.load('tx-p0-4-real');
    if (!existingTx) {
        throw new Error(__t('engine.urre.err_tx_not_found'));
    }

    const vpcNode = existingTx.getNode('VPC')!;
    if (vpcNode.status !== 'SUCCESS') {
        throw new Error(__t('engine.urre.err_vpc_not_success'));
    }
    const vpcId = vpcNode.output.vpcId;
    console.log(`PROCESS B: Loaded VPC ID ${vpcId} from state. Will skip recreation.`);

    console.log(__t('process_b_resuming_transaction'));
    await engine.executeTransaction(existingTx); // this skips SUCCESS nodes

    const subNode = existingTx.getNode('SUBNET')!;
    if (subNode.status !== 'SUCCESS') {
        throw new Error(__t('engine.urre.err_subnet_no_success'));
    }

    console.log(__t('process_b_success_cleaning_up_'));
    const { EC2Client, DescribeInstancesCommand } = require('@aws-sdk/client-ec2');
const ec2 = new EC2Client({ region: REGION });
    if (subNode.output?.subnetId) {
        await ec2.send(new DeleteSubnetCommand({ SubnetId: subNode.output.subnetId }));
    }
    await ec2.send(new DeleteVpcCommand({ VpcId: vpcId }));

    console.log(__t('process_b_cleanup_done'));
    process.exit(0);
}

async function phase3() {
    console.log(__t('process_c_testing_idempotency'));
    const engine = new URREngine();
    await registerRealHandlers(engine);

    const store = new TransactionStore();
    const existingTx = await store.load('tx-p0-4-real');
    if (!existingTx) {
        throw new Error(__t('engine.urre.err_tx_not_found'));
    }

    console.log(__t('process_c_executing_transactio'));
    await engine.executeTransaction(existingTx);

    if (existingTx.status !== 'SUCCESS') {
        throw new Error(__t('engine.urre.err_tx_not_immediate_success'));
    }

    console.log(__t('process_c_idempotency_proven'));
    process.exit(0);
}

if (process.argv[2] === 'phase1') {
    phase1();
} else if (process.argv[2] === 'phase2') {
    phase2();
} else if (process.argv[2] === 'phase3') {
    phase3();
} else {
    // Controller orchestrating both
    const { spawnSync } = require('child_process');
    console.log(__t('running_urre_real_crash_test'));
    const p1 = spawnSync('npx', ['ts-node', __filename, 'phase1'], { stdio: 'inherit' });
    console.log(`Process A exited with code ${p1.status} (expected 1 for crash)`);
    if (p1.status === 0) {
        console.error(__t('process_a_did_not_crash_as_exp'));
        process.exit(1);
    }

    const p2 = spawnSync('npx', ['ts-node', __filename, 'phase2'], { stdio: 'inherit' });
    console.log(`Process B exited with code ${p2.status}`);
    if (p2.status !== 0) {
        process.exit(p2.status);
    }

    const p3 = spawnSync('npx', ['ts-node', __filename, 'phase3'], { stdio: 'inherit' });
    console.log(`Process C exited with code ${p3.status}`);
    process.exit(p3.status);
}
