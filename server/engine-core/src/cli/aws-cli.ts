import * as fs from 'fs';
import { AwsIdentityBootstrap } from '../fabric/providers/aws/aws-identity-bootstrap';

async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log('Usage: aws-cli [setup|import|policy-generate]');
        process.exit(1);
    }

    const bootstrap = new AwsIdentityBootstrap();
    const cmd = args[0];

    if (cmd === 'setup') {
        console.log(`
AWS Provider Setup
────────────────────────────────────────
No usable AWS credentials were detected. Ugondu can guide you through creating a dedicated AWS execution identity.

Recommended:
[1] AWS IAM Identity Center / Role
[2] Dedicated IAM user + access key
[3] Existing AWS credentials

STEP 1 — Sign in to AWS
Do NOT use the root account for Ugondu operations.

STEP 2 — Create IAM user
Name: UgonduPhysicalTest

STEP 3 — Attach the Ugondu-generated policy
Run \`ugondu aws policy generate\` to obtain the precise policy.

STEP 4 — Create an access key
IAM → Users → UgonduPhysicalTest → Security credentials → Create access key

STEP 5 — Download the CSV
Save it somewhere secure.

STEP 6 — Give the CSV to Ugondu
Run \`ugondu provider aws credentials import <CSV>\`
`);
    } else if (cmd === 'import') {
        const csvPath = args[1];
        if (!csvPath || !fs.existsSync(csvPath)) {
            console.error(`File not found: ${csvPath}`);
            process.exit(1);
        }
        console.log('Reading AWS credential file...');
        const content = fs.readFileSync(csvPath, 'utf8');
        try {
            const creds = bootstrap.parseCredentialsCsv(content);
            console.log('✓ CSV recognized');
            console.log('✓ Access key ID detected');
            console.log('✓ Secret access key detected');
            console.log('✓ Credentials validated locally');

            console.log('Testing AWS authentication...');
            const identity = await bootstrap.verifyIdentity(creds);
            console.log('✓ AWS authentication successful');
            console.log(`AWS Account: ${identity.accountId}`);
            console.log(`Principal:   ${identity.principalArn}`);
            console.log(`Region:      ${identity.region}`);

            await bootstrap.storeCredentialsLocally(creds);
            console.log('AWS provider is READY.');
        } catch (e: any) {
            console.error(`Import failed: ${e.message}`);
            process.exit(1);
        }
    } else if (cmd === 'policy-generate') {
        const capabilities = args[1] ? args[1].split(',') : ['vpc', 'ec2', 'rds', 's3', 'snapshot', 'rollback', 'drift-detection'];
        const policy = bootstrap.generatePolicy(capabilities, 'eu-west-3');
        const manifest = {
            schemaVersion: '1.0',
            provider: 'aws',
            purpose: 'physical-certification',
            capabilities,
            iamPolicyFile: 'ugondu-aws-policy.json'
        };
        fs.writeFileSync('ugondu-aws-policy.json', JSON.stringify(policy, null, 2));
        fs.writeFileSync('ugondu-aws-policy.manifest.json', JSON.stringify(manifest, null, 2));
        console.log('Generated ugondu-aws-policy.json and ugondu-aws-policy.manifest.json');
    }
}

main().catch(console.error);
