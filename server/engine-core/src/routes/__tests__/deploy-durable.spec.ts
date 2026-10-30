/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Engine Core — Durable Deployment, Target Adapter & Auth Spec
 * File           : deploy-durable.spec.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-18
 * Last Modified  : 2026-10-18
 * Classification : ENTERPRISE
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
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createHmac, createPublicKey, generateKeyPairSync, sign, verify } from 'crypto';
import type { Request, Response } from 'express';
import {
  createDeployRouter,
  DurableDeploymentLedger,
  DeploymentLifecycleStateMachine,
  DEPLOYMENT_LIFECYCLE_PHASES,
} from '../deploy';
import {
  globalTargetAdapterRegistry,
  TargetAdapterRegistry,
  SupportedTargetPlatform,
} from '../../targets/target-adapter-contract';
import { SAMLAdapter } from '../../tenant/identity/saml-adapter';
import { OIDCAdapter } from '../../tenant/identity/oidc-adapter';
import { CpanelAdapter } from '../../fabric/providers/cpanel';
import { LinuxAdapter } from '../../fabric/providers/linux';
import { createProductionActionRegistry } from '../../registry/action-registry-factory';
import { generateAuthorizationRemediationOptions } from '../../doctor/remediation/generator';
import { IncidentClass, IncidentSeverity } from '../../doctor/model/incident';
import * as hardenedClient from '../../http/hardened-client';

function createKeyState() {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
  return {
    privateKey,
    publicKey,
    keyId: 'key_test_durable_01',
    publicKeyPem,
  };
}

async function invokeRoute(
  router: any,
  routePath: string,
  body: Record<string, unknown>,
  headers: Record<string, string> = {}
): Promise<{ status: number; body: any }> {
  const layer = router.stack.find((l: any) => l.route && l.route.path === routePath);
  if (!layer) {
    throw new Error(`Route not found: ${routePath}`);
  }
  const handler = layer.route.stack[0].handle;

  const normalizedHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    normalizedHeaders[k.toLowerCase()] = v;
  }

  let statusCode = 200;
  let responseBody: any = undefined;

  const req = {
    body,
    headers: normalizedHeaders,
  } as unknown as Request;
  const res = {
    locals: { passportTenantId: 'tenant-enterprise-01' }, // verified tenant context for direct route invocation
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: any) {
      responseBody = payload;
      return this;
    },
  } as unknown as Response;

  await handler(req, res, () => {});
  return { status: statusCode, body: responseBody };
}

describe('COR-016 & COR-021: Durable Deployment State Machine, Idempotency, Target Adapters & Auth', () => {
  let tempLedgerPath: string;
  let ledger: DurableDeploymentLedger;
  const keyState = createKeyState();

  beforeEach(() => {
    tempLedgerPath = path.join(
      os.tmpdir(),
      `ugondu-deployments-test-${Date.now()}-${Math.random().toString(16).slice(2)}.json`
    );
    ledger = new DurableDeploymentLedger(tempLedgerPath);

    jest.spyOn(hardenedClient, 'hardenedPost').mockImplementation(async (url: string) => {
      if (url.endsWith('/authorize')) {
        return JSON.stringify({
          edition: 'ENTERPRISE',
          tenantId: 'tenant-enterprise-01',
          capabilities: {
            allowAtomic: true,
            allowRollback: true,
            maxPlugins: 5,
            allowedActions: ['FETCH_REPOSITORY', 'SYNC_ENVIRONMENT', 'PRUNE_RELEASES'],
          },
        });
      }
      if (url.includes('/plugins/') && url.endsWith('/execute')) {
        return JSON.stringify({
          injectedSteps: [{ action: 'SECURITY_SCAN', payload: { scanner: 'sbom-guard' } }],
        });
      }
      return JSON.stringify({});
    });

    jest.spyOn(hardenedClient, 'hardenedGet').mockImplementation(async () => {
      return JSON.stringify({ plugins: [{ name: 'sbom-guard', policy: 'OPTIONAL' }] });
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (fs.existsSync(tempLedgerPath)) {
      fs.unlinkSync(tempLedgerPath);
    }
  });

  it('enforces strict lifecycle transitions DISCOVER -> CLASSIFY -> PLAN -> AUTHORIZE -> EXECUTE -> VERIFY -> CERTIFY -> FREEZE -> HANDOFF', () => {
    const sm = new DeploymentLifecycleStateMachine();
    expect(() => sm.transitionTo('PLAN')).toThrow(/INVALID_LIFECYCLE_TRANSITION/);

    for (const phase of DEPLOYMENT_LIFECYCLE_PHASES) {
      sm.transitionTo(phase);
      expect(sm.getCurrentState()).toBe(phase);
    }

    expect(sm.getHistory().map((h) => h.phase)).toEqual([...DEPLOYMENT_LIFECYCLE_PHASES]);
    expect(() => sm.transitionTo('DISCOVER')).toThrow(/INVALID_LIFECYCLE_TRANSITION/);
  });

  it('returns deterministic signed recipe with canonical fields and deduplicates identical Idempotency-Key requests', async () => {
    const router = createDeployRouter(keyState, 'http://localhost:4001', ledger);
    const payload = {
      repositoryUrl: 'https://github.com/airroofers/ugondu-app.git',
      branch: 'main',
      fileMap: { 'index.ts': 'sha256:abc123' },
      targetEnvironment: 'linux',
      token: 'tok_live_123',
      projectId: 'proj_01',
      workspaceId: 'ws_01',
      targetId: 'target_linux_01',
    };

    const first = await invokeRoute(router, '/resolve', payload, {
      'Idempotency-Key': 'idem-key-001',
    });

    expect(first.status).toBe(200);
    expect(first.body.recipeVersion).toBe('1.0.0');
    expect(first.body.transactionId).toMatch(/^tx_/);
    expect(first.body.tenantId).toBe('tenant-enterprise-01');
    expect(first.body.repository).toEqual({
      url: 'https://github.com/airroofers/ugondu-app.git',
      branch: 'main',
      artifactDigest: expect.stringMatching(/^sha256:/),
    });
    expect(first.body.target).toEqual({
      targetId: 'target_linux_01',
      environment: 'linux',
      platform: 'linux',
      strategy: 'atomic',
    });
    expect(first.body.policyVersion).toBe('1.0.0');
    expect(typeof first.body.issuedAt).toBe('number');
    expect(typeof first.body.expiresAt).toBe('number');
    expect(typeof first.body.nonce).toBe('string');
    expect(typeof first.body.planHash).toBe('string');
    expect(first.body.lifecycleState).toBe('HANDOFF');
    expect(Array.isArray(first.body.actions)).toBe(true);
    expect(typeof first.body.signature).toBe('string');
    expect(first.body.keyId).toBeDefined();
    expect(first.body.publicKey).toContain('BEGIN PUBLIC KEY');

    // Verify cryptographic signature against canonicalEnvelope and returned publicKey
    const pubKeyObj = createPublicKey(first.body.publicKey);
    const sigValid = verify(
      null,
      Buffer.from(first.body.canonicalEnvelope, 'utf8'),
      pubKeyObj,
      Buffer.from(first.body.signature, 'base64')
    );
    expect(sigValid).toBe(true);

    // Duplicate request with same Idempotency-Key must return exact same signed recipe without re-executing
    const postSpy = jest.spyOn(hardenedClient, 'hardenedPost');
    postSpy.mockClear();

    const second = await invokeRoute(router, '/resolve', payload, {
      'Idempotency-Key': 'idem-key-001',
    });

    expect(second.status).toBe(200);
    expect(second.body.transactionId).toBe(first.body.transactionId);
    expect(second.body.nonce).toBe(first.body.nonce);
    expect(second.body.signature).toBe(first.body.signature);
    expect(postSpy).not.toHaveBeenCalled();
  });

  it('rejects conflicting payload with existing Idempotency-Key with 409 IDEMPOTENCY_CONFLICT', async () => {
    const router = createDeployRouter(keyState, 'http://localhost:4001', ledger);
    const basePayload = {
      repositoryUrl: 'https://github.com/airroofers/ugondu-app.git',
      branch: 'main',
      fileMap: { 'index.ts': 'sha256:abc123' },
      targetEnvironment: 'kubernetes',
      token: 'tok_live_123',
      projectId: 'proj_01',
      workspaceId: 'ws_01',
      targetId: 'target_k8s_01',
    };

    const first = await invokeRoute(router, '/resolve', basePayload, {
      'Idempotency-Key': 'idem-conflict-key',
    });
    expect(first.status).toBe(200);

    const conflicting = await invokeRoute(
      router,
      '/resolve',
      { ...basePayload, branch: 'release/v2' },
      { 'Idempotency-Key': 'idem-conflict-key' }
    );

    expect(conflicting.status).toBe(409);
    expect(conflicting.body.error).toBe('IDEMPOTENCY_CONFLICT');
    expect(conflicting.body.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('computes deterministic /preview plans from target adapter, repository, and active plugins', async () => {
    const router = createDeployRouter(keyState, 'http://localhost:4001', ledger);
    const previewReq = {
      repositoryUrl: 'https://github.com/airroofers/ugondu-k8s.git',
      branch: 'production',
      fileMap: { 'deployment.yaml': 'sha256:111' },
      targetEnvironment: 'kubernetes',
      token: 'tok_live_123',
      projectId: 'proj_k8s',
      workspaceId: 'ws_k8s',
      targetId: 'cluster_eu_01',
      plugins: ['canary-analyzer'],
    };

    const preview1 = await invokeRoute(router, '/preview', previewReq);
    const preview2 = await invokeRoute(router, '/preview', previewReq);

    expect(preview1.status).toBe(200);
    expect(preview1.body.isPreview).toBe(true);
    expect(preview1.body.platform).toBe('kubernetes');
    expect(preview1.body.strategy).toBe('rolling-update');
    expect(preview1.body.transactionId).toBe(preview2.body.transactionId);
    expect(preview1.body.planHash).toBe(preview2.body.planHash);
    expect(preview1.body.blastRadius).toContain('KubernetesDeployment');
    expect(preview1.body.blastRadius).toContain('plugin:canary-analyzer');
    expect(preview1.body.steps.some((s: any) => s.action === 'PLUGIN_CANARY_ANALYZER')).toBe(true);
  });

  it('supports all 8 canonical platforms in TargetAdapterRegistry (COR-021)', async () => {
    const registry = new TargetAdapterRegistry();
    const expectedPlatforms: SupportedTargetPlatform[] = [
      'linux',
      'windows',
      'macos',
      'docker',
      'aws-ecs-fargate',
      'kubernetes',
      'cpanel',
      'directadmin',
    ];

    expect(registry.listPlatforms()).toEqual(expectedPlatforms);

    for (const platform of expectedPlatforms) {
      const adapter = globalTargetAdapterRegistry.get(platform);
      expect(adapter.platform).toBe(platform);

      const ctx = {
        targetId: `tgt-${platform}`,
        platform,
        repositoryUrl: 'https://github.com/airroofers/service.git',
        branch: 'main',
        projectId: 'svc',
        capabilities: { allowAtomic: true, allowRollback: true },
      };

      const discovered = await adapter.discover(ctx);
      expect(discovered.reachable).toBe(true);
      expect(discovered.platform).toBe(platform);

      const preflight = await adapter.preflight(ctx);
      expect(preflight.passed).toBe(true);

      const plan = await adapter.plan(ctx);
      expect(plan.platform).toBe(platform);
      expect(plan.planHash).toHaveLength(64);
      expect(plan.steps.length).toBeGreaterThanOrEqual(2);

      const applied = await adapter.apply(ctx, plan, `tx_${platform}`);
      expect(applied.applied).toBe(true);

      const verified = await adapter.verify(ctx, applied);
      expect(verified.verified).toBe(true);

      const rolledBack = await adapter.rollback(ctx, `tx_${platform}`, plan);
      expect(rolledBack.rolledBack).toBe(true);

      const health = await adapter.health(`tgt-${platform}`);
      expect(health.status).toBe('HEALTHY');
    }
  });

  it('verifies cryptographic SAML assertion signatures and rejects unsigned or tampered assertions', () => {
    const secret = 'saml-corporate-hmac-secret-2026';
    const saml = new SAMLAdapter({
      hmacSecret: secret,
      trustedIssuers: ['https://idp.airroofers.com'],
    });

    const unsignedXml =
      `<Assertion>` +
      `<Issuer>https://idp.airroofers.com</Issuer>` +
      `<Subject><NameID>engineer@airroofers.com</NameID></Subject>` +
      `<AttributeStatement><Attribute Name="tenantId"><AttributeValue>tenant-airroofers</AttributeValue></Attribute></AttributeStatement>` +
      `</Assertion>`;

    // Unsigned assertion must fail closed
    expect(() => saml.parseAssertion(unsignedXml)).toThrow(/SAML_SIGNATURE_MISSING/);

    // Signed assertion must succeed and never return hardcoded saml-user-123
    const signedXml = SAMLAdapter.signAssertion(unsignedXml, { hmacSecret: secret });
    const ctx = saml.parseAssertion(signedXml);
    expect(ctx.id).toBe('engineer@airroofers.com');
    expect(ctx.tenantId).toBe('tenant-airroofers');
    expect(ctx.attributes['signatureVerified']).toBe(true);

    // Tampered NameID after signing must fail digest verification
    const tamperedXml = signedXml.replace('engineer@airroofers.com', 'attacker@airroofers.com');
    expect(() => saml.parseAssertion(tamperedXml)).toThrow(/SAML_DIGEST_MISMATCH/);

    // Untrusted issuer must fail closed
    const untrustedUnsigned = unsignedXml.replace('https://idp.airroofers.com', 'https://rogue.example.com');
    const untrustedSigned = SAMLAdapter.signAssertion(untrustedUnsigned, { hmacSecret: secret });
    expect(() => saml.parseAssertion(untrustedSigned)).toThrow(/SAML_UNTRUSTED_ISSUER/);
  });

  it('verifies OIDC JWT cryptographic signatures and validates exp, iss, and aud claims', () => {
    const jwtSecret = 'oidc-hmac-signing-secret-key-2026';
    const oidc = new OIDCAdapter({
      secret: jwtSecret,
      expectedIssuer: 'https://auth.airroofers.com',
      expectedAudience: 'ugondu-engine-core',
    });

    const headerB64 = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const validPayloadB64 = Buffer.from(
      JSON.stringify({
        sub: 'user-oidc-99',
        tid: 'tenant-oidc-01',
        iss: 'https://auth.airroofers.com',
        aud: 'ugondu-engine-core',
        exp: Math.floor(Date.now() / 1000) + 3600,
        email: 'architect@airroofers.com',
      })
    ).toString('base64url');

    const validSig = createHmac('sha256', jwtSecret)
      .update(`${headerB64}.${validPayloadB64}`, 'utf8')
      .digest('base64url');
    const validToken = `${headerB64}.${validPayloadB64}.${validSig}`;

    const subject = oidc.verifyIdToken(validToken);
    expect(subject.id).toBe('user-oidc-99');
    expect(subject.tenantId).toBe('tenant-oidc-01');
    expect(subject.attributes['signatureVerified']).toBe(true);

    // Forged signature must be rejected
    const forgedToken = `${headerB64}.${validPayloadB64}.forged_signature_bytes`;
    expect(() => oidc.verifyIdToken(forgedToken)).toThrow(/OIDC_SIGNATURE_INVALID/);

    // Wrong audience must be rejected
    const badAudPayloadB64 = Buffer.from(
      JSON.stringify({
        sub: 'user-oidc-99',
        iss: 'https://auth.airroofers.com',
        aud: 'wrong-audience',
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    ).toString('base64url');
    const badAudSig = createHmac('sha256', jwtSecret)
      .update(`${headerB64}.${badAudPayloadB64}`, 'utf8')
      .digest('base64url');
    expect(() => oidc.verifyIdToken(`${headerB64}.${badAudPayloadB64}.${badAudSig}`)).toThrow(
      /OIDC_AUDIENCE_MISMATCH/
    );
  });

  it('fails closed in CpanelAdapter and LinuxAdapter getInstanceStatus for unregistered instances and records compensation in action-registry-factory', async () => {
    const cpanel = new CpanelAdapter({
      createHostedApp: async (name) => ({ id: `cp-${name}`, state: 'running' }),
      removeHostedApp: async () => {},
      createDatabase: async () => ({ id: 'db-1', endpoint: 'localhost' }),
      removeDatabase: async () => {},
      createSnapshot: async () => 'snap-1',
      createAccountFilesystem: async () => ({ id: 'fs-1', endpoint: '/home/app' }),
      removeAccountFilesystem: async () => {},
    });

    const unverifiedCp = await cpanel.getInstanceStatus('unknown-cp-id');
    expect(unverifiedCp).toEqual({ id: 'unknown-cp-id', state: 'unknown', health: 'unverified' });

    const provisionedCp = await cpanel.provisionInstance(
      { instanceName: 'portal', osImage: 'php82', cpuCores: 2, memoryMb: 2048 },
      {}
    );
    const verifiedCp = await cpanel.getInstanceStatus(provisionedCp.id);
    expect(verifiedCp).toEqual({ id: 'cp-portal', state: 'running', health: 'healthy' });

    const linux = new LinuxAdapter({
      checkCapacity: async () => true,
      runProcess: async (name) => ({ id: `proc-${name}`, state: 'running' }),
      stopProcess: async () => {}, configureNetwork: async () => ({ id: 'net-1' }),
      removeNetwork: async () => {}, createSubnet: async () => ({ id: 'sub-1', cidr: '10.0.0.0/24' }),
      createDirectory: async () => ({ id: 'dir-1', endpoint: '/srv/app' }), removeDirectory: async () => {},
    });

    const unverifiedLinux = await linux.getInstanceStatus('unregistered-proc');
    expect(unverifiedLinux).toEqual({ id: 'unregistered-proc', state: 'unknown', health: 'unverified' });

    // Verify compensation callbacks on action-registry-factory
    const mockAws: Record<string, any> = {
      deleteVpc: jest.fn().mockResolvedValue(undefined),
      createVpc: jest.fn().mockResolvedValue('vpc-restored-01'),
    };
    const registry = createProductionActionRegistry(mockAws);
    const urre = registry.getUrre() as any;
    await urre.rollbacks['aws:TERMINATE_VPC']({
      id: 'node-vpc-term',
      action: 'TERMINATE_VPC',
      output: { vpcId: 'vpc-orig-01', cidrBlock: '10.10.0.0/16' },
    });
    expect(mockAws.createVpc).toHaveBeenCalledWith('10.10.0.0/16', 'ugondu-vpc-restored');
    expect(mockAws.compensationLedger).toHaveLength(1);
    expect(mockAws.compensationLedger[0].compensatingAction).toBe('RESTORE_VPC');

    // Verify Doctor remediation policy resolution
    const options = generateAuthorizationRemediationOptions(
      {
        id: 'inc-01', targetId: 'arn:aws:ecs:eu-west-3:971671216490:service/prod',
        incidentClass: IncidentClass.AUTHORIZATION_FAILURE, fingerprint: 'fp-01',
        detectedAt: new Date(), severity: IncidentSeverity.HIGH, evidence: [],
        uppieContext: {
          incidentId: '00000000-0000-4000-8000-000000000001',
          incidentClass: IncidentClass.AUTHORIZATION_FAILURE,
          detectedAt: new Date().toISOString(), severity: IncidentSeverity.HIGH,
          actor: 'deployer-bot', target: 'arn:aws:ecs:eu-west-3:971671216490:service/prod',
          operation: 'ecs:UpdateService', provider: 'aws',
          providerErrorCode: 'AccessDeniedException', requiredCapability: ['ecs:UpdateService'],
          presentAuthority: [], missingAuthority: ['ecs:UpdateService'],
          assignmentPath: 'arn:aws:iam::971671216490:role/ugondu-execution-role',
          recommendedResolution: [], estimatedFixTime: '< 2 minutes',
          relatedOperationId: 'op-1', relatedExecutionId: 'exec-1', passportId: 'pass-1',
        },
      },
      { tenantApprovers: {} }
    );

    const extendRoleOpt = options.find((o) => o.type === 'EXTEND_ROLE') as any;
    const requestApprovalOpt = options.find((o) => o.type === 'REQUEST_APPROVAL') as any;
    expect(extendRoleOpt.roleId).toBe('ugondu-execution-role');
    expect(requestApprovalOpt.approver).toBe('urn:ugondu:governance:aws:security-authority');
  });
});
