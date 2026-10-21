/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Capabilities / Tests
 * File           : region-policy-renderer.spec.ts
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

import { RegionPolicyRenderer, RenderedPolicyDocument } from '../continuity/RegionPolicyRenderer';

describe('RegionPolicyRenderer', () => {
  let renderer: RegionPolicyRenderer;

  beforeEach(() => {
    renderer = new RegionPolicyRenderer(['eu-west-3', 'eu-west-1']);
  });

  it('rejects invalid 11-digit or non-numeric account IDs', () => {
    const template: RenderedPolicyDocument = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'Stmt1',
          Effect: 'Allow',
          Action: 'ec2:Describe*',
          Resource: 'arn:aws:ec2:eu-west-3:12345678901:instance/*',
        },
      ],
    };

    const res = renderer.renderPolicy(template, {
      accountId: '12345678901', // 11 digits
      allowedRegions: ['eu-west-3'],
      executionRoleName: 'UgonduCORExecutionRole',
    });

    expect(res.valid).toBe(false);
    expect(res.violations).toContain("Invalid AWS Account ID '12345678901': must be exactly 12 digits.");
  });

  it('rejects malformed region names', () => {
    const template: RenderedPolicyDocument = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'Stmt1',
          Effect: 'Allow',
          Action: 'ec2:Describe*',
          Resource: 'arn:aws:ec2:eu-west-3:123456789012:instance/*',
        },
      ],
    };

    const res = renderer.renderPolicy(template, {
      accountId: '123456789012',
      allowedRegions: ['invalid_region_name!'],
      executionRoleName: 'UgonduCORExecutionRole',
    });

    expect(res.valid).toBe(false);
    expect(res.violations[0]).toContain('violates standard AWS region naming pattern');
  });

  it('substitutes account, region, role name, and transaction tokens cleanly', () => {
    const template: RenderedPolicyDocument = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'ScopedResourceAccess',
          Effect: 'Allow',
          Action: 'ec2:RunInstances',
          Resource: 'arn:aws:ec2:${REGION}:${ACCOUNT_ID}:instance/*',
        },
      ],
    };

    const res = renderer.renderPolicy(template, {
      accountId: '971671216490',
      allowedRegions: ['eu-west-3'],
      executionRoleName: 'UgonduCORExecutionRole',
      transactionId: 'tx-20261021',
    });

    expect(res.valid).toBe(true);
    expect(res.violations.length).toBe(0);
    expect(res.document.Statement[0].Resource).toBe(
      'arn:aws:ec2:eu-west-3:971671216490:instance/*'
    );
  });

  it('detects and rejects unrestricted wildcard * resources on regional actions', () => {
    const template: RenderedPolicyDocument = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'WildcardViolation',
          Effect: 'Allow',
          Action: 'ec2:TerminateInstances',
          Resource: '*',
        },
      ],
    };

    const res = renderer.renderPolicy(template, {
      accountId: '971671216490',
      allowedRegions: ['eu-west-3'],
      executionRoleName: 'UgonduCORExecutionRole',
    });

    expect(res.valid).toBe(false);
    expect(res.violations.some((v) => v.includes("contains unrestricted wildcard '*' resource"))).toBe(true);
  });
});
