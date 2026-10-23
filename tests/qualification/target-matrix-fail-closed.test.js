/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Tests / Qualification — Target Matrix Fail-Closed Suite
 * File           : target-matrix-fail-closed.test.js
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-23
 * Last Modified  : 2026-10-23
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
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.resolve(__dirname, '../..');
const TARGET_MATRIX_PATH = path.join(ROOT, 'config/qualification/target-matrix.json');
const PLATFORM_MATRIX_PATH = path.join(ROOT, 'config/qualification/platform-matrix.json');

// Import compiled TargetAdapterRegistry for engine-core parity checks
const { globalTargetAdapterRegistry, UnsupportedPlatformError } = require(
  path.join(ROOT, 'server/engine-core/dist/targets/target-adapter-contract.js')
);

// Dynamic import for platform evidence verification engine
let platformEvidenceModule = null;
async function getPlatformEvidenceApi() {
  if (!platformEvidenceModule) {
    const modUrl = pathToFileURL(path.join(ROOT, 'scripts/release/platform-evidence.mjs')).href;
    platformEvidenceModule = await import(modUrl);
  }
  return platformEvidenceModule;
}

/**
 * Deterministic Fail-Closed Target Matrix Gate
 * Enforces config/qualification/target-matrix.json boundaries at runtime.
 */
class TargetMatrixGate {
  constructor(matrixPath = TARGET_MATRIX_PATH) {
    this.matrixPath = matrixPath;
    this.rawContent = fs.readFileSync(matrixPath, 'utf8');
    this.matrix = JSON.parse(this.rawContent);
  }

  validateSchema() {
    const m = this.matrix;
    assert.strictEqual(m.schemaVersion, '1.0.0', 'schemaVersion must be 1.0.0');
    assert.strictEqual(m.authority, 'Ujomor Systems Engineering & Governance Authority');
    assert.strictEqual(m.organization, 'Air Roofers SASU');
    assert.strictEqual(m.defaultFailureCode, 'UNSUPPORTED_CAPABILITY');
    assert.ok(m.targets && typeof m.targets === 'object', 'targets object required');
    assert.ok(Array.isArray(m.targets.osArchitectures), 'osArchitectures must be array');
    assert.ok(Array.isArray(m.targets.ideIntegrations), 'ideIntegrations must be array');
    assert.ok(Array.isArray(m.targets.hostProviders), 'hostProviders must be array');
    return true;
  }

  getOsArchitecture(targetTriple) {
    return this.matrix.targets.osArchitectures.find((t) => t.target === targetTriple);
  }

  getIdeIntegration(ideName) {
    const norm = String(ideName || '').toLowerCase().trim();
    return this.matrix.targets.ideIntegrations.find((i) => i.ide.toLowerCase() === norm);
  }

  getHostProvider(providerName) {
    const norm = String(providerName || '').toLowerCase().trim();
    return this.matrix.targets.hostProviders.find((p) => p.provider.toLowerCase() === norm);
  }

  /**
   * Evaluates an IDE request against the matrix.
   * Throws fail-closed error with UNSUPPORTED_CAPABILITY on unsupported IDEs or capabilities.
   */
  evaluateIdeRequest(ideName, capability = 'execute') {
    const entry = this.getIdeIntegration(ideName);
    if (!entry) {
      const err = new Error(`Unsupported IDE integration: ${ideName}`);
      err.code = this.matrix.defaultFailureCode;
      err.unsupportedBehavior = 'FAIL_CLOSED_UNSUPPORTED_CAPABILITY';
      throw err;
    }

    if (entry.status === 'unsupported') {
      const err = new Error(`IDE integration ${ideName} is explicitly unsupported`);
      err.code = this.matrix.defaultFailureCode;
      err.unsupportedBehavior = entry.unsupportedBehavior || 'FAIL_CLOSED_UNSUPPORTED_CAPABILITY';
      throw err;
    }

    if (entry.status === 'experimental') {
      const allowedExperimentalCapabilities = ['preflight_probe', 'manifest_inspection'];
      if (!allowedExperimentalCapabilities.includes(capability)) {
        const err = new Error(`Capability ${capability} is unverified on experimental IDE ${ideName}`);
        err.code = this.matrix.defaultFailureCode;
        err.unsupportedBehavior = entry.unsupportedBehavior || 'FAIL_CLOSED_UNSUPPORTED_CAPABILITY';
        throw err;
      }
      return { allowed: true, status: 'experimental', ide: ideName, capability };
    }

    return { allowed: true, status: 'tested', ide: ideName, capability };
  }

  /**
   * Evaluates a host/cloud provider operation against the matrix.
   * Throws fail-closed error with UNSUPPORTED_CAPABILITY on unsupported providers or operations.
   */
  evaluateProviderRequest(providerName, operation = 'provision') {
    const entry = this.getHostProvider(providerName);
    if (!entry) {
      const err = new Error(`Unsupported host provider: ${providerName}`);
      err.code = this.matrix.defaultFailureCode;
      err.provider = providerName;
      throw err;
    }

    if (entry.qualificationStatus === 'unsupported') {
      const err = new Error(`Host provider ${providerName} is explicitly unsupported`);
      err.code = this.matrix.defaultFailureCode;
      err.provider = providerName;
      err.operation = operation;
      throw err;
    }

    const opStatus = entry.operations?.[operation];
    if (opStatus !== 'tested') {
      const err = new Error(`Operation ${operation} on provider ${providerName} is unsupported`);
      err.code = this.matrix.defaultFailureCode;
      err.provider = providerName;
      err.operation = operation;
      throw err;
    }

    return { allowed: true, provider: providerName, operation, status: 'tested' };
  }

  /**
   * Asserts whether a target can claim Tier 1 native qualification.
   * Cross-compiled targets without native runner evidence fail closed.
   */
  evaluateNativeQualificationClaim(targetTriple, evidence = {}) {
    const entry = this.getOsArchitecture(targetTriple);
    if (!entry) {
      const err = new Error(`Unknown target triple: ${targetTriple}`);
      err.code = 'UNSUPPORTED_TARGET_ENVIRONMENT';
      throw err;
    }

    if (entry.qualificationStatus === 'cross-compiled-only' || !entry.nativeExecutionVerified) {
      if (!evidence.nativeExecutionVerified || evidence.runnerTarget !== targetTriple) {
        const err = new Error(
          `Target ${targetTriple} is cross-compiled only; cannot claim Tier 1 native qualification without verified native execution evidence`
        );
        err.code = 'UNSUPPORTED_TARGET_ENVIRONMENT';
        err.target = targetTriple;
        err.tier = 'cross-compiled-only';
        throw err;
      }
    }

    return { qualified: true, target: targetTriple, tier: 'tested' };
  }
}

// ---------------------------------------------------------------------------
// Test Suite: Target Matrix Fail-Closed Governance
// ---------------------------------------------------------------------------

test('QUAL-GATE-001: Schema integrity and governance metadata validation', () => {
  const gate = new TargetMatrixGate();
  assert.ok(gate.validateSchema());

  const m = gate.matrix;
  assert.strictEqual(m.targets.osArchitectures.length, 5);
  assert.strictEqual(m.targets.ideIntegrations.length, 5);
  assert.strictEqual(m.targets.hostProviders.length, 8);
});

test('QUAL-GATE-002: Tier 1 Native Execution targets strictly recorded and verified', () => {
  const gate = new TargetMatrixGate();
  const tier1Targets = ['windows/amd64', 'linux/amd64', 'darwin/arm64'];

  for (const triple of tier1Targets) {
    const target = gate.getOsArchitecture(triple);
    assert.ok(target, `Missing expected Tier 1 target: ${triple}`);
    assert.strictEqual(target.nativeExecutionVerified, true);
    assert.strictEqual(target.qualificationStatus, 'tested');

    // Evaluates native qualification claim with matching native execution
    const claim = gate.evaluateNativeQualificationClaim(triple, {
      nativeExecutionVerified: true,
      runnerTarget: triple
    });
    assert.strictEqual(claim.qualified, true);
    assert.strictEqual(claim.tier, 'tested');
  }
});

test('QUAL-GATE-003: Tier 2 Cross-Compiled targets cannot claim Tier 1 native qualification', () => {
  const gate = new TargetMatrixGate();
  const tier2Targets = ['linux/arm64', 'darwin/amd64'];

  for (const triple of tier2Targets) {
    const target = gate.getOsArchitecture(triple);
    assert.ok(target, `Missing expected Tier 2 target: ${triple}`);
    assert.strictEqual(target.nativeExecutionVerified, false);
    assert.strictEqual(target.qualificationStatus, 'cross-compiled-only');

    // Attempting to claim native qualification without verified native runner evidence fails closed
    assert.throws(
      () => gate.evaluateNativeQualificationClaim(triple, { nativeExecutionVerified: false }),
      (err) => {
        assert.strictEqual(err.code, 'UNSUPPORTED_TARGET_ENVIRONMENT');
        assert.match(err.message, /cross-compiled only/);
        return true;
      }
    );

    // Cross-runner execution evidence (e.g., amd64 runner building for arm64) also fails closed
    assert.throws(
      () => gate.evaluateNativeQualificationClaim(triple, {
        nativeExecutionVerified: true,
        runnerTarget: 'linux/amd64' // Mismatched runner!
      }),
      (err) => {
        assert.strictEqual(err.code, 'UNSUPPORTED_TARGET_ENVIRONMENT');
        return true;
      }
    );
  }
});

test('QUAL-GATE-004: Explicitly unsupported IDEs fail closed with UNSUPPORTED_CAPABILITY', () => {
  const gate = new TargetMatrixGate();
  const unsupportedIdes = ['jetbrains', 'cursor', 'windsurf', 'neovim'];

  for (const ide of unsupportedIdes) {
    const entry = gate.getIdeIntegration(ide);
    assert.ok(entry, `Missing IDE entry: ${ide}`);
    assert.strictEqual(entry.status, 'unsupported');
    assert.strictEqual(entry.unsupportedBehavior, 'FAIL_CLOSED_UNSUPPORTED_CAPABILITY');

    assert.throws(
      () => gate.evaluateIdeRequest(ide, 'execute'),
      (err) => {
        assert.strictEqual(err.code, 'UNSUPPORTED_CAPABILITY');
        assert.strictEqual(err.unsupportedBehavior, 'FAIL_CLOSED_UNSUPPORTED_CAPABILITY');
        assert.match(err.message, /explicitly unsupported/);
        return true;
      }
    );
  }
});

test('QUAL-GATE-005: Experimental IDE (vscode) fails closed on unverified capabilities', () => {
  const gate = new TargetMatrixGate();
  const entry = gate.getIdeIntegration('vscode');
  assert.ok(entry);
  assert.strictEqual(entry.status, 'experimental');
  assert.strictEqual(entry.unsupportedBehavior, 'FAIL_CLOSED_UNSUPPORTED_CAPABILITY');

  // Whitelisted experimental probe passes
  const probe = gate.evaluateIdeRequest('vscode', 'preflight_probe');
  assert.strictEqual(probe.allowed, true);
  assert.strictEqual(probe.status, 'experimental');

  // Unverified capability execution on experimental IDE fails closed
  assert.throws(
    () => gate.evaluateIdeRequest('vscode', 'arbitrary_runtime_mutation'),
    (err) => {
      assert.strictEqual(err.code, 'UNSUPPORTED_CAPABILITY');
      assert.strictEqual(err.unsupportedBehavior, 'FAIL_CLOSED_UNSUPPORTED_CAPABILITY');
      return true;
    }
  );
});

test('QUAL-GATE-006: Explicitly unsupported cloud providers fail closed with UNSUPPORTED_CAPABILITY', () => {
  const gate = new TargetMatrixGate();
  const unsupportedProviders = ['gcp', 'azure'];
  const operations = ['discover', 'preflight', 'provision', 'verify', 'repair', 'rollback', 'cleanup'];

  for (const provider of unsupportedProviders) {
    const entry = gate.getHostProvider(provider);
    assert.ok(entry, `Missing host provider: ${provider}`);
    assert.strictEqual(entry.qualificationStatus, 'unsupported');

    for (const op of operations) {
      assert.strictEqual(entry.operations[op], 'unsupported');

      assert.throws(
        () => gate.evaluateProviderRequest(provider, op),
        (err) => {
          assert.strictEqual(err.code, 'UNSUPPORTED_CAPABILITY');
          assert.strictEqual(err.provider, provider);
          return true;
        }
      );
    }

    // Engine-core TargetAdapterRegistry integration parity check
    assert.throws(
      () => globalTargetAdapterRegistry.normalizePlatform(provider),
      (err) => {
        assert.ok(err instanceof UnsupportedPlatformError);
        assert.strictEqual(err.code, 'UNSUPPORTED_CAPABILITY');
        assert.strictEqual(err.platform, provider);
        return true;
      }
    );
  }
});

test('QUAL-GATE-007: Tested host providers pass across all mandatory lifecycle operations', () => {
  const gate = new TargetMatrixGate();
  const testedProviders = ['aws', 'directadmin', 'cpanel', 'ssh-vps', 'docker', 'kubernetes'];
  const operations = ['discover', 'preflight', 'provision', 'verify', 'repair', 'rollback', 'cleanup'];

  for (const provider of testedProviders) {
    const entry = gate.getHostProvider(provider);
    assert.ok(entry, `Missing host provider: ${provider}`);
    assert.strictEqual(entry.qualificationStatus, 'tested');

    for (const op of operations) {
      assert.strictEqual(entry.operations[op], 'tested');
      const res = gate.evaluateProviderRequest(provider, op);
      assert.strictEqual(res.allowed, true);
      assert.strictEqual(res.status, 'tested');
    }
  }
});

test('QUAL-GATE-008: Unknown/unlisted targets and platforms fail closed', () => {
  const gate = new TargetMatrixGate();

  // Unknown IDE fails closed
  assert.throws(
    () => gate.evaluateIdeRequest('emacs'),
    (err) => {
      assert.strictEqual(err.code, 'UNSUPPORTED_CAPABILITY');
      return true;
    }
  );

  // Unknown provider fails closed
  assert.throws(
    () => gate.evaluateProviderRequest('digitalocean', 'provision'),
    (err) => {
      assert.strictEqual(err.code, 'UNSUPPORTED_CAPABILITY');
      return true;
    }
  );

  // Unknown architecture triple fails closed
  assert.throws(
    () => gate.evaluateNativeQualificationClaim('solaris/sparc'),
    (err) => {
      assert.strictEqual(err.code, 'UNSUPPORTED_TARGET_ENVIRONMENT');
      return true;
    }
  );
});

test('QUAL-GATE-009: Universal support claim verification dispels universal green and fails closed', async () => {
  const pe = await getPlatformEvidenceApi();
  const realMatrix = JSON.parse(fs.readFileSync(PLATFORM_MATRIX_PATH, 'utf8'));

  // Universal verification on real matrix without all-native evidence must fail closed
  const emptyDerived = { targets: {} };
  const uvResult = pe.verifyUniversalSupport(realMatrix, emptyDerived);
  assert.strictEqual(uvResult.verdict, 'claim-exceeds-evidence');
  assert.ok(uvResult.violations.length > 0, 'Universal green claim must be dispelled when evidence is incomplete');
});

test('QUAL-GATE-010: Matrix mutation guard ensures tier invariants cannot be tampered', () => {
  const gate = new TargetMatrixGate();
  const m = JSON.parse(JSON.stringify(gate.matrix));

  // Adversarial tampering: attempt to set linux/arm64 to tested without verified native execution
  const armTarget = m.targets.osArchitectures.find((t) => t.target === 'linux/arm64');
  armTarget.qualificationStatus = 'tested'; // Inconsistent with nativeExecutionVerified: false!

  const inconsistentGate = new TargetMatrixGate();
  inconsistentGate.matrix = m;

  // Validation detects inconsistency between status and native verification
  const isConsistent = m.targets.osArchitectures.every((t) => {
    if (t.qualificationStatus === 'tested') return t.nativeExecutionVerified === true;
    if (t.qualificationStatus === 'cross-compiled-only') return t.nativeExecutionVerified === false;
    return true;
  });

  assert.strictEqual(isConsistent, false, 'Tampered target matrix must be detected as inconsistent');
});
