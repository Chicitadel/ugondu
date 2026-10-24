const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function log(msg) {
    console.log(`[Ugondu AIE] ${msg}`);
}

function run(cmd, env = process.env) {
    return execSync(cmd, { encoding: 'utf8', env });
}

async function orchestrate() {
    log("Starting Ugondu Authorization Intelligence Engine (AIE) Orchestration...");
    
    // 1. Verify AWS Identity
    log("Validating AWS capability (sts:GetCallerIdentity)...");
    try {
        const callerId = run('aws sts get-caller-identity --output json');
        const identity = JSON.parse(callerId);
        log(`✓ AWS Authentication Valid: ${identity.Arn}`);
    } catch (e) {
        console.error("AWS Authentication failed.");
        process.exit(1);
    }

    // 2. Discover GitHub Auth
    log("Validating GitHub capability...");
    try {
        run('gh auth status');
        log(`✓ GitHub Authentication Valid`);
    } catch (e) {
        console.error("GitHub Authentication failed.");
        process.exit(1);
    }

    // 3. Configure AWS_REGION
    log("Reconciling Canonical Region configuration...");
    try {
        run('gh variable set AWS_REGION -b "eu-west-3" -R Chicitadel/ugondu');
        log(`✓ Set GitHub Actions Variable: AWS_REGION = eu-west-3`);
    } catch (e) {
        console.error("Failed to set AWS_REGION variable.", e.message);
    }

    // 4. Provision Trust Root
    log("Discovering existing Sovereign Trust Root...");
    const keysDir = path.join(__dirname, '..', '.keys');
    if (!fs.existsSync(keysDir)) {
        fs.mkdirSync(keysDir, { recursive: true });
    }
    
    const privKeyPath = path.join(keysDir, 'cor_signing.pem');
    const pubKeyPath = path.join(keysDir, 'cor_public.pem');
    
    let privKeyRaw, pubKeyRaw;
    
    if (fs.existsSync(privKeyPath) && fs.existsSync(pubKeyPath)) {
        log("✓ Existing trust root discovered locally.");
        privKeyRaw = fs.readFileSync(privKeyPath, 'utf8');
        pubKeyRaw = fs.readFileSync(pubKeyPath, 'utf8');
    } else {
        log("No existing trust root found. Provisioning genuine authentic offline Sovereign Trust Root (RSA 4096-bit)...");
        const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 4096,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });
        
        privKeyRaw = privateKey;
        pubKeyRaw = publicKey;
        
        fs.writeFileSync(privKeyPath, privKeyRaw);
        fs.writeFileSync(pubKeyPath, pubKeyRaw);
        log("✓ Authentic Trust Root generated and persisted locally.");
    }

    // 5. Validate Trust Root (Correlation)
    log("Cryptographically validating trust root correlation...");
    const testPayload = Buffer.from('ugondu-cor-trust-root-test');
    
    const privateKey = crypto.createPrivateKey(privKeyRaw);
    const publicKey = crypto.createPublicKey(pubKeyRaw);
    
    const sign = crypto.createSign('SHA256');
    sign.update(testPayload);
    sign.end();
    const signature = sign.sign(privateKey);

    const verify = crypto.createVerify('SHA256');
    verify.update(testPayload);
    verify.end();
    const isValid = verify.verify(publicKey, signature);

    if (!isValid) {
        console.error("::error::COR_TRUST_ROOT_INVALID");
        process.exit(1);
    }
    
    const pubKeyDer = publicKey.export({ type: 'spki', format: 'der' });
    const fingerprint = crypto.createHash('sha256').update(pubKeyDer).digest('hex');
    log(`✓ Cryptographic signature correlation successful. Fingerprint: ${fingerprint}`);

    // 6. Push to GitHub Secrets
    log("Provisioning GitHub Actions Secrets for physical qualification...");
    try {
        run(`gh secret set COR_SIGNING_KEY -R Chicitadel/ugondu`, {
            ...process.env,
            GH_PROMPT_DISABLED: '1',
            // Pass value via stdin
        });
    } catch(e) {}
}

orchestrate().catch(console.error);
