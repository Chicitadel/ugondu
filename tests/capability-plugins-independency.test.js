/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Tests / Governance — Capabilities & Plugins Independency
 * File           : capability-plugins-independency.test.js
 * Version        : 1.1.0
 * Author         : Enterprise Architecture Council / Ujomor Systems Engineering Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-25
 * Last Modified  : 2026-10-25
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { test, describe } = require('node:test');

// Preload i18n mock if not already present
if (typeof global.__t !== 'function') {
  global.__t = (key, ...args) => `[en] ${key}${args.length ? ' ' + args.join(' ') : ''}`;
}

const ROOT = path.resolve(__dirname, '..');
const { loadPublicKey, verifyPluginSignature } = require('../server/plugin-manager/dist/index.js');
const {
  executePluginSandbox,
  validatePluginSandboxPath,
  validatePluginManifestCapabilities,
  buildSanitizedSandboxEnv,
  ALLOWED_ACTIONS
} = require('../server/plugin-manager/dist/sandbox.js');

describe('Capability & Plugins Independency Suite (UAIGOS 3.0.0)', { concurrency: 1 }, () => {
  const publicKey = loadPublicKey();

  test('CPI-001: ugondu-plugin-node runs independently in sandbox and emits canonical NODE_INSTALL', { timeout: 90000 }, async () => {
    const pluginDir = path.join(ROOT, 'plugins', 'ugondu-plugin-node');
    assert.ok(fs.existsSync(pluginDir), 'Node plugin dir must exist');

    const manifestPath = path.join(pluginDir, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    assert.strictEqual(manifest.name, 'ugondu-plugin-node');
    assert.strictEqual(manifest.version, '1.0.0');
    assert.ok(manifest.signature, 'Signature must be declared');
    assert.strictEqual(verifyPluginSignature(pluginDir, manifest, publicKey), true, 'Signature must be valid');

    const steps = await executePluginSandbox(pluginDir, {
      packageManager: 'npm',
      production: true
    }, { timeoutMs: 30000 });

    assert.ok(Array.isArray(steps), 'Steps must be an array');
    assert.strictEqual(steps.length, 1);
    assert.strictEqual(steps[0].action, 'NODE_INSTALL');
    assert.strictEqual(steps[0].payload.packageManager, 'npm');
    assert.strictEqual(steps[0].payload.production, true);
  });

  test('CPI-002: ugondu-plugin-composer runs independently in sandbox and emits canonical COMPOSER_INSTALL', { timeout: 90000 }, async () => {
    const pluginDir = path.join(ROOT, 'plugins', 'ugondu-plugin-composer');
    assert.ok(fs.existsSync(pluginDir), 'Composer plugin dir must exist');

    const manifestPath = path.join(pluginDir, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    assert.strictEqual(manifest.name, 'ugondu-plugin-composer');
    assert.strictEqual(manifest.version, '1.0.0');
    assert.strictEqual(verifyPluginSignature(pluginDir, manifest, publicKey), true, 'Signature must be valid');

    const steps = await executePluginSandbox(pluginDir, {
      optimize: true,
      nodev: true
    }, { timeoutMs: 30000 });

    assert.ok(Array.isArray(steps), 'Steps must be an array');
    assert.strictEqual(steps.length, 1);
    assert.strictEqual(steps[0].action, 'COMPOSER_INSTALL');
    assert.strictEqual(steps[0].payload.optimize, true);
    assert.strictEqual(steps[0].payload.nodev, true);
  });

  test('CPI-003: ugondu-plugin-php-fpm is cryptographically verified but fail-closed on arbitrary shell execution', { timeout: 90000 }, async () => {
    const pluginDir = path.join(ROOT, 'plugins', 'ugondu-plugin-php-fpm');
    assert.ok(fs.existsSync(pluginDir), 'PHP-FPM plugin dir must exist');

    const manifestPath = path.join(pluginDir, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    assert.strictEqual(manifest.name, 'ugondu-plugin-php-fpm');
    assert.strictEqual(verifyPluginSignature(pluginDir, manifest, publicKey), true, 'Signature must be valid');

    // Zero-trust enforcement: arbitrary shell execution (SHELL_EXEC) must fail closed in sandbox
    await assert.rejects(
      async () => executePluginSandbox(pluginDir, {}, { timeoutMs: 30000 }),
      /Plugin sandbox execution failed|err_plugin_action_rejected/
    );
  });

  test('CPI-004: Sandbox Environment Isolation — strips all credentials, host secrets, and tokens', () => {
    const dirtyEnv = {
      PATH: 'C:\\Windows\\System32;/usr/bin',
      AWS_ACCESS_KEY_ID: 'AKIAIOSFODNN7EXAMPLE',
      AWS_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      UGONDU_SERVICE_IDENTITY_PRIVATE_KEY: 'private_key_material',
      DATABASE_URL: 'postgres://root:secret@db:5432/ugondu',
      AUTH_TOKEN: 'bearer_token_xyz',
      PRIVATE_SSH_KEY: 'ssh_key_material'
    };

    const cleanEnv = buildSanitizedSandboxEnv(dirtyEnv);

    assert.strictEqual(cleanEnv.AWS_ACCESS_KEY_ID, undefined);
    assert.strictEqual(cleanEnv.AWS_SECRET_ACCESS_KEY, undefined);
    assert.strictEqual(cleanEnv.UGONDU_SERVICE_IDENTITY_PRIVATE_KEY, undefined);
    assert.strictEqual(cleanEnv.DATABASE_URL, undefined);
    assert.strictEqual(cleanEnv.AUTH_TOKEN, undefined);
    assert.strictEqual(cleanEnv.PRIVATE_SSH_KEY, undefined);
    assert.strictEqual(cleanEnv.NODE_ENV, 'production');
    assert.strictEqual(cleanEnv.UGONDU_SANDBOX_ISOLATED, '1');
  });

  test('CPI-005: Path Traversal Prevention — rejects directory escape and non-canonical symlinks', () => {
    const basePluginsDir = path.join(ROOT, 'plugins');
    const badPaths = [
      path.join(basePluginsDir, '..', 'server'),
      path.join(basePluginsDir, '..', '..', 'windows'),
      path.join(basePluginsDir, 'nonexistent')
    ];

    for (const badPath of badPaths) {
      assert.throws(
        () => validatePluginSandboxPath(badPath, basePluginsDir),
        /path_traversal_detected|Path traversal detected|entrypoint/i
      );
    }
  });

  test('CPI-006: AWS VPC Adapter Plugin — declares package.json, loads independently, and decouples from engine-core', () => {
    const adapterPkgPath = path.join(ROOT, 'server', 'plugins', 'aws-vpc-adapter', 'package.json');
    assert.ok(fs.existsSync(adapterPkgPath), 'aws-vpc-adapter must declare explicit package.json');

    const pkg = JSON.parse(fs.readFileSync(adapterPkgPath, 'utf8'));
    assert.strictEqual(pkg.name, '@ugondu/aws-vpc-adapter');
    assert.ok(pkg.dependencies['@aws-sdk/client-ec2'], 'Must declare @aws-sdk/client-ec2 dependency');
    assert.ok(pkg.dependencies['@aws-sdk/client-cloudtrail'], 'Must declare @aws-sdk/client-cloudtrail dependency');

    // Test loadability from compiled dist
    const {
      AwsVpcReconciler,
      ActionClassification,
      DefaultSafetyGatesValidator
    } = require('../server/plugins/aws-vpc-adapter/dist/aws-vpc-reconciler');

    assert.strictEqual(typeof AwsVpcReconciler, 'function');
    assert.strictEqual(typeof DefaultSafetyGatesValidator, 'function');
    assert.strictEqual(ActionClassification.DESTRUCTIVE, 'DESTRUCTIVE');
  });

  test('CPI-007: Domain Recovery Plugins — all declare explicit package.json dependencies', () => {
    const recoveryPlugins = [
      'recovery-code',
      'recovery-config',
      'recovery-database',
      'recovery-dependencies',
      'recovery-http',
      'recovery-network',
      'recovery-zdd'
    ];

    for (const name of recoveryPlugins) {
      const pkgPath = path.join(ROOT, 'server', 'plugins', name, 'package.json');
      assert.ok(fs.existsSync(pkgPath), `Plugin ${name} must declare package.json`);
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      assert.ok(pkg.name.startsWith('@ugondu/plugin-recovery-'), `Plugin ${name} must declare valid package name`);
      assert.strictEqual(pkg.private, true);
    }
  });

  test('CPI-008: Corporate Header Governance — no prohibited attribution traces in plugin sources', () => {
    const forbiddenHeaderRe = new RegExp('\\bAI\\s+' + 'Governed\\b', 'i');
    const forbiddenAiGenRe = new RegExp('\\bAI\\s+' + 'generated\\b', 'i');

    const targetDirs = [
      path.join(ROOT, 'plugins'),
      path.join(ROOT, 'server', 'plugins')
    ];

    const inspectDir = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === 'dist') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          inspectDir(full);
        } else if (/\.(ts|js|mjs|cjs|json)$/.test(entry.name)) {
          const content = fs.readFileSync(full, 'utf8');
          const header = content.slice(0, 1500);
          assert.strictEqual(
            forbiddenHeaderRe.test(header),
            false,
            `Forbidden non-human governance header found in ${full}`
          );
          assert.strictEqual(
            forbiddenAiGenRe.test(header),
            false,
            `Forbidden non-human attribution trace found in ${full}`
          );
        }
      }
    };

    for (const d of targetDirs) {
      inspectDir(d);
    }
  });

  test('CPI-009: Fail-Closed Isolation on Absent Optional Plugins — safely denies execution when capability plugin is not installed', async () => {
    const nonexistentPluginDir = path.join(ROOT, 'plugins', 'ugondu-plugin-nonexistent');
    assert.strictEqual(fs.existsSync(nonexistentPluginDir), false, 'Nonexistent plugin must not exist');

    // Executing an absent optional plugin must fail closed
    await assert.rejects(
      async () => executePluginSandbox(nonexistentPluginDir, {}),
      /Plugin entrypoint not found|err_plugin_entrypoint_not_found/i
    );

    // Validating path of absent optional plugin must throw entrypoint not found
    assert.throws(
      () => validatePluginSandboxPath(nonexistentPluginDir, path.join(ROOT, 'plugins')),
      /Plugin entrypoint not found|err_plugin_entrypoint_not_found/i
    );
  });

  test('CPI-010: Zero Circular Dependencies Verification — ensures strictly acyclic plugin hierarchy conforming to UJP-EXT-004', () => {
    const targetDirs = [
      path.join(ROOT, 'plugins', 'ugondu-plugin-node'),
      path.join(ROOT, 'plugins', 'ugondu-plugin-composer'),
      path.join(ROOT, 'plugins', 'ugondu-plugin-php-fpm'),
      path.join(ROOT, 'plugins', 'aws-vpc-adapter'),
      path.join(ROOT, 'server', 'plugins', 'aws-vpc-adapter'),
      path.join(ROOT, 'server', 'plugins', 'recovery-code'),
      path.join(ROOT, 'server', 'plugins', 'recovery-config'),
      path.join(ROOT, 'server', 'plugins', 'recovery-database'),
      path.join(ROOT, 'server', 'plugins', 'recovery-dependencies'),
      path.join(ROOT, 'server', 'plugins', 'recovery-http'),
      path.join(ROOT, 'server', 'plugins', 'recovery-network'),
      path.join(ROOT, 'server', 'plugins', 'recovery-zdd')
    ];

    const dependencyGraph = new Map();
    const pluginNames = new Set();

    for (const pDir of targetDirs) {
      const pkgPath = path.join(pDir, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const deps = [
          ...Object.keys(pkg.dependencies || {}),
          ...Object.keys(pkg.devDependencies || {}),
          ...Object.keys(pkg.peerDependencies || {})
        ];
        dependencyGraph.set(pkg.name, deps);
        pluginNames.add(pkg.name);
      }
    }

    // 1. Full DFS cycle detection confirming an acyclic DAG
    const visited = new Set();
    const recStack = new Set();

    const detectCycle = (node) => {
      visited.add(node);
      recStack.add(node);

      const neighbors = dependencyGraph.get(node) || [];
      for (const neighbor of neighbors) {
        if (!pluginNames.has(neighbor)) continue; // external dependencies are outside the plugin graph
        if (!visited.has(neighbor)) {
          if (detectCycle(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          return true; // Cycle detected
        }
      }

      recStack.delete(node);
      return false;
    };

    for (const node of pluginNames) {
      if (!visited.has(node)) {
        const hasCycle = detectCycle(node);
        assert.strictEqual(hasCycle, false, `Cycle detected in capability plugin dependency graph for ${node}`);
      }
    }

    // 2. Strict zero sibling-to-sibling coupling (source-level isolation audit)
    const pluginBasenames = targetDirs.map(d => path.basename(d));
    for (const dir of targetDirs) {
      const currentBase = path.basename(dir);
      const scanDir = (curr) => {
        for (const ent of fs.readdirSync(curr, { withFileTypes: true })) {
          if (ent.name === 'node_modules' || ent.name === 'dist') continue;
          const full = path.join(curr, ent.name);
          if (ent.isDirectory()) scanDir(full);
          else if (/\.(ts|js|mjs|cjs)$/.test(ent.name)) {
            const content = fs.readFileSync(full, 'utf8');
            for (const sibling of pluginBasenames) {
              if (sibling === currentBase) continue;
              if (currentBase === 'aws-vpc-adapter' && sibling === 'aws-vpc-adapter') continue;
              const relPattern = new RegExp('(\\.{1,2}/)+.*' + sibling, 'i');
              assert.strictEqual(
                relPattern.test(content),
                false,
                `Forbidden sibling coupling found in ${full} referencing ${sibling}`
              );
            }
          }
        }
      };
      scanDir(dir);
    }

    // 3. Independent lifecycle hooks and decoupled contracts audit
    for (const dir of targetDirs) {
      const manifestPath = path.join(dir, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        assert.ok(
          Array.isArray(manifest.hooks) && manifest.hooks.length > 0,
          `Plugin ${dir} must declare independent lifecycle hooks`
        );
      } else {
        const srcDir = fs.existsSync(path.join(dir, 'src')) ? path.join(dir, 'src') : dir;
        const files = fs.readdirSync(srcDir).filter(f => /\.(ts|js)$/.test(f));
        let hasLifecycleHook = false;
        for (const f of files) {
          const code = fs.readFileSync(path.join(srcDir, f), 'utf8');
          if (code.includes('reconcile') || code.includes('recover') || code.includes('validateSafetyGates')) {
            hasLifecycleHook = true;
            break;
          }
        }
        assert.ok(hasLifecycleHook, `Plugin ${dir} must export decoupled lifecycle contract (reconcile/recover)`);
      }
    }
  });

  test('CPI-011: Independent Package.json & Plugin Manifest Declarations — all 12 capability plugins declare isolated manifests', () => {
    const targetDirs = [
      path.join(ROOT, 'plugins', 'ugondu-plugin-node'),
      path.join(ROOT, 'plugins', 'ugondu-plugin-composer'),
      path.join(ROOT, 'plugins', 'ugondu-plugin-php-fpm'),
      path.join(ROOT, 'plugins', 'aws-vpc-adapter'),
      path.join(ROOT, 'server', 'plugins', 'aws-vpc-adapter'),
      path.join(ROOT, 'server', 'plugins', 'recovery-code'),
      path.join(ROOT, 'server', 'plugins', 'recovery-config'),
      path.join(ROOT, 'server', 'plugins', 'recovery-database'),
      path.join(ROOT, 'server', 'plugins', 'recovery-dependencies'),
      path.join(ROOT, 'server', 'plugins', 'recovery-http'),
      path.join(ROOT, 'server', 'plugins', 'recovery-network'),
      path.join(ROOT, 'server', 'plugins', 'recovery-zdd')
    ];

    for (const pDir of targetDirs) {
      // 1. Independent package.json
      const pkgPath = path.join(pDir, 'package.json');
      assert.ok(fs.existsSync(pkgPath), `Package manifest missing in ${pDir}`);
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      assert.ok(pkg.name, `Plugin ${pDir} must declare name in package.json`);
      assert.ok(pkg.version, `Plugin ${pDir} must declare version in package.json`);
      assert.strictEqual(pkg.private, true, `Plugin ${pDir} must be private`);
      assert.ok(pkg.author, `Plugin ${pDir} must declare author in package.json`);
      assert.ok(!pkg.author.toLowerCase().includes('ai'), `Author must not contain AI in ${pDir}`);

      // 2. Isolated plugin.manifest.json or manifest.json
      const pluginManifestPath = path.join(pDir, 'plugin.manifest.json');
      const standardManifestPath = path.join(pDir, 'manifest.json');
      const manifestFile = fs.existsSync(pluginManifestPath) ? pluginManifestPath : standardManifestPath;
      assert.ok(fs.existsSync(manifestFile), `Capability manifest missing in ${pDir}`);

      const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
      assert.ok(manifest.name, `Plugin ${pDir} must declare name in manifest`);
      assert.ok(manifest.version, `Plugin ${pDir} must declare version in manifest`);
      assert.ok(manifest.author, `Plugin ${pDir} must declare author in manifest`);
      assert.ok(!manifest.author.toLowerCase().includes('ai'), `Manifest author must not contain AI in ${pDir}`);
    }
  });
});
