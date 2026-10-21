/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Engine Core — Durable Deployment Ledger & Lifecycle State Machine
 * File           : deploy-ledger.ts
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-21
 * Last Modified  : 2026-10-21
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
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import * as fs from 'fs';
import * as path from 'path';
import { Request } from 'express';
import { randomBytes, sign, createHash, createPublicKey } from 'crypto';
import canonicalize from 'canonicalize';
import { signServiceIdentity, globalTrustRegistry } from '@ugondu/shared';
import { KeyState } from '../crypto/key-loader';

export type DeploymentLifecyclePhase =
  | 'DISCOVER'
  | 'CLASSIFY'
  | 'PLAN'
  | 'AUTHORIZE'
  | 'EXECUTE'
  | 'VERIFY'
  | 'CERTIFY'
  | 'FREEZE'
  | 'HANDOFF';

export const DEPLOYMENT_LIFECYCLE_PHASES: readonly DeploymentLifecyclePhase[] = [
  'DISCOVER',
  'CLASSIFY',
  'PLAN',
  'AUTHORIZE',
  'EXECUTE',
  'VERIFY',
  'CERTIFY',
  'FREEZE',
  'HANDOFF',
] as const;

export interface LifecycleTransitionRecord {
  phase: DeploymentLifecyclePhase;
  timestamp: number;
}

export class DeploymentLifecycleStateMachine {
  private currentIndex = -1;
  private readonly history: LifecycleTransitionRecord[] = [];

  public transitionTo(nextPhase: DeploymentLifecyclePhase): void {
    const targetIndex = DEPLOYMENT_LIFECYCLE_PHASES.indexOf(nextPhase);
    if (targetIndex === -1) {
      throw new Error(`INVALID_LIFECYCLE_PHASE: ${nextPhase}`);
    }
    if (targetIndex !== this.currentIndex + 1) {
      const currentName = this.currentIndex >= 0 ? DEPLOYMENT_LIFECYCLE_PHASES[this.currentIndex] : 'UNINITIALIZED';
      const expectedName = DEPLOYMENT_LIFECYCLE_PHASES[this.currentIndex + 1] ?? 'TERMINAL';
      throw new Error(
        `INVALID_LIFECYCLE_TRANSITION: Cannot transition from ${currentName} to ${nextPhase} (expected ${expectedName})`
      );
    }
    this.currentIndex = targetIndex;
    this.history.push({ phase: nextPhase, timestamp: Date.now() });
  }

  public getCurrentState(): DeploymentLifecyclePhase {
    if (this.currentIndex < 0) {
      throw new Error('LIFECYCLE_NOT_STARTED');
    }
    return DEPLOYMENT_LIFECYCLE_PHASES[this.currentIndex];
  }

  public getHistory(): LifecycleTransitionRecord[] {
    return [...this.history];
  }
}

export interface DurableIdempotencyEntry {
  idempotencyKey: string;
  payloadHash: string;
  transactionId: string;
  lifecycleState: DeploymentLifecyclePhase;
  lifecycleHistory: LifecycleTransitionRecord[];
  createdAt: string;
  responsePayload: Record<string, unknown>;
}

interface DurableLedgerDocument {
  schemaVersion: 1;
  updatedAt: string;
  idempotencyRecords: Record<string, DurableIdempotencyEntry>;
  transactions: Record<
    string,
    {
      transactionId: string;
      idempotencyKey?: string;
      payloadHash: string;
      planHash: string;
      lifecycleState: DeploymentLifecyclePhase;
      lifecycleHistory: LifecycleTransitionRecord[];
      updatedAt: string;
    }
  >;
}

export class DurableDeploymentLedger {
  private readonly ledgerPath: string;
  private memoryCache: DurableLedgerDocument;

  constructor(customLedgerPath?: string) {
    this.ledgerPath =
      customLedgerPath ||
      process.env['UGONDU_DEPLOYMENT_LEDGER_PATH'] ||
      path.resolve(__dirname, '../../../data/deployments.json');
    this.memoryCache = this.loadFromDisk();
  }

  private loadFromDisk(): DurableLedgerDocument {
    try {
      if (fs.existsSync(this.ledgerPath)) {
        const raw = fs.readFileSync(this.ledgerPath, 'utf8');
        const parsed = JSON.parse(raw) as DurableLedgerDocument;
        if (parsed && parsed.schemaVersion === 1 && parsed.idempotencyRecords && parsed.transactions) {
          return parsed;
        }
      }
    } catch {
      // Initialize fresh ledger if file does not exist or is unreadable
    }
    return {
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
      idempotencyRecords: {},
      transactions: {},
    };
  }

  private persistToDisk(): void {
    const dir = path.dirname(this.ledgerPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.memoryCache.updatedAt = new Date().toISOString();
    const tmpPath = `${this.ledgerPath}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(this.memoryCache, null, 2), 'utf8');
    fs.renameSync(tmpPath, this.ledgerPath);
  }

  public getByIdempotencyKey(key: string): DurableIdempotencyEntry | undefined {
    this.memoryCache = this.loadFromDisk();
    return this.memoryCache.idempotencyRecords[key];
  }

  public recordIdempotentResult(entry: DurableIdempotencyEntry, planHash: string): void {
    this.memoryCache = this.loadFromDisk();
    this.memoryCache.idempotencyRecords[entry.idempotencyKey] = entry;
    this.memoryCache.transactions[entry.transactionId] = {
      transactionId: entry.transactionId,
      idempotencyKey: entry.idempotencyKey,
      payloadHash: entry.payloadHash,
      planHash,
      lifecycleState: entry.lifecycleState,
      lifecycleHistory: entry.lifecycleHistory,
      updatedAt: new Date().toISOString(),
    };
    this.persistToDisk();
  }

  public recordTransaction(
    transactionId: string,
    payloadHash: string,
    planHash: string,
    lifecycleState: DeploymentLifecyclePhase,
    lifecycleHistory: LifecycleTransitionRecord[],
    idempotencyKey?: string
  ): void {
    this.memoryCache = this.loadFromDisk();
    this.memoryCache.transactions[transactionId] = {
      transactionId,
      idempotencyKey,
      payloadHash,
      planHash,
      lifecycleState,
      lifecycleHistory,
      updatedAt: new Date().toISOString(),
    };
    this.persistToDisk();
  }

  public clear(): void {
    this.memoryCache = {
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
      idempotencyRecords: {},
      transactions: {},
    };
    this.persistToDisk();
  }
}

export function computeRequestPayloadHash(body: Record<string, unknown>): string {
  const normalizedPayload = {
    repositoryUrl: body['repositoryUrl'],
    branch: body['branch'],
    fileMap: body['fileMap'] ?? {},
    targetEnvironment: body['targetEnvironment'],
    projectId: body['projectId'],
    workspaceId: body['workspaceId'],
    targetId: body['targetId'],
    plugins: body['plugins'] ?? [],
    requiredPlugins: body['requiredPlugins'] ?? [],
    pluginPolicies: body['pluginPolicies'] ?? {},
  };
  const serialized = canonicalize(normalizedPayload) ?? '{}';
  return createHash('sha256').update(serialized, 'utf8').digest('hex');
}

export function extractIdempotencyKey(req: Request): string | undefined {
  const headerKey =
    (req.headers['idempotency-key'] as string | undefined) ??
    (req.headers['x-idempotency-key'] as string | undefined);
  if (typeof headerKey === 'string' && headerKey.trim().length > 0) {
    return headerKey.trim();
  }
  const bodyKey = (req.body as Record<string, unknown> | undefined)?.['idempotencyKey'];
  if (typeof bodyKey === 'string' && bodyKey.trim().length > 0) {
    return bodyKey.trim();
  }
  return undefined;
}

export function safeSignServiceToken(source: string, target: string, keyState: KeyState): string {
  try {
    return signServiceIdentity(source, target);
  } catch {
    const payload = `${source}:${target}:${Date.now()}`;
    const sig = sign(null, Buffer.from(payload, 'utf8'), keyState.privateKey).toString('base64url');
    return `${keyState.keyId}.${sig}`;
  }
}

export function safeResolveRecipeKey(keyState: KeyState): {
  signingKeyId: string;
  signingKey: KeyState['privateKey'];
  publicKeyPem: string;
} {
  try {
    const activeKey = globalTrustRegistry.getActiveKeyByPurpose('recipe') as
      | { keyId: string; publicKeyPem?: string }
      | undefined;
    if (activeKey && activeKey.keyId) {
      const privKey = globalTrustRegistry.getPrivateKeyObject(activeKey.keyId);
      const pubPem =
        activeKey.publicKeyPem ||
        keyState.publicKeyPem ||
        (createPublicKey(privKey).export({ type: 'spki', format: 'pem' }) as string);
      return {
        signingKeyId: activeKey.keyId,
        signingKey: privKey,
        publicKeyPem: pubPem,
      };
    }
  } catch {
    // Fall back to explicit keyState passed to createDeployRouter
  }
  const pubPem =
    keyState.publicKeyPem ||
    (createPublicKey(keyState.privateKey).export({ type: 'spki', format: 'pem' }) as string);
  return {
    signingKeyId: keyState.keyId,
    signingKey: keyState.privateKey,
    publicKeyPem: pubPem,
  };
}
