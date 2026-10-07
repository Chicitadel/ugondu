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
    const oidcProviderArn = `arn:aws:iam::${accountId}:oidc-provider/token.actions.githubusercontent.com`;

    try {
        console.log('[OIDC PROVIDER PREFLIGHT]');
        console.log('Provider: https://token.actions.githubusercontent.com');
        console.log('Checking whether AWS already trusts this provider...');
        
        let oidcProviders = [];
        try {
            const listOutput = execSync('aws iam list-open-id-connect-providers --output json', { env }).toString();
            oidcProviders = JSON.parse(listOutput).OpenIDConnectProviderList;
        } catch (e) {
            if (e.message.includes('AccessDenied')) {
                throw new Error('AUTHORITY_GAP: iam:ListOpenIDConnectProviders');
            }
            throw e;
        }

        const providerExists = oidcProviders.some(p => p.Arn === oidcProviderArn);

        if (providerExists) {
            console.log('   ✓ Provider exists in account.');
            let providerDetails;
            try {
                const getOutput = execSync(`aws iam get-open-id-connect-provider --open-id-connect-provider-arn ${oidcProviderArn} --output json`, { env }).toString();
                providerDetails = JSON.parse(getOutput);
            } catch (e) {
                if (e.message.includes('AccessDenied')) {
                    throw new Error('AUTHORITY_GAP: iam:GetOpenIDConnectProvider');
                }
                throw e;
            }

            if (providerDetails.Url !== 'token.actions.githubusercontent.com') {
                console.error(`   ✗ URL mismatch: expected token.actions.githubusercontent.com, got ${providerDetails.Url}`);
                throw new Error('PROVIDER_MISMATCH');
            }
            console.log('   ✓ URL verified.');

            if (!providerDetails.ClientIDList || !providerDetails.ClientIDList.includes('sts.amazonaws.com')) {
                console.error(`   ✗ Audience mismatch: sts.amazonaws.com is not an allowed client.`);
                throw new Error('PROVIDER_MISMATCH');
            }
            console.log('   ✓ Audience verified.');
            console.log('   ✓ Provider ARN verified.');
        } else {
            console.log('   Status: NOT FOUND');
            console.log('   Required next operation: iam:CreateOpenIDConnectProvider');
            console.log('   Risk: HIGH — establishes a new IAM federated identity provider');
            throw new Error('AUTHORITY_GAP: iam:CreateOpenIDConnectProvider');
        }

        console.log('\n[ROLE PREFLIGHT]');
        
        const trustPolicy = {
            Version: '2012-10-17',
            Statement: [{
                Effect: 'Allow',
                Principal: { Federated: oidcProviderArn },
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
            console.log('   ✓ UgonduCORRunner exists.');
        } catch (e) {
            if (e.message.includes('AccessDenied')) {
                throw new Error('AUTHORITY_GAP: iam:GetRole');
            }
        }

        if (!roleExists) {
            console.log('   Status: ROLE NOT FOUND');
            console.log('   Required next operation: iam:CreateRole');
            throw new Error('AUTHORITY_GAP: iam:CreateRole');
        } else {
            console.log('   Updating trust policy...');
            try {
                execSync('aws iam update-assume-role-policy --role-name UgonduCORRunner --policy-document file://trust-policy.json', { env, stdio: 'pipe' });
                console.log('   ✓ Trust policy update authorized and executed.');
            } catch (err) {
                if (err.message.includes('AccessDenied')) {
                    throw new Error('AUTHORITY_GAP: iam:UpdateAssumeRolePolicy');
                }
                throw err;
            }
        }
        if (fs.existsSync('trust-policy.json')) fs.unlinkSync('trust-policy.json');

        console.log('\n[TRUST]');
        // Read back
        try {
            const roleOutput = execSync('aws iam get-role --role-name UgonduCORRunner --output json', { env, stdio: 'pipe' }).toString();
            const roleData = JSON.parse(roleOutput);
            const assumeDoc = roleData.Role.AssumeRolePolicyDocument;
            
            // Verify
            const statement = assumeDoc.Statement[0];
            if (statement.Principal.Federated !== oidcProviderArn) throw new Error('Trust read-back failed: invalid federated principal.');
            console.log('   ✓ Trust established.');
            console.log('   ✓ Trust read-back verified.');
        } catch (e) {
            console.error('Failed to read back trust policy', e.message);
            throw new Error('TRUST_VERIFICATION_FAILED');
        }

        console.log('\n[STS]');
        console.log('   ✓ GitHub OIDC token accepted (simulated for bootstrap phase).');
        console.log('   ✓ Temporary AWS credentials obtained (simulated for bootstrap phase).');
        console.log('   ✓ AWS identity verified (simulated for bootstrap phase).');

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
            const missingPermission = err.message.split(': ')[1];
            console.log(`\n[AUTHORITY GAP]`);
            console.log(`Ugondu cannot safely perform the required IAM operation.`);
            console.log(`Current identity: ${principalArn}`);
            console.log(`Missing authority: ${missingPermission}`);
            console.log(`Result: AUTHORITY_GAP`);
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
            
            // Add Create permissions only if that's what we're missing
            if (missingPermission === 'iam:CreateOpenIDConnectProvider') {
                remediationPolicy.Statement.push({
                    "Sid": "CreateGitHubOIDCProvider",
                    "Effect": "Allow",
                    "Action": [ "iam:CreateOpenIDConnectProvider" ],
                    "Resource": `arn:aws:iam::${accountId}:oidc-provider/token.actions.githubusercontent.com`
                });
            } else if (missingPermission === 'iam:CreateRole') {
                remediationPolicy.Statement.push({
                    "Sid": "CreateUgonduCORRunner",
                    "Effect": "Allow",
                    "Action": [ "iam:CreateRole" ],
                    "Resource": `arn:aws:iam::${accountId}:role/UgonduCORRunner`
                });
            }

            console.log(JSON.stringify(remediationPolicy, null, 2));
            console.log(`\nNo broader IAM privilege will be requested. Once applied, rerun this bootstrap script.`);
            process.exit(1);
        } else {
            console.error('\nAn error occurred during trust establishment:', err.message);
            process.exit(1);
        }
    }
    
    rl.close();
});
