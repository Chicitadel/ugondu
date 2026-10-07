#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('====================================================');
console.log(' UGONDU IDENTITY & ACCESS ORCHESTRATION (UIAO)     ');
console.log(' Autonomous Trust Establishment (AWS OIDC)         ');
console.log('====================================================\n');

rl.question('Enter the path to your AWS accessKey.csv bootstrap credential: ', (csvPath) => {
    if (!fs.existsSync(csvPath)) {
        console.error('File not found. Exiting.');
        process.exit(1);
    }

    const content = fs.readFileSync(csvPath, 'utf8');
    const akiaMatch = content.match(/(AKIA[A-Z0-9]{16})/);
    if (!akiaMatch) {
        console.error('Could not find Access Key ID in the file.');
        process.exit(1);
    }
    const accessKeyId = akiaMatch[1];
    
    const lineWithKey = content.split(/\r?\n/).find(line => line.includes(accessKeyId));
    if (!lineWithKey) {
        console.error('Could not parse the secret key.');
        process.exit(1);
    }
    const cols = lineWithKey.split(',');
    let secretAccessKey = '';
    for (const col of cols) {
        const val = col.trim();
        if (val !== accessKeyId && val.length > 20) {
            secretAccessKey = val;
            break;
        }
    }
    
    if (!secretAccessKey) {
        console.error('Could not parse the secret key.');
        process.exit(1);
    }

    const env = {
        ...process.env,
        AWS_ACCESS_KEY_ID: accessKeyId,
        AWS_SECRET_ACCESS_KEY: secretAccessKey,
        AWS_REGION: 'us-east-1'
    };

    console.log('\n[IDENTITY PREFLIGHT]');
    
    let accountId;
    let principalArn;
    try {
        const callerIdentity = execSync('aws sts get-caller-identity --output json', { env }).toString();
        const identity = JSON.parse(callerIdentity);
        console.log(`✓ AWS Account: ${identity.Account}`);
        console.log(`✓ Principal: ${identity.Arn}`);
        accountId = identity.Account;
        principalArn = identity.Arn;
    } catch (err) {
        console.error('Failed to validate bootstrap credential.');
        process.exit(1);
    }

    console.log('\n[FEDERATION PATH]');
    console.log('Target: GitHub Actions OIDC → AWS IAM Role');
    console.log('Status: Establishing trust...\n');

    const roleArn = `arn:aws:iam::${accountId}:role/UgonduCORRunner`;

    try {
        console.log('1. Checking OIDC Provider...');
        try {
            execSync('aws iam get-open-id-connect-provider --open-id-connect-provider-arn "arn:aws:iam::' + accountId + ':oidc-provider/token.actions.githubusercontent.com"', { env, stdio: 'pipe' });
            console.log('   ✓ OIDC Provider verified.');
        } catch (e) {
            try {
                console.log('   ✓ Attempting to create OIDC Provider...');
                execSync('aws iam create-open-id-connect-provider --url "https://token.actions.githubusercontent.com" --thumbprint-list "6938fd4d98bab03faadb97b34396831e3780aea1" "1c58a3a8518e8759bf075b76b750d4f2df264fcd" --client-id-list "sts.amazonaws.com"', { env, stdio: 'pipe' });
                console.log('   ✓ OIDC Provider created.');
            } catch (err) {
                if (err.message.includes('AccessDenied')) {
                    throw new Error('AUTHORITY_GAP: OIDC Provider');
                } else if (err.message.includes('EntityAlreadyExists')) {
                    console.log('   ✓ OIDC Provider already exists.');
                } else {
                    throw err;
                }
            }
        }

        console.log('2. Verifying/Updating UgonduCORRunner IAM Role...');
        const trustPolicy = {
            Version: '2012-10-17',
            Statement: [{
                Effect: 'Allow',
                Principal: { Federated: `arn:aws:iam::${accountId}:oidc-provider/token.actions.githubusercontent.com` },
                Action: 'sts:AssumeRoleWithWebIdentity',
                Condition: {
                    StringLike: { 'token.actions.githubusercontent.com:sub': 'repo:Chicitadel/ugondu:*' },
                    StringEquals: { 'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com' }
                }
            }]
        };
        fs.writeFileSync('trust-policy.json', JSON.stringify(trustPolicy));
        
        let roleExists = false;
        try {
            execSync('aws iam get-role --role-name UgonduCORRunner', { env, stdio: 'pipe' });
            roleExists = true;
        } catch (e) {
            if (e.message.includes('AccessDenied')) {
                throw new Error('AUTHORITY_GAP: GetRole');
            }
        }

        if (!roleExists) {
            try {
                execSync('aws iam create-role --role-name UgonduCORRunner --assume-role-policy-document file://trust-policy.json', { env, stdio: 'pipe' });
                console.log('   ✓ Role UgonduCORRunner created.');
            } catch (e) {
                if (e.message.includes('AccessDenied')) throw new Error('AUTHORITY_GAP: CreateRole');
                throw e;
            }
        } else {
            console.log('   ✓ Role UgonduCORRunner already exists, updating assume role policy...');
            try {
                execSync('aws iam update-assume-role-policy --role-name UgonduCORRunner --policy-document file://trust-policy.json', { env, stdio: 'pipe' });
                console.log('   ✓ Role UgonduCORRunner trust policy updated.');
            } catch (err) {
                if (err.message.includes('AccessDenied')) {
                    throw new Error('AUTHORITY_GAP: UpdateAssumeRolePolicy');
                }
                throw err;
            }
        }
        if (fs.existsSync('trust-policy.json')) fs.unlinkSync('trust-policy.json');

        console.log('\n3. Trust Established / Verified successfully.');
        console.log(`\n====================================================`);
        console.log(` AWS_ROLE_TO_ASSUME: ${roleArn}`);
        console.log(`====================================================\n`);
        
        console.log('ACTION REQUIRED: Setting GitHub Secret securely without exposing it...');
        try {
            execSync(`gh secret set AWS_ROLE_TO_ASSUME --body "${roleArn}" -R Chicitadel/ugondu`, { stdio: 'pipe' });
            console.log('   ✓ GitHub Secret AWS_ROLE_TO_ASSUME set successfully.');
        } catch (ghErr) {
            console.error('Failed to set GitHub secret automatically:', ghErr.stderr ? ghErr.stderr.toString() : ghErr.message);
        }
        
        console.log('\nOnce done, you can safely delete your bootstrap accessKey.csv.');
        
    } catch (err) {
        if (err.message.includes('AUTHORITY_GAP')) {
            console.log(`\n[AUTHORITY GAP]`);
            console.log(`Ugondu cannot safely perform the required IAM operation.`);
            console.log(`Current identity: ${principalArn}`);
            console.log(`\nTo safely proceed, ask an AWS Administrator to attach the following minimum Bootstrap Authority policy to your user:\n`);
            
            const remediationPolicy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Sid": "InspectUgonduCORRole",
                        "Effect": "Allow",
                        "Action": [ "iam:GetRole" ],
                        "Resource": `arn:aws:iam::${accountId}:role/UgonduCORRunner`
                    },
                    {
                        "Sid": "UpdateOnlyUgonduCORTrust",
                        "Effect": "Allow",
                        "Action": [ "iam:UpdateAssumeRolePolicy" ],
                        "Resource": `arn:aws:iam::${accountId}:role/UgonduCORRunner`
                    },
                    {
                        "Sid": "InspectOIDCProviders",
                        "Effect": "Allow",
                        "Action": [ "iam:ListOpenIDConnectProviders" ],
                        "Resource": "*"
                    },
                    {
                        "Sid": "InspectGitHubOIDCProvider",
                        "Effect": "Allow",
                        "Action": [ "iam:GetOpenIDConnectProvider" ],
                        "Resource": `arn:aws:iam::${accountId}:oidc-provider/token.actions.githubusercontent.com`
                    }
                ]
            };
            console.log(JSON.stringify(remediationPolicy, null, 2));
            console.log(`\nNo broader IAM privilege will be requested. Once applied, rerun this bootstrap script.`);
            process.exit(1);
        } else {
            console.error('An error occurred during trust establishment:', err.message);
            process.exit(1);
        }
    }
    
    rl.close();
});
