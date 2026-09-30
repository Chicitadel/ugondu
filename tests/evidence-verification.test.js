/**
 * Release Governance & Certification Authority
 * Air Roofers Ltd
 * Standards: ISO 27001, SOC 2, OWASP ASVS, NIST SP 800-53.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

test('COR Evidence Bundle Verification', async (t) => {
  const bundlePath = path.join(__dirname, '../cor-evidence-bundle.json');
  assert.ok(fs.existsSync(bundlePath), 'Evidence bundle must exist');
  
  const bundleStr = fs.readFileSync(bundlePath, 'utf8');
  const bundle = JSON.parse(bundleStr);
  
  const schemaPath = path.join(__dirname, '../server/shared/schemas/evidence.v1.json');
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  
  assert.strictEqual(bundle.schemaVersion, schema.properties.schemaVersion.enum[0]);
  
  assert.strictEqual(bundle.testResults.totalSkipped, 0, 'Zero skipped mandatory tests');
  assert.strictEqual(bundle.testResults.totalFailed, 0, 'Zero failed mandatory tests');
  assert.strictEqual(bundle.codeGovernance.maxLinesPerFileCompliant, true);
  assert.strictEqual(bundle.codeGovernance.zeroSecretsLeakedCompliant, true);
  
  assert.ok(bundle.signature.length >= 20, 'Signature must be valid length');
});
