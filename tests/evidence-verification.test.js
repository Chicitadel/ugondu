const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

test('COR Evidence Bundle Verification', async () => {
  const bundlePath = path.join(__dirname, '../cor-evidence-bundle.json');
  if (!fs.existsSync(bundlePath)) {
    if (process.env.UGONDU_REQUIRE_EVIDENCE === 'true') {
      assert.fail('Evidence bundle must exist when UGONDU_REQUIRE_EVIDENCE=true');
    }
    console.log('[INFO] cor-evidence-bundle.json not present; passing clean checkout attestation');
    return;
  }
  const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));

  assert.strictEqual(bundle.schemaVersion, '1.0.0');
  assert.strictEqual(bundle.testResults.failed, 0);
  assert.strictEqual(bundle.testResults.skipped, 0);
  assert.strictEqual(bundle.testResults.notRun, 0);
  assert.strictEqual(bundle.codeGovernance.maxLinesPerFileCompliant, true);
  assert.match(bundle.evidenceBundleHash, /^sha256:[a-f0-9]{64}$/);
  assert.match(bundle.signature, /^[A-Za-z0-9+/=]+$/);

  const publicKeyPem = process.env.UGONDU_EVIDENCE_PUBLIC_KEY ||
    (fs.existsSync(path.join(__dirname, '../server/shared/keys/evidence_public.pem'))
      ? fs.readFileSync(path.join(__dirname, '../server/shared/keys/evidence_public.pem'), 'utf8')
      : null);

  assert.ok(publicKeyPem, 'Dedicated evidence public key is required for cryptographic verification');
  assert.strictEqual(
    crypto.verify(null, Buffer.from(bundle.evidenceBundleHash, 'utf8'), crypto.createPublicKey(publicKeyPem), Buffer.from(bundle.signature, 'base64')),
    true,
    'Evidence signature must cryptographically verify'
  );
});
