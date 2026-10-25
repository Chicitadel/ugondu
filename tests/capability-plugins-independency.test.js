/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Tests / Governance — Capabilities & Plugins Independency
 * File           : capability-plugins-independency.test.js
 * Version        : 1.0.0
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

describe('Capability & Plugins Independency Suite (UAIGOS 3.0.0)', () => {
  const publicKey = loadPublicKey();

  test('CPI-001: ugondu-plugin-node runs independently in sandbox and emits canonical NODE_INSTALL', async () => {
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
    });

    assert.ok(Array.isArray(steps), 'Steps must be an array');
    assert.strictEqual(steps.length, 1);
    assert.strictEqual(steps[0].action, 'NODE_INSTALL');
    assert.strictEqual(steps[0].payload.packageManager, 'npm');
    assert.strictEqual(steps[0].payload.production, true);
  });

  test('CPI-002: ugondu-plugin-composer runs independently in sandbox and emits canonical COMPOSER_INSTALL', async () => {
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
    });

    assert.ok(Array.isArray(steps), 'Steps must be an array');
    assert.strictEqual(steps.length, 1);
    assert.strictEqual(steps[0].action, 'COMPOSER_INSTALL');
    assert.strictEqual(steps[0].payload.optimize, true);
    assert.strictEqual(steps[0].payload.nodev, true);
  });

  test('CPI-003: ugondu-plugin-php-fpm is cryptographically verified but fail-closed on arbitrary shell execution', async () => {
    const pluginDir = path.join(ROOT, 'plugins', 'ugondu-plugin-php-fpm');
    assert.ok(fs.existsSync(pluginDir), 'PHP-FPM plugin dir must exist');

    const manifestPath = path.join(pluginDir, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    assert.strictEqual(manifest.name, 'ugondu-plugin-php-fpm');
    assert.strictEqual(verifyPluginSignature(pluginDir, manifest, publicKey), true, 'Signature must be valid');

    // Zero-trust enforcement: arbitrary shell execution (SHELL_EXEC) must fail closed in sandbox
    await assert.rejects(
      async () => executePluginSandbox(pluginDir, {}),
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

  test('CPI-008: Corporate Header Governance — no AI Governed or AI generated trace in plugin sources', () => {
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
            `Forbidden AI generated trace found in ${full}`
          );
        }
      }
    };

    for (const d of targetDirs) {
      inspectDir(d);
    }
  });
});
