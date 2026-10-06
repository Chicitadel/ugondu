const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = process.env.UGONDU_ROOT || path.resolve(__dirname, '..');
const schedulePath = path.join(root, '.governance', 'cor', 'cor_final_remediation_task_schedule.json');

const schedule = JSON.parse(fs.readFileSync(schedulePath, 'utf8'));

if (schedule.status !== 'COR_CERTIFIED') {
    console.error('Cannot sign uncertified schedule.');
    process.exit(1);
}

// Generate an internal key pair for signing the COR
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

const dataToSign = Buffer.from(JSON.stringify(schedule.streams) + schedule.baseline.remoteHead);

const sign = crypto.createSign('SHA256');
sign.update(dataToSign);
sign.end();
const signature = sign.sign(privateKey, 'hex');

const corBundle = {
    candidateSHA: schedule.baseline.remoteHead,
    status: schedule.status,
    signature: signature,
    publicKey: publicKey,
    timestamp: new Date().toISOString()
};

const bundlePath = path.join(root, '.governance', 'cor', 'FINAL_COR_BUNDLE.json');
fs.writeFileSync(bundlePath, JSON.stringify(corBundle, null, 2));

console.log('COR CERTIFIED — LAUNCH APPROVED');
console.log('Signature: ' + signature);
