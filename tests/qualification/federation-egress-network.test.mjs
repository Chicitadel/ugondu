import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const compose = fs.readFileSync(path.join(root, 'docker-compose.yml'), 'utf8');

function serviceBlock(name) {
  const servicesStart = compose.indexOf('\nservices:\n');
  assert.ok(servicesStart >= 0, 'compose services section must exist');
  const start = compose.indexOf(`\n  ${name}:\n`, servicesStart);
  assert.ok(start >= 0, `missing service: ${name}`);
  const next = compose.slice(start + 1).search(/\n  [a-zA-Z0-9_-]+:\n/);
  return compose.slice(start, next < 0 ? undefined : start + 1 + next);
}

test('billing gateway can reach external federation while retaining private service networking', () => {
  const gateway = serviceBlock('billing-gateway');
  assert.match(gateway, /networks:\s*\n\s+- ugondu-internal\s*\n\s+- ugondu-external/m);
  assert.match(gateway, /BILLING_AUTHORITY_URL=\$\{BILLING_AUTHORITY_URL:-https:\/\/billing\.airroofers\.eu\/api\/v1\}/);
  assert.match(gateway, /IDENTITY_AUTHORITY_URL=\$\{IDENTITY_AUTHORITY_URL:-https:\/\/identity\.airroofers\.eu\/api\/v1\}/);
});

test('internal network remains isolated and the billing gateway is not host-published', () => {
  assert.match(compose, /ugondu-internal:\s*\n\s+driver:\s*bridge\s*\n\s+internal:\s*true/m);
  const gateway = serviceBlock('billing-gateway');
  assert.doesNotMatch(gateway, /\n\s+ports:/, 'federation egress must not publish a host port');
});
