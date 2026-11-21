/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Deployment configuration regression guard
 * File           : tests/deploy-directadmin-config.test.mjs
 * Version        : 1.0.0
 * Author         : Ignatus Chika Ujomor / Air Roofers SASU
 * Organization   : Air Roofers SASU
 * Classification : ENTERPRISE
 *
 * Guards the shared-host (DirectAdmin) static configuration: no wildcard CORS,
 * no federation credential headers, fresh entrypoints, short bundle caching,
 * SPA routing and hidden-file denial. Product subdomains are discovered from
 * deploy/directadmin/ (no hardcoded names).
 ******************************************************************************/
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(root, 'deploy', 'directadmin');
const hosts = fs.readdirSync(base, { withFileTypes: true }).filter((d) => d.isDirectory());

test('at least one DirectAdmin host configuration is discovered', () => {
  assert.ok(hosts.length > 0);
});

for (const host of hosts) {
  const cfg = fs.readFileSync(path.join(base, host.name, '.htaccess'), 'utf8');

  test(`${host.name}: no wildcard CORS or federation credential headers`, () => {
    assert.doesNotMatch(cfg, /Access-Control-Allow-Origin\s+"?\*/i);
    assert.doesNotMatch(cfg, /X-Mandatag-Key/i);
    assert.doesNotMatch(cfg, /Access-Control-Allow-Headers/i);
  });

  test(`${host.name}: entrypoints are not cached`, () => {
    assert.match(cfg, /index\\\.html\|flutter_service_worker\\\.js/);
    assert.match(cfg, /no-cache, no-store, must-revalidate/);
  });

  test(`${host.name}: mutable bundles use short cache lifetimes`, () => {
    for (const type of ['application/javascript', 'text/css', 'application/wasm']) {
      assert.match(cfg, new RegExp(`ExpiresByType ${type.replace('/', '\\/')} "access plus 1 hour"`));
    }
  });

  test(`${host.name}: SPA routing, HTTPS redirect and hidden-file denial preserved`, () => {
    assert.match(cfg, /RewriteRule \^ index\.html \[QSA,L\]/);
    assert.match(cfg, /RewriteCond %\{HTTPS\} off/);
    assert.match(cfg, /<FilesMatch "\^\\\."\>[\s\S]*Require all denied/);
  });
}
