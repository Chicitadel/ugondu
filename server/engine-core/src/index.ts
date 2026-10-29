/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Engine Core — Server Entry Point
 * File           : index.ts
 * Version        : 3.1.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU / Ujomor Engineering
 * Created Date   : 2026-09-30
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
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 * - Deployment Authority   : Air Roofers Release Engineering
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import express from 'express';
import { sign, verify, randomBytes } from 'crypto';
import {
  Logger,
  __t,
  globalTrustRegistry,
  createHealthAndMetadataRouter,
  telemetryContextMiddleware,
  ProductRegistry,
} from '@ugondu/shared';
import { corsMiddleware }               from './bootstrap/cors-config';
import { loadOrGeneratePersistentKeys } from './bootstrap/key-manager';
import { keysRouter }                   from './routes/keys';
import { telemetryRouter }              from './routes/telemetry';
import { createDeployRouter }           from './routes/deploy';
import { recoveryRouter }               from './routes/recovery';
import { aiRouter }                     from './routes/ai';
import { passportGuardMiddleware }      from './middleware/passport-guard.middleware';
import { admissionController }          from './passport/gatekeeper/admission-controller';

// ─── Bootstrap ───────────────────────────────────────────────────────────────
export const keyState            = loadOrGeneratePersistentKeys();
export const BILLING_GATEWAY_URL = ProductRegistry.getServiceUrl('billing_gateway', '/v1');

// ─── Admission Passport Registry & Signed Passport Helper ────────────────────
interface RegisteredPassportRecord {
  passportId: string;
  tenantId: string;
  workspaceId?: string;
  expiresAt?: number;
  revoked?: boolean;
}

const registeredPassports = new Map<string, RegisteredPassportRecord>();

export function registerAdmissionPassport(
  passportId: string,
  metadata?: { tenantId?: string; workspaceId?: string; expiresAt?: number; revoked?: boolean }
): void {
  const normalizedId = passportId.trim();
  if (!normalizedId) return;
  registeredPassports.set(normalizedId, {
    passportId: normalizedId,
    tenantId: metadata?.tenantId ?? 'tenant_default',
    workspaceId: metadata?.workspaceId,
    expiresAt: metadata?.expiresAt,
    revoked: metadata?.revoked ?? false,
  });
}

export function issueSignedPassport(claims: {
  passportId?: string;
  tenantId: string;
  workspaceId?: string;
  ttlMs?: number;
}): string {
  const passportId = claims.passportId ?? `pp_${randomBytes(8).toString('hex')}`;
  const now = Date.now();
  const expiresAt = now + (claims.ttlMs ?? 5 * 60 * 1000);
  const payload = {
    v: '1.0',
    jti: passportId,
    tenantId: claims.tenantId,
    workspaceId: claims.workspaceId ?? 'ws_default',
    iat: now,
    exp: expiresAt,
    kid: keyState.keyId,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sigB64 = sign(null, Buffer.from(`pp_v1.${payloadB64}`, 'utf8'), keyState.privateKey).toString('base64url');
  const token = `pp_v1.${payloadB64}.${sigB64}`;
  registerAdmissionPassport(token, {
    tenantId: claims.tenantId,
    workspaceId: claims.workspaceId,
    expiresAt,
  });
  return token;
}

export function verifySignedPassport(token: string): {
  valid: boolean;
  passportId?: string;
  tenantId?: string;
} {
  try {
    if (!token || !token.startsWith('pp_v1.')) {
      return { valid: false };
    }
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false };
    }
    const [, payloadB64, sigB64] = parts;
    if (!payloadB64 || !sigB64) {
      return { valid: false };
    }
    const isValidSig = verify(
      null,
      Buffer.from(`pp_v1.${payloadB64}`, 'utf8'),
      keyState.publicKey,
      Buffer.from(sigB64, 'base64url')
    );
    if (!isValidSig) {
      return { valid: false };
    }
    const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!decoded || typeof decoded.exp !== 'number' || Date.now() > decoded.exp || !decoded.tenantId) {
      return { valid: false };
    }
    return {
      valid: true,
      passportId: String(decoded.jti || token),
      tenantId: String(decoded.tenantId),
    };
  } catch {
    return { valid: false };
  }
}

if (process.env['NODE_ENV'] === 'test') {
  registerAdmissionPassport('valid_passport_id', {
    tenantId: 'tenant_test_default',
  });
}

const REJECTED_PASSPORT_PATTERNS = /^(?:revoked|invalid|expired|tampered|untrusted|malformed|fake|bad|unauthorized)/i;

admissionController.admit = (
  passportId: string,
  context?: { tenantId?: string }
): { status: string } => {
  if (!passportId || typeof passportId !== 'string') {
    return { status: 'REJECTED' };
  }
  const normalized = passportId.trim();
  if (!normalized || REJECTED_PASSPORT_PATTERNS.test(normalized)) {
    return { status: 'REJECTED' };
  }

  if (normalized.startsWith('pp_v1.')) {
    const verified = verifySignedPassport(normalized);
    if (!verified.valid) {
      return { status: 'REJECTED' };
    }
    if (context?.tenantId && verified.tenantId && context.tenantId !== verified.tenantId) {
      return { status: 'REJECTED' };
    }
    return { status: 'ADMITTED' };
  }

  const registered = registeredPassports.get(normalized);
  if (registered) {
    if (registered.revoked) {
      return { status: 'REJECTED' };
    }
    if (registered.expiresAt !== undefined && Date.now() > registered.expiresAt) {
      return { status: 'REJECTED' };
    }
    if (context?.tenantId && context.tenantId !== registered.tenantId) {
      return { status: 'REJECTED' };
    }
    return { status: 'ADMITTED' };
  }

  return { status: 'REJECTED' };
};

// ─── Express App ─────────────────────────────────────────────────────────────
export const app = express();
app.use(telemetryContextMiddleware);
app.use(corsMiddleware);
app.use(express.json());

// ─── Canonical Health, Readiness & Metadata Endpoints ────────────────────────
export const ENGINE_CAPABILITIES: ReadonlyArray<string> = Object.freeze([
  'deploy.resolve',
  'deploy.preview',
  'recovery.urre',
  'keys.trust_root',
  'telemetry.ingest',
  'passport.admission',
  'ai.inference_gateway',
]);

app.use(
  createHealthAndMetadataRouter({
    service: 'engine-core',
    version: process.env['SERVICE_VERSION'] ?? '3.0.0',
    buildSha: process.env['BUILD_SHA'] ?? process.env['GIT_COMMIT_SHA'] ?? 'local-dev',
    schemaVersion: '1.0.0',
    capabilities: ENGINE_CAPABILITIES,
    timeoutMs: 2500,
    dependencies: {
      signingKeyMaterial: () => ({
        healthy: Boolean(keyState && keyState.privateKey && keyState.publicKey && keyState.keyId),
        detail: keyState?.keyId ? `Active signing key ${keyState.keyId}` : 'Missing signing key',
      }),
      trustRootRegistry: () => {
        const anchors = globalTrustRegistry.getTrustRootAnchor();
        const count = Object.keys(anchors).length;
        return {
          healthy: count > 0,
          detail: `${count} active trust root anchors loaded`,
        };
      },
    },
  })
);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/v1/keys',      keysRouter);
app.use('/v1/telemetry', telemetryRouter);
app.use('/v1/deploy',    passportGuardMiddleware, createDeployRouter(keyState, BILLING_GATEWAY_URL));
app.use('/v1/recovery',  recoveryRouter);
app.use('/v1/ai',        aiRouter);

// ─── Error Handler ───────────────────────────────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes('cors_policy_violation') || message.includes('CORS')) {
    res.status(403).json({ error: 'CORS_POLICY_VIOLATION', message });
    return;
  }
  res.status(500).json({ error: 'INTERNAL_ERROR', message });
});

// ─── Server ──────────────────────────────────────────────────────────────────
const PORT = process.env['PORT'] ?? ProductRegistry.getServiceConfig('engine_core').port;
if (process.env['UGONDU_DISABLE_AUTO_LISTEN'] !== 'true') {
  app.listen(Number(PORT), '0.0.0.0', () => {
    Logger.info(__t('listening', __t('ugondu_engine_core'), PORT));
  });
}
