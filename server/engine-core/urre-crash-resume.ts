import * as fs from 'fs';
import * as path from 'path';
import { URREngine } from './src/urre/execution/urre-engine';
import { TransactionDag } from './src/urre/transaction/transaction-dag';

const stateFile = path.join(__dirname, 'urre-state-P0-4.json');

async function phase1() {
    console.log('--- PROCESS A: Starting Transaction ---');
    let tx = new TransactionDag('tx-p0-4');
    tx.addNode('VPC', 'aws', 'CREATE_VPC');
    tx.addNode('SUBNET', 'aws', 'CREATE_SUBNET');

    // Simulate successful VPC creation
    const vpcNode = tx.getNode('VPC')!;
    vpcNode.status = 'SUCCESS';
    vpcNode.output = { vpcId: 'vpc-real-123' };

    fs.writeFileSync(stateFile, JSON.stringify(tx.serialize()), 'utf8');
    console.log('PROCESS A: Persisted state. Now intentionally crashing.');
    process.exit(1);
}

async function phase2() {
    console.log('--- PROCESS B: Resuming Transaction ---');
    if (!fs.existsSync(stateFile)) {
        throw new Error('State file missing!');
    }
    const stateStr = fs.readFileSync(stateFile, 'utf8');
    const txRecovered = TransactionDag.deserialize(JSON.parse(stateStr));

    const vpcNode = txRecovered.getNode('VPC')!;
    if (vpcNode.status !== 'SUCCESS') {
        throw new Error('VPC node state not restored');
    }
    console.log('PROCESS B: Resumed successfully. VPC state is SUCCESS.');

    // Cleanup
    fs.unlinkSync(stateFile);
    process.exit(0);
}

if (process.argv[2] === 'phase1') {
    phase1();
} else if (process.argv[2] === 'phase2') {
    phase2();
}
