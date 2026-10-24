/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Tests / Qualification — Public AI Barrel Export Qualification
 * File           : ai-barrel-export-qualification.test.js
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-24
 * Last Modified  : 2026-10-24
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
 * - ISO 27001 / SOC 2 / OWASP ASVS / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicAiBarrel = require('../../server/engine-core/dist/ai');
const indexPath = path.resolve(__dirname, '../../server/engine-core/src/ai/index.ts');

test('BARREL-001: createTrustedLiveInferenceReceipt is strictly undefined in public AI barrel', () => {
  assert.strictEqual(
    publicAiBarrel.createTrustedLiveInferenceReceipt,
    undefined,
    'createTrustedLiveInferenceReceipt must not be exported by the public AI barrel'
  );
  assert.strictEqual(
    'createTrustedLiveInferenceReceipt' in publicAiBarrel,
    false,
    'createTrustedLiveInferenceReceipt must not be present in public barrel keys'
  );
});

test('BARREL-002: TrustedReceiptService.createReceipt is strictly undefined', () => {
  assert.ok(publicAiBarrel.TrustedReceiptService, 'TrustedReceiptService must exist for verification');
  assert.strictEqual(
    publicAiBarrel.TrustedReceiptService.createReceipt,
    undefined,
    'TrustedReceiptService.createReceipt must be strictly undefined'
  );
  assert.strictEqual(
    'createReceipt' in publicAiBarrel.TrustedReceiptService,
    false,
    'createReceipt property must not exist on TrustedReceiptService'
  );
});

test('BARREL-003: Minting and signing helpers are strictly inaccessible through public barrel', () => {
  const inaccessibleHelpers = [
    'computeProvenanceSeal',
    'getProvenanceSigningKey',
    'getProvenanceSigningKeyInfo',
    'createTrustedLiveInferenceReceipt',
  ];

  for (const helper of inaccessibleHelpers) {
    assert.strictEqual(
      publicAiBarrel[helper],
      undefined,
      `Signing helper ${helper} must be strictly undefined on public AI barrel`
    );
    assert.strictEqual(
      helper in publicAiBarrel,
      false,
      `Signing helper ${helper} must not be a property of public AI barrel`
    );
  }
});

test('BARREL-004: Public AI barrel exposes only verification and gateway runtime contracts', () => {
  assert.strictEqual(typeof publicAiBarrel.validateLiveInferenceReceipt, 'function');
  assert.strictEqual(typeof publicAiBarrel.isTrustedLiveInferenceReceipt, 'function');
  assert.strictEqual(typeof publicAiBarrel.TrustedReceiptService.validateReceipt, 'function');
  assert.strictEqual(typeof publicAiBarrel.TrustedReceiptService.isTrustedReceipt, 'function');
  assert.strictEqual(typeof publicAiBarrel.CredentialBroker, 'function');
  assert.strictEqual(typeof publicAiBarrel.ModelCatalog, 'function');
  assert.strictEqual(typeof publicAiBarrel.InferenceGateway, 'function');
});

test('BARREL-005: Source index.ts does not export minting or signing primitives', () => {
  const indexSource = fs.readFileSync(indexPath, 'utf8');
  assert.strictEqual(
    indexSource.includes('createTrustedLiveInferenceReceipt'),
    false,
    'src/ai/index.ts must not contain createTrustedLiveInferenceReceipt in exports'
  );
  assert.strictEqual(
    indexSource.includes('computeProvenanceSeal'),
    false,
    'src/ai/index.ts must not contain computeProvenanceSeal in exports'
  );
  assert.strictEqual(
    indexSource.includes('getProvenanceSigningKey'),
    false,
    'src/ai/index.ts must not contain getProvenanceSigningKey in exports'
  );
});
