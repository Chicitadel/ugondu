/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Engine Core — Entrypoint & Credential Independence Parity Spec
 * File           : deploy-mode-parity.spec.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-21
 * Last Modified  : 2026-10-21
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 *
 * Scope (deliberately bounded): drives the REAL deploy route handlers
 * (`/preview`, `/resolve`) and proves that their plan and allow/deny outcomes
 * do not vary with (a) the declared client identity (CLI, IDE, browser,
 * automation, headless CI) or (b) the presence of AI provider credentials.
 * It does NOT prove CLI/IDE/UI binaries reach this route; that requires
 * end-to-end tests of those entrypoints and remains an open COR item.
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { generateKeyPairSync } from 'crypto';
import type { Request, Response } from 'express';
import { createDeployRouter, DurableDeploymentLedger } from '../deploy';
import * as hardenedClient from '../../http/hardened-client';

const CLIENT_PROFILES: ReadonlyArray<Record<string, string>> = [
  { 'user-agent': 'ugondu-cli/1.0 (terminal)' },
  { 'user-agent': 'ugondu-ide-extension/1.0' },
  { 'user-agent': 'Mozilla/5.0 (browser-ui)' },
  { 'user-agent': 'ugondu-automation-runner/1.0', 'x-ugondu-client': 'automation' },
  { 'user-agent': 'ugondu-headless-ci/1.0', 'x-ugondu-client': 'headless-ci' },
];

const AI_ENV_KEYS = ['UGONDU_AI_OPENAI_API_KEY', 'UGONDU_AI_ANTHROPIC_API_KEY'] as const;

const VOLATILE_FIELDS = [
  'transactionId', 'executionId', 'nonce', 'issuedAt', 'expiresAt',
  'signature', 'canonicalEnvelope', 'lifecycleHistory',
];

function createKeyState() {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  return {
    privateKey,
    publicKey,
    keyId: 'key_test_parity_01',
    publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }) as string,
  };
}

async function invokeRoute(
  router: any,
  routePath: string,
  body: Record<string, unknown>,
  headers: Record<string, string>
): Promise<{ status: number; body: any }> {
  const layer = router.stack.find((l: any) => l.route && l.route.path === routePath);
  if (!layer) throw new Error(`Route not found: ${routePath}`);
  const normalized: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) normalized[k.toLowerCase()] = v;

  let statusCode = 200;
  let responseBody: any;
  const req = { body, headers: normalized } as unknown as Request;
  const res = {
    // Route-unit tests bypass passport middleware; model its verified request context explicitly.
    locals: { passportTenantId: 'tenant-enterprise-01' },
    status(code: number) { statusCode = code; return this; },
    json(payload: any) { responseBody = payload; return this; },
  } as unknown as Response;

  await layer.route.stack[0].handle(req, res, () => {});
  return { status: statusCode, body: responseBody };
}

function stable(body: any): string {
  const copy = { ...body };
  for (const f of VOLATILE_FIELDS) delete copy[f];
  return JSON.stringify(copy, Object.keys(copy).sort());
}

const BASE = {
  repositoryUrl: 'https://github.com/airroofers/ugondu-app.git',
  branch: 'main',
  fileMap: { 'index.ts': 'sha256:abc123' },
  targetEnvironment: 'linux',
  token: 'tok_live_123',
  projectId: 'proj_01',
  workspaceId: 'ws_01',
  targetId: 'target_linux_01',
};

describe('COR parity: deploy route outcomes are independent of client identity and AI credentials', () => {
  let ledgerPath: string;
  let ledger: DurableDeploymentLedger;
  const keyState = createKeyState();
  const savedEnv: Record<string, string | undefined> = {};

  function mockAuthorization(allowedActions: string[] | 'unavailable') {
    jest.spyOn(hardenedClient, 'hardenedPost').mockImplementation(async (url: string) => {
      if (url.endsWith('/authorize')) {
        if (allowedActions === 'unavailable') throw new Error('authorization service unavailable');
        return JSON.stringify({
          edition: 'ENTERPRISE',
          tenantId: 'tenant-enterprise-01',
          capabilities: { allowAtomic: true, allowRollback: true, maxPlugins: 5, allowedActions },
        });
      }
      return JSON.stringify({});
    });
    jest.spyOn(hardenedClient, 'hardenedGet').mockImplementation(
      async () => JSON.stringify({ plugins: [] })
    );
  }

  beforeEach(() => {
    ledgerPath = path.join(os.tmpdir(), `ugondu-parity-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
    ledger = new DurableDeploymentLedger(ledgerPath);
    for (const k of AI_ENV_KEYS) savedEnv[k] = process.env[k];
  });

  afterEach(() => {
    jest.restoreAllMocks();
    for (const k of AI_ENV_KEYS) {
      if (savedEnv[k] === undefined) delete process.env[k];
      else process.env[k] = savedEnv[k];
    }
    if (fs.existsSync(ledgerPath)) fs.unlinkSync(ledgerPath);
  });

  it('PAR-API-001: /preview is identical for every client profile', async () => {
    mockAuthorization(['FETCH_REPOSITORY', 'SYNC_ENVIRONMENT', 'PRUNE_RELEASES']);
    const router = createDeployRouter(keyState as any, 'http://localhost:4001', ledger);
    const results: string[] = [];
    for (const headers of CLIENT_PROFILES) {
      const r = await invokeRoute(router, '/preview', BASE, headers);
      expect(r.status).toBe(200);
      results.push(stable(r.body));
    }
    expect(new Set(results).size).toBe(1);
  });

  it('PAR-API-002: /resolve plan is identical for every client profile', async () => {
    mockAuthorization(['FETCH_REPOSITORY', 'SYNC_ENVIRONMENT', 'PRUNE_RELEASES']);
    const router = createDeployRouter(keyState as any, 'http://localhost:4001', ledger);
    const results: string[] = [];
    let n = 0;
    for (const headers of CLIENT_PROFILES) {
      const r = await invokeRoute(router, '/resolve', BASE, { ...headers, 'Idempotency-Key': `par-profile-${n++}` });
      expect(r.status).toBe(200);
      results.push(stable(r.body));
    }
    expect(new Set(results).size).toBe(1);
  });

  it('PAR-API-003: plan is identical with AI provider credentials absent and present', async () => {
    mockAuthorization(['FETCH_REPOSITORY', 'SYNC_ENVIRONMENT', 'PRUNE_RELEASES']);
    const router = createDeployRouter(keyState as any, 'http://localhost:4001', ledger);

    for (const k of AI_ENV_KEYS) delete process.env[k];
    const without = await invokeRoute(router, '/resolve', BASE, { 'Idempotency-Key': 'par-ai-off' });

    for (const k of AI_ENV_KEYS) process.env[k] = 'credential-present-for-parity-test';
    const withKeys = await invokeRoute(router, '/resolve', BASE, { 'Idempotency-Key': 'par-ai-on' });

    expect(without.status).toBe(200);
    expect(withKeys.status).toBe(200);
    expect(stable(without.body)).toBe(stable(withKeys.body));
  });

  it('PAR-API-004: authorization-service outage fails closed identically for every client profile', async () => {
    mockAuthorization('unavailable');
    const router = createDeployRouter(keyState as any, 'http://localhost:4001', ledger);
    const outcomes: string[] = [];
    let n = 0;
    for (const headers of CLIENT_PROFILES) {
      for (const aiOn of [false, true]) {
        for (const k of AI_ENV_KEYS) {
          if (aiOn) process.env[k] = 'credential-present-for-parity-test';
          else delete process.env[k];
        }
        const r = await invokeRoute(router, '/resolve', BASE, { ...headers, 'Idempotency-Key': `par-deny-${n++}` });
        expect(r.status).toBeGreaterThanOrEqual(400);
        expect(r.body.signature).toBeUndefined();
        outcomes.push(`${r.status}:${r.body.code ?? r.body.error ?? ''}`);
      }
    }
    expect(new Set(outcomes).size).toBe(1);
  });

  it('PAR-API-005: a denied action set yields the same decision for every client profile', async () => {
    mockAuthorization([]);
    const router = createDeployRouter(keyState as any, 'http://localhost:4001', ledger);
    const outcomes: string[] = [];
    let n = 0;
    for (const headers of CLIENT_PROFILES) {
      const r = await invokeRoute(router, '/resolve', BASE, { ...headers, 'Idempotency-Key': `par-empty-${n++}` });
      outcomes.push(`${r.status}:${stable(r.body)}`);
    }
    expect(new Set(outcomes).size).toBe(1);
  });
});
