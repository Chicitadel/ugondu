const fs = require('fs');
let code = fs.readFileSync('tests/deployment-lifecycle.test.js', 'utf8');

code = code.replace(/fs\.renameSync\(nextPath, currentPath\);/g, "try { fs.unlinkSync(currentPath); } catch {} fs.renameSync(nextPath, currentPath);");

const newScenario7 = \eport(7, 'Cross-tenant auth denial - token for wrong audience rejected', () => {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
      const testKeyId = 'key_test_c37_' + Date.now();
      globalTrustRegistry.registerKey({ keyId: testKeyId, algorithm: 'ed25519', status: 'ACTIVE', purpose: 'service-identity', publicKey: publicKey.export({ type: 'spki', format: 'pem' }) });
      const token = signServiceIdentity('engine-core', 'tenant_123', 'execute', privateKey.export({ type: 'pkcs8', format: 'pem' }), testKeyId);
      const res = verifyServiceIdentityToken(token, 'tenant_456');
      assert.strictEqual(res.valid, false);
      assert.strictEqual(res.error, 'AUDIENCE_MISMATCH');
    });\;

code = code.replace(/report\(7, 'Cross-tenant auth denial - token for wrong audience rejected', \(\) => \{[\s\S]*?\}\);/m, newScenario7);

fs.writeFileSync('tests/deployment-lifecycle.test.js', code);
