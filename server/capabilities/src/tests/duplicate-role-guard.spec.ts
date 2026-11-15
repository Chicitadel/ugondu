/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Capabilities / Tests
 * File           : duplicate-role-guard.spec.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-21
 * Last Modified  : 2026-10-21
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53 / UAIGOS 3.0.0
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { DuplicateRoleGuard } from '../continuity/DuplicateRoleGuard';

describe('DuplicateRoleGuard', () => {
  let guard: DuplicateRoleGuard;

  beforeEach(() => {
    guard = new DuplicateRoleGuard(['UgonduCORExecutionRole', 'UgonduCORRunner']);
  });

  describe('Syntax and Naming Validation', () => {
    it('rejects empty role names', () => {
      const res = guard.evaluateCreation('', []);
      expect(res.allowed).toBe(false);
      expect(res.status).toBe('INVALID_ROLE_NAME');
    });

    it('rejects names with illegal characters', () => {
      const res = guard.evaluateCreation('Role with spaces', []);
      expect(res.allowed).toBe(false);
      expect(res.status).toBe('INVALID_ROLE_NAME');
    });

    it('rejects role names exceeding 64 characters', () => {
      const longName = 'A'.repeat(65);
      const res = guard.evaluateCreation(longName, []);
      expect(res.allowed).toBe(false);
      expect(res.status).toBe('INVALID_ROLE_NAME');
    });
  });

  describe('Preflight Discovery & Fail-Closed Behavior', () => {
    it('blocks creation if preflight discovery failed with AccessDenied', () => {
      const res = guard.evaluateCreationWithPreflight('UgonduAppWorkerRole', {
        success: false,
        discoveredRoles: [],
        errorCode: 'AccessDenied',
        errorMessage: 'User is not authorized to perform: iam:ListRoles',
      });

      expect(res.allowed).toBe(false);
      expect(res.status).toBe('UNVERIFIED_PREFLIGHT_BLOCKED');
      expect(res.reason).toContain('Prohibiting speculative role creation');
    });
  });

  describe('Exact Match & Duplication Detection', () => {
    it('detects exact match with existing role', () => {
      const res = guard.evaluateCreation('UgonduCORExecutionRole', [
        'UgonduCORExecutionRole',
        'SomeOtherRole',
      ]);
      expect(res.allowed).toBe(false);
      expect(res.status).toBe('EXACT_MATCH_EXISTS');
      expect(res.matchedExistingRole).toBe('UgonduCORExecutionRole');
    });

    it('detects near-duplicate with hyphen variations', () => {
      const res = guard.evaluateCreation('ugondu-cor-runner', [
        'UgonduCORRunner',
        'OtherRole',
      ]);
      expect(res.allowed).toBe(false);
      expect(res.status).toBe('NEAR_DUPLICATE_DETECTED');
      expect(res.matchedExistingRole).toBe('UgonduCORRunner');
    });

    it('redirects non-canonical variations of canonical role', () => {
      const res = guard.evaluateCreation('ugonducorexecutionrole', []);
      expect(res.allowed).toBe(false);
      expect(res.status).toBe('CANONICAL_ALTERNATIVE_EXISTS');
      expect(res.canonicalRole).toBe('UgonduCORExecutionRole');
    });

    it('permits valid, compliant, unique new roles', () => {
      const res = guard.evaluateCreation('UgonduCustomWorkerRole', [
        'UgonduCORExecutionRole',
        'UgonduCORRunner',
      ]);
      expect(res.allowed).toBe(true);
      expect(res.status).toBe('PERMITTED');
    });
  });
});
