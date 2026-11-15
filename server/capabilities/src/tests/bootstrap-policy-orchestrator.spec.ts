/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Capabilities / Execution Continuity & Policy Governance Tests
 * File           : bootstrap-policy-orchestrator.spec.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU (RCS Paris 943 432 534)
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
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import {
  BootstrapInvocationEntrypoint,
  BootstrapPolicyOrchestrator,
  BootstrapReconciliationRequest,
  PolicyPackManifest,
  RegionPolicyRenderer,
  RenderedPolicyDocument,
  computePolicyDigest,
} from '../index';

describe('BootstrapPolicyOrchestrator — 6 Operating States, 5-Stage Pipeline & 4-Check Verification', () => {
  const scope = {
    accountId: '991158927746',
    allowedRegions: ['eu-west-3'],
    executionRoleName: 'UgonduCORExecutionRole',
    transactionId: 'tx_boot_001',
  };

  const sampleTemplate: RenderedPolicyDocument = {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'AllowRegionalSsmProbe',
        Effect: 'Allow',
        Action: ['ssm:GetParameter'],
        Resource: 'arn:aws:ssm:${REGION}:${ACCOUNT_ID}:parameter/ugondu/*',
      },
    ],
  };

  const renderer = new RegionPolicyRenderer();
  const renderedSample = renderer.renderPolicy(sampleTemplate, scope);
  const canonicalDigest = computePolicyDigest(renderedSample.documentJson);

  const samplePack: PolicyPackManifest = {
    packId: 'ugondu-cor-ssm-pack',
    version: '1.0.0',
    canonicalSha256: canonicalDigest,
    governanceClass: 'ENTERPRISE',
    targetPlatform: 'aws',
    requiredStatements: [
      {
        sid: 'AllowRegionalSsmProbe',
        effect: 'Allow',
        actions: ['ssm:GetParameter'],
        resources: ['arn:aws:ssm:eu-west-3:991158927746:parameter/ugondu/*'],
      },
    ],
  };

  function createBaseRequest(overrides?: Partial<BootstrapReconciliationRequest>): BootstrapReconciliationRequest {
    return {
      transactionId: 'tx_boot_001',
      entrypoint: 'CLI',
      regionScope: scope,
      runnerRoleName: 'UgonduCORRunner',
      desiredPacks: [{ pack: samplePack, template: sampleTemplate, signatureVerified: true }],
      environment: {
        providerReachable: true,
        discoveredRoles: ['UgonduCORExecutionRole', 'UgonduCORRunner'],
        existingPolicies: [],
        bootstrapAuthority: {
          canCreatePolicy: true,
          canUpdatePolicyVersion: true,
          canAttachPolicy: true,
          authorizationMode: 'BOOTSTRAP_SESSION',
        },
        trustRelationshipValid: true,
        negativeIsolationVerified: true,
      },
      ...overrides,
    };
  }

  it('State 1: INITIAL_INSTALLATION_AUTHORIZED — provisions missing policies and confirms all 4 checks', () => {
    const orchestrator = new BootstrapPolicyOrchestrator();
    const result = orchestrator.executeReconciliation(createBaseRequest());

    expect(result.operatingState).toBe('INITIAL_INSTALLATION_AUTHORIZED');
    expect(result.readyForQualificationOrDeploy).toBe(true);
    expect(result.reusedCanonicalRole).toBe(true);
    expect(result.completedStages).toEqual([
      'DISCOVER_AND_RECONCILE',
      'VALIDATE_POLICY_PACK',
      'PROVISION_VIA_BOOTSTRAP',
      'VERIFY_EFFECTIVE_RESULT',
      'READY_FOR_QUALIFICATION_OR_DEPLOY',
    ]);
    expect(result.executedActions.map((a) => a.action)).toEqual(['CREATE_POLICY', 'ATTACH_POLICY']);
    expect(result.fourCheckVerification).toEqual({
      runnerDelegationConfirmed: true,
      executionRoleTrustConfirmed: true,
      v9PolicyAttachmentsConfirmed: true,
      regionConsistencyConfirmed: true,
      confirmedCount: 4,
      summaryText: '4 of 4 checks confirmed',
    });
    expect(result.evidence?.evidenceDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(orchestrator.getLedger().verifyIntegrity().valid).toBe(true);
  });

  it('State 2: RETURNING_INSTALLATION_MATCHED — performs zero mutations (NO_OP) when hashes and attachments match', () => {
    const orchestrator = new BootstrapPolicyOrchestrator();
    const req = createBaseRequest({
      environment: {
        providerReachable: true,
        discoveredRoles: ['UgonduCORExecutionRole', 'UgonduCORRunner'],
        existingPolicies: [
          {
            packId: samplePack.packId,
            policyArn: 'arn:aws:iam::991158927746:policy/ugondu-cor-ssm-pack',
            documentJson: renderedSample.documentJson,
            documentSha256: renderedSample.documentSha256,
            ownedByUgondu: true,
            attachedToRoles: ['UgonduCORExecutionRole'],
          },
        ],
        bootstrapAuthority: { canCreatePolicy: false, canUpdatePolicyVersion: false, canAttachPolicy: false, authorizationMode: 'NONE' },
      },
    });

    const result = orchestrator.executeReconciliation(req);

    expect(result.operatingState).toBe('RETURNING_INSTALLATION_MATCHED');
    expect(result.readyForQualificationOrDeploy).toBe(true);
    expect(result.executedActions).toHaveLength(1);
    expect(result.executedActions[0].action).toBe('NO_OP');
    expect(result.fourCheckVerification.summaryText).toBe('4 of 4 checks confirmed');
  });

  it('State 3: DRIFT_DETECTED_RECONCILABLE — updates drifted policy version and re-attaches when authorized', () => {
    const orchestrator = new BootstrapPolicyOrchestrator();
    const driftedDoc = JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'AllowRegionalSsmProbe',
          Effect: 'Allow',
          Action: ['ssm:GetParameter', 'ssm:GetParameters'],
          Resource: 'arn:aws:ssm:eu-west-3:991158927746:parameter/ugondu/*',
        },
      ],
    });

    const req = createBaseRequest({
      environment: {
        providerReachable: true,
        discoveredRoles: ['UgonduCORExecutionRole'],
        existingPolicies: [
          {
            packId: samplePack.packId,
            policyArn: 'arn:aws:iam::991158927746:policy/ugondu-cor-ssm-pack',
            documentJson: driftedDoc,
            ownedByUgondu: true,
            attachedToRoles: [],
          },
        ],
        bootstrapAuthority: { canCreatePolicy: true, canUpdatePolicyVersion: true, canAttachPolicy: true, authorizationMode: 'INFRA_CONTROLLER' },
      },
    });

    const result = orchestrator.executeReconciliation(req);

    expect(result.operatingState).toBe('DRIFT_DETECTED_RECONCILABLE');
    expect(result.readyForQualificationOrDeploy).toBe(true);
    expect(result.executedActions.map((a) => a.action)).toEqual(['UPDATE_POLICY_VERSION', 'ATTACH_POLICY']);
    expect(result.fourCheckVerification.summaryText).toBe('4 of 4 checks confirmed');
  });

  it('State 4: BOOTSTRAP_AUTHORITY_MISSING_OR_INSUFFICIENT — halts before provision with UG-BOOTSTRAP-AUTH-MISSING', () => {
    const orchestrator = new BootstrapPolicyOrchestrator();
    const req = createBaseRequest({
      environment: {
        providerReachable: true,
        discoveredRoles: ['UgonduCORExecutionRole'],
        existingPolicies: [],
        bootstrapAuthority: { canCreatePolicy: false, canUpdatePolicyVersion: false, canAttachPolicy: false, authorizationMode: 'NONE' },
      },
    });

    const result = orchestrator.executeReconciliation(req);

    expect(result.operatingState).toBe('BOOTSTRAP_AUTHORITY_MISSING_OR_INSUFFICIENT');
    expect(result.readyForQualificationOrDeploy).toBe(false);
    expect(result.failedStage).toBe('PROVISION_VIA_BOOTSTRAP');
    expect(result.errorCode).toBe('UG-BOOTSTRAP-AUTH-MISSING');
    expect(result.missingCapabilities).toEqual(['iam:CreatePolicy', 'iam:AttachRolePolicy']);
    expect(result.supportedAuthorizationOptions).toEqual(['BOOTSTRAP_SESSION', 'ADMIN_DELEGATION', 'INFRA_CONTROLLER']);
    expect(result.executedActions).toHaveLength(0);
    expect(result.fourCheckVerification.v9PolicyAttachmentsConfirmed).toBe(false);
  });

  it('State 5: PROVIDER_OR_NETWORK_UNAVAILABLE — checkpoints ledger and returns fail-closed resume plan', () => {
    const orchestrator = new BootstrapPolicyOrchestrator();
    const req = createBaseRequest({
      environment: {
        providerReachable: false,
        networkError: 'ETIMEDOUT connecting to sts.eu-west-3.amazonaws.com',
        discoveredRoles: [],
        existingPolicies: [],
        bootstrapAuthority: { canCreatePolicy: true, canUpdatePolicyVersion: true, canAttachPolicy: true },
      },
    });

    const result = orchestrator.executeReconciliation(req);

    expect(result.operatingState).toBe('PROVIDER_OR_NETWORK_UNAVAILABLE');
    expect(result.readyForQualificationOrDeploy).toBe(false);
    expect(result.failedStage).toBe('DISCOVER_AND_RECONCILE');
    expect(result.errorCode).toBe('UG-PROVIDER-UNAVAILABLE');
    expect(result.checkpoint?.lastState).toBe('PAUSED');
    expect(result.resumePlan?.status).toBe('BLOCKED_UNPROBED');
    expect(result.fourCheckVerification.confirmedCount).toBe(0);
  });

  it('State 6: OWNERSHIP_OR_PERMISSIONS_AMBIGUOUS — refuses to overwrite foreign or unowned policies', () => {
    const orchestrator = new BootstrapPolicyOrchestrator();
    const req = createBaseRequest({
      environment: {
        providerReachable: true,
        discoveredRoles: ['UgonduCORExecutionRole'],
        existingPolicies: [
          {
            packId: samplePack.packId,
            policyArn: 'arn:aws:iam::991158927746:policy/ugondu-cor-ssm-pack',
            documentJson: renderedSample.documentJson,
            ownedByUgondu: false,
            attachedToRoles: ['CustomerCustomRole'],
          },
        ],
        bootstrapAuthority: { canCreatePolicy: true, canUpdatePolicyVersion: true, canAttachPolicy: true },
      },
    });

    const result = orchestrator.executeReconciliation(req);

    expect(result.operatingState).toBe('OWNERSHIP_OR_PERMISSIONS_AMBIGUOUS');
    expect(result.readyForQualificationOrDeploy).toBe(false);
    expect(result.errorCode).toBe('UG-OWNERSHIP-AMBIGUOUS');
    expect(result.executedActions).toHaveLength(0);
  });

  it('Rejects over-privileged runner policy containing ec2:CreateVpc / rds:CreateDBInstance with UG-RUNNER-OVERPRIVILEGED', () => {
    const orchestrator = new BootstrapPolicyOrchestrator();
    const overprivilegedRunnerPolicy = JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'RunnerAssumeAndIllegalWorkload',
          Effect: 'Allow',
          Action: ['sts:AssumeRole', 'ec2:CreateVpc', 'rds:CreateDBInstance'],
          Resource: 'arn:aws:iam::991158927746:role/UgonduCORExecutionRole',
        },
      ],
    });

    const result = orchestrator.executeReconciliation(
      createBaseRequest({
        environment: {
          ...createBaseRequest().environment,
          runnerPolicyDocumentJson: overprivilegedRunnerPolicy,
        },
      })
    );

    expect(result.operatingState).toBe('OWNERSHIP_OR_PERMISSIONS_AMBIGUOUS');
    expect(result.errorCode).toBe('UG-RUNNER-OVERPRIVILEGED');
    expect(result.readyForQualificationOrDeploy).toBe(false);
    expect(result.fourCheckVerification.runnerDelegationConfirmed).toBe(false);
  });

  it('Detects cross-region us-east-1 ARN drift and reconciles to eu-west-3 via UPDATE_POLICY_VERSION', () => {
    const orchestrator = new BootstrapPolicyOrchestrator();
    const usEast1DriftedDoc = JSON.stringify(
      {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'AllowRegionalSsmProbe',
            Effect: 'Allow',
            Action: ['ssm:GetParameter'],
            Resource: 'arn:aws:ssm:us-east-1:991158927746:parameter/ugondu/*',
          },
        ],
      },
      null,
      2
    );

    const result = orchestrator.executeReconciliation(
      createBaseRequest({
        environment: {
          providerReachable: true,
          discoveredRoles: ['UgonduCORExecutionRole'],
          existingPolicies: [
            {
              packId: samplePack.packId,
              policyArn: 'arn:aws:iam::991158927746:policy/ugondu-cor-ssm-pack',
              documentJson: usEast1DriftedDoc,
              ownedByUgondu: true,
              attachedToRoles: ['UgonduCORExecutionRole'],
            },
          ],
          bootstrapAuthority: { canCreatePolicy: true, canUpdatePolicyVersion: true, canAttachPolicy: true, authorizationMode: 'BOOTSTRAP_SESSION' },
        },
      })
    );

    expect(result.operatingState).toBe('DRIFT_DETECTED_RECONCILABLE');
    expect(result.readyForQualificationOrDeploy).toBe(true);
    expect(result.executedActions.map((a) => a.action)).toEqual(['UPDATE_POLICY_VERSION']);
    expect(result.executedActions[0].reason).toContain('us-east-1');
    expect(result.executedActions[0].reason).toContain('eu-west-3');
    expect(result.fourCheckVerification.regionConsistencyConfirmed).toBe(true);
    expect(result.fourCheckVerification.summaryText).toBe('4 of 4 checks confirmed');
  });

  it('Blocks self-escalation attempts targeting runner role and near-duplicate role collisions', () => {
    const orchestrator = new BootstrapPolicyOrchestrator();

    const selfEscalateRes = orchestrator.executeReconciliation(
      createBaseRequest({ regionScope: { ...scope, executionRoleName: 'UgonduCORRunner' } })
    );
    expect(selfEscalateRes.errorCode).toBe('UG-SELF-ESCALATION-BLOCKED');
    expect(selfEscalateRes.readyForQualificationOrDeploy).toBe(false);

    const nearDupRes = orchestrator.executeReconciliation(
      createBaseRequest({ regionScope: { ...scope, executionRoleName: 'ugondu-cor-execution-role' } })
    );
    expect(nearDupRes.errorCode).toBe('UG-ROLE-CONFLICT');
    expect(nearDupRes.readyForQualificationOrDeploy).toBe(false);
  });

  it('Enforces Stage 2 validation (signatures, wildcards, quotas) and Stage 4 effective verification', () => {
    const orchestrator = new BootstrapPolicyOrchestrator();

    const invalidSig = orchestrator.executeReconciliation(
      createBaseRequest({ desiredPacks: [{ pack: samplePack, template: sampleTemplate, signatureVerified: false }] })
    );
    expect(invalidSig.errorCode).toBe('UG-POLICY-SIGNATURE-INVALID');
    expect(invalidSig.failedStage).toBe('VALIDATE_POLICY_PACK');

    const quotaExceeded = orchestrator.executeReconciliation(
      createBaseRequest({
        environment: { ...createBaseRequest().environment, quotaLimits: { maxPolicySizeBytes: 32, maxAttachedPolicies: 10 } },
      })
    );
    expect(quotaExceeded.errorCode).toBe('UG-POLICY-QUOTA-EXCEEDED');

    const verifyFailed = orchestrator.executeReconciliation(
      createBaseRequest({ environment: { ...createBaseRequest().environment, trustRelationshipValid: false } })
    );
    expect(verifyFailed.errorCode).toBe('UG-EFFECTIVE-VERIFICATION-FAILED');
    expect(verifyFailed.failedStage).toBe('VERIFY_EFFECTIVE_RESULT');
    expect(verifyFailed.readyForQualificationOrDeploy).toBe(false);
    expect(verifyFailed.fourCheckVerification.executionRoleTrustConfirmed).toBe(false);
  });

  it('Behaves identically across all entrypoints (CLI, UI, IDE, HEADLESS_CI, AUTOMATED_WORKFLOW)', () => {
    const entrypoints: BootstrapInvocationEntrypoint[] = ['CLI', 'UI', 'IDE', 'HEADLESS_CI', 'AUTOMATED_WORKFLOW'];
    for (const entrypoint of entrypoints) {
      const orchestrator = new BootstrapPolicyOrchestrator();
      const res = orchestrator.executeReconciliation(createBaseRequest({ entrypoint }));
      expect(res.operatingState).toBe('INITIAL_INSTALLATION_AUTHORIZED');
      expect(res.readyForQualificationOrDeploy).toBe(true);
      expect(res.executedActions.map((a) => a.action)).toEqual(['CREATE_POLICY', 'ATTACH_POLICY']);
      expect(res.fourCheckVerification.summaryText).toBe('4 of 4 checks confirmed');
    }
  });
});
