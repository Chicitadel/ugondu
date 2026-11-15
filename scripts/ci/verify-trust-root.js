const crypto = require('crypto');

async function main() {
    const privKeyRaw = process.env.COR_SIGNING_KEY;
    const pubKeyRaw = process.env.COR_PUBLIC_KEY;

    if (!privKeyRaw || !pubKeyRaw) {
        console.error("::error::COR_TRUST_ROOT_MISSING: The COR signing trust root is not configured in the GitHub Actions environment.");
        process.exit(1);
    }

    try {
        // Parse keys to ensure they are valid PEMs
        const privateKey = crypto.createPrivateKey(privKeyRaw);
        const publicKey = crypto.createPublicKey(pubKeyRaw);
        
        // Ensure expected algorithm / format (RSA or EC typically)
        if (privateKey.type !== 'private' || publicKey.type !== 'public') {
            throw new Error('Key types mismatch');
        }

        // Test Cryptographic Correlation
        const testPayload = Buffer.from('ugondu-cor-trust-root-test');
        
        const sign = crypto.createSign('SHA256');
        sign.update(testPayload);
        sign.end();
        const signature = sign.sign(privateKey);

        const verify = crypto.createVerify('SHA256');
        verify.update(testPayload);
        verify.end();
        const isValid = verify.verify(publicKey, signature);

        if (!isValid) {
            console.error("::error::COR_TRUST_ROOT_INVALID: The provided COR_SIGNING_KEY and COR_PUBLIC_KEY do not cryptographically correspond.");
            process.exit(1);
        }
        
        // Create public key fingerprint
        const pubKeyDer = publicKey.export({ type: 'spki', format: 'der' });
        const fingerprint = crypto.createHash('sha256').update(pubKeyDer).digest('hex');

        console.log("Trust root configuration detected and cryptographically validated.");
        console.log(`Public Key Fingerprint (SHA256): ${fingerprint}`);
        
    } catch (err) {
        console.error(`::error::COR_TRUST_ROOT_ERROR: Failed to parse or validate trust root keys. ${err.message}`);
        process.exit(1);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
