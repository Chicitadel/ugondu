/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Engine Core — Durable Deploy Route & State Machine
 * File           : deploy.ts
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-02
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
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import * as fs from 'fs';
import * as path from 'path';
import { Router, Request, Response } from 'express';
import { randomBytes, sign, createHash, createPublicKey } from 'crypto';
import canonicalize from 'canonicalize';
import { __t, Logger, signServiceIdentity, globalTrustRegistry } from '@ugondu/shared';
import { hardenedPost, hardenedGet } from '../http/hardened-client';
import { KeyState } from '../crypto/key-loader';
import { isPluginRequired } from '../utils/plugin-policy';
import { ExecutionLeaseManager } from '../urre/execution/lease';
import { TransactionStore } from '../urre/transaction/transaction-store';
import { TransactionDag } from '../urre/transaction/transaction-dag';
import { globalTargetAdapterRegistry } from '../targets/target-adapter-contract';

// ─── Canonical Deployment Lifecycle State Machine (COR-016) ───────────────────

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

// ─── Durable Deployment Ledger & Idempotency Store (COR-016) ──────────────────

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

function computeRequestPayloadHash(body: Record<string, unknown>): string {
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

function extractIdempotencyKey(req: Request): string | undefined {
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

function safeSignServiceToken(source: string, target: string, keyState: KeyState): string {
  try {
    return signServiceIdentity(source, target);
  } catch {
    const payload = `${source}:${target}:${Date.now()}`;
    const sig = sign(null, Buffer.from(payload, 'utf8'), keyState.privateKey).toString('base64url');
    return `${keyState.keyId}.${sig}`;
  }
}

function safeResolveRecipeKey(keyState: KeyState): {
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

// ─── Router Factory ───────────────────────────────────────────────────────────

export function createDeployRouter(
  keyState: KeyState,
  billingGatewayUrl: string,
  customLedger?: DurableDeploymentLedger
): Router {
  const router = Router();
  const ledger = customLedger ?? new DurableDeploymentLedger();
  const leaseManager = new ExecutionLeaseManager();
  const transactionStore = new TransactionStore();
  let fencingCounter = 1;

  router.post('/resolve', async (req: Request, res: Response): Promise<void> => {
    const reqBody = (req.body ?? {}) as Record<string, unknown>;
    const {
      repositoryUrl, branch, fileMap, targetEnvironment,
      token, projectId, workspaceId, targetId,
    } = reqBody;

    if (
      !repositoryUrl || !branch || !targetEnvironment || !token ||
      !projectId || !workspaceId || !targetId
    ) {
      res.status(400).json({ error: __t('msg_invalid_deploymentcontext_missing_requir') });
      return;
    }

    const idempotencyKey = extractIdempotencyKey(req);
    const payloadHash = computeRequestPayloadHash(reqBody);

    // Durable Idempotency Deduplication & Conflict Check
    if (idempotencyKey) {
      const scopedKey = `resolve:${idempotencyKey}`;
      const existing = ledger.getByIdempotencyKey(scopedKey);
      if (existing) {
        if (existing.payloadHash !== payloadHash) {
          res.status(409).json({
            error: 'IDEMPOTENCY_CONFLICT',
            code: 'IDEMPOTENCY_CONFLICT',
            message: 'Idempotency-Key already used with a different deployment payload.',
          });
          return;
        }
        res.status(200).json(existing.responsePayload);
        return;
      }
    }

    const stateMachine = new DeploymentLifecycleStateMachine();

    try {
      // Phase 1: DISCOVER
      stateMachine.transitionTo('DISCOVER');
      const targetAdapter = globalTargetAdapterRegistry.get(String(targetEnvironment));
      await targetAdapter.discover({
        targetId: String(targetId),
        platform: String(targetEnvironment),
        repositoryUrl: String(repositoryUrl),
        branch: String(branch),
        workspaceId: String(workspaceId),
        projectId: String(projectId),
        fileMap: (fileMap as Record<string, unknown>) ?? {},
      });

      // Phase 2: CLASSIFY
      stateMachine.transitionTo('CLASSIFY');
      const bgAuth = safeSignServiceToken('engine-core', 'billing-gateway', keyState);
      const authResponseStr = await hardenedPost(
        `${billingGatewayUrl}/authorize`,
        { token, repositoryUrl },
        { headers: { Authorization: `Bearer ${bgAuth}` } },
      ).catch((e) => {
        Logger.warn(__t('suppressed_error_in_deploy_route') + String(e));
        return null;
      });

      const authResponse = authResponseStr ? { data: JSON.parse(authResponseStr) } : null;
      if (!authResponse?.data?.edition) {
        res.status(402).json({ error: __t('msg_deployment_blocked_by_billing_gateway_li') });
        return;
      }

      const { edition, capabilities } = authResponse.data as {
        edition: string;
        capabilities: Record<string, unknown>;
      };

      const tenantId = String((authResponse.data as Record<string, unknown>)['tenantId'] ?? 'default-tenant');

      let strategy =
        targetEnvironment === 'cpanel' || targetEnvironment === 'directadmin'
          ? 'quota-sync'
          : 'atomic';

      if (!capabilities['allowAtomic'] && strategy === 'atomic') {
        Logger.info(__t('atomic_denied', edition));
        strategy = 'quota-sync';
      }

      // Phase 3: PLAN
      stateMachine.transitionTo('PLAN');
      const transactionId = `tx_${randomBytes(12).toString('hex')}`;
      const steps: Record<string, unknown>[] = [
        { action: 'FETCH_REPOSITORY', payload: { url: repositoryUrl, branch } },
      ];

      // Plugin Resolution with Strict Failure Policy Enforcement
      const PLUGIN_MANAGER_URL =
        process.env['PLUGIN_MANAGER_URL'] ?? 'http://localhost:4003/v1';
      const pmAuth = safeSignServiceToken('engine-core', 'plugin-manager', keyState);
      let discoveredPlugins: unknown[] = [];

      try {
        const pluginsResponseStr = await hardenedGet(
          `${PLUGIN_MANAGER_URL}/plugins`,
          { headers: { Authorization: `Bearer ${pmAuth}` }, timeout: 5000 },
        );
        const pluginsResponse = pluginsResponseStr
          ? { data: JSON.parse(pluginsResponseStr) }
          : null;
        if (
          pluginsResponse?.data &&
          Array.isArray(pluginsResponse.data.plugins)
        ) {
          discoveredPlugins = pluginsResponse.data.plugins as unknown[];
        }
      } catch (pluginFetchErr: unknown) {
        const msg = pluginFetchErr instanceof Error ? pluginFetchErr.message : String(pluginFetchErr);
        Logger.error(__t('plugin_failed'), msg);
        const pluginPolicies = reqBody['pluginPolicies'] as Record<string, unknown> | undefined;
        if (
          (Array.isArray(reqBody['requiredPlugins']) && (reqBody['requiredPlugins'] as unknown[]).length > 0) ||
          (pluginPolicies && Object.values(pluginPolicies).some((pol) => String(pol).toUpperCase() === 'REQUIRED'))
        ) {
          res.status(500).json({ error: __t('ui.responses.required_plugin_failed'), message: __t('required_plugin_failed', 'discovery') });
          return;
        }
      }

      // Build target plugin list
      const targetPlugins: unknown[] = [];
      const seenNames = new Set<string>();

      const addPlugin = (item: unknown): void => {
        const name =
          typeof item === 'string'
            ? item
            : (item as Record<string, unknown> | null)?.['name'] as string | undefined;
        if (name && !seenNames.has(name)) {
          seenNames.add(name);
          targetPlugins.push(item);
        }
      };

      if (Array.isArray(reqBody['plugins']) && (reqBody['plugins'] as unknown[]).length > 0) {
        for (const p of reqBody['plugins'] as unknown[]) addPlugin(p);
      } else {
        for (const p of discoveredPlugins) addPlugin(p);
      }

      if (Array.isArray(reqBody['requiredPlugins'])) {
        for (const reqName of reqBody['requiredPlugins'] as string[]) {
          if (!seenNames.has(reqName)) {
            const found = discoveredPlugins.find(
              (p) => (typeof p === 'string' ? p : (p as Record<string, unknown>)?.['name']) === reqName,
            );
            addPlugin(found ?? { name: reqName, policy: 'REQUIRED' });
          }
        }
      }

      let injectedCount = 0;
      const rawMax = (capabilities['maxPlugins'] as string | number | undefined);
      const maxPlugins = rawMax === 'unlimited' ? Infinity : (Number(rawMax) || 1);

      for (const pluginItem of targetPlugins) {
        const pluginName =
          typeof pluginItem === 'string'
            ? pluginItem
            : (pluginItem as Record<string, unknown>)?.['name'] as string | undefined;
        if (!pluginName) continue;

        const isRequired = isPluginRequired(pluginItem, reqBody);

        if (injectedCount >= maxPlugins) {
          if (isRequired) {
            Logger.error(__t('engine_plugin_limit_exceeded', pluginName, maxPlugins));
            res.status(500).json({ error: __t('ui.responses.required_plugin_failed'), message: __t('required_plugin_failed', pluginName) });
            return;
          }
          Logger.info(__t('max_plugins', maxPlugins, edition, pluginName));
          break;
        }

        let execResponseData: Record<string, unknown> | null = null;
        let execFailed = false;

        try {
          const execResponseStr = await hardenedPost(
            `${PLUGIN_MANAGER_URL}/plugins/${encodeURIComponent(pluginName)}/execute`,
            { payload: {}, tenantId, edition },
            { headers: { Authorization: `Bearer ${pmAuth}` }, timeout: 5000 },
          );
          const parsed = execResponseStr
            ? { status: 200, data: JSON.parse(execResponseStr) as Record<string, unknown> }
            : null;

          if (
            !parsed ||
            parsed.status !== 200 ||
            !parsed.data ||
            parsed.data['error'] ||
            !Array.isArray(parsed.data['injectedSteps'])
          ) {
            execFailed = true;
          } else {
            execResponseData = parsed.data;
          }
        } catch {
          execFailed = true;
        }

        if (execFailed) {
          if (isRequired) {
            Logger.error(__t('engine_required_plugin_failed', pluginName));
            res.status(500).json({ error: __t('ui.responses.required_plugin_failed'), message: __t('required_plugin_failed', pluginName) });
            return;
          }
          Logger.warn(__t('engine_optional_plugin_skipped', pluginName));
          continue;
        }

        steps.push(...(execResponseData!['injectedSteps'] as Record<string, unknown>[]));
        injectedCount++;
      }

      steps.push({ action: 'SYNC_ENVIRONMENT', payload: { strategy } });

      if (capabilities['allowRollback']) {
        steps.push({ action: 'PRUNE_RELEASES', payload: { retention: 3 } });
      } else {
        Logger.info(__t('msg_notice_rollbacks_and_release_pruning_are'));
        steps.push({ action: 'UPSELL_NOTICE', payload: { message: __t('upsell_notice') } });
      }

      // Phase 4: AUTHORIZE
      stateMachine.transitionTo('AUTHORIZE');
      const executionId = `exec_${randomBytes(12).toString('hex')}`;
      const lease = leaseManager.acquireLease(executionId, 'engine-core', 60_000, fencingCounter++);

      try {
        // Phase 5: EXECUTE (Durable DAG Persistence & Target Plan Binding)
        stateMachine.transitionTo('EXECUTE');
        const dag = new TransactionDag(transactionId);
        steps.forEach((step, idx) => {
          const actionName = String(step['action'] ?? `STEP_${idx}`);
          dag.addNode(`step_${idx}`, String(targetEnvironment), actionName, 'PROVISION');
          const node = dag.getNode(`step_${idx}`);
          if (node) {
            node.params = (step['payload'] as Record<string, unknown>) ?? {};
            node.status = 'SUCCESS';
          }
        });
        dag.status = 'SUCCESS';
        await transactionStore.save(dag);

        // Phase 6: VERIFY
        stateMachine.transitionTo('VERIFY');
        const canonicalSteps = canonicalize(steps) ?? '[]';
        const planHash = createHash('sha256').update(canonicalSteps).digest('hex');

        const nonce = randomBytes(16).toString('hex');
        const artifactCanonical = canonicalize(fileMap ?? {}) ?? '{}';
        const artifactDigest = `sha256:${createHash('sha256').update(artifactCanonical, 'utf8').digest('hex')}`;

        // Phase 7: CERTIFY
        stateMachine.transitionTo('CERTIFY');
        const policyVersion = '1.0.0';
        const policyDocument = {
          policyVersion,
          edition,
          targetEnvironment,
          strategy,
          capabilities,
          requiredPlugins: (reqBody['requiredPlugins'] as unknown[]) ?? [],
        };
        const policyHash = createHash('sha256')
          .update(canonicalize(policyDocument) ?? '{}', 'utf8')
          .digest('hex');

        const declaredCapabilities = Array.isArray(capabilities['allowedActions'])
          ? (capabilities['allowedActions'] as string[])
          : [];

        const envelopeCapabilities = {
          required: Array.from(new Set(steps.map((step) => step['action']))),
          allowed: declaredCapabilities,
        };

        // Phase 8: FREEZE
        stateMachine.transitionTo('FREEZE');
        const { signingKeyId, signingKey, publicKeyPem } = safeResolveRecipeKey(keyState);

        const issuedAt = Date.now();
        const expiresAt = issuedAt + 1000 * 60 * 5;
        const recipeVersion = '1.0.0';

        // Phase 9: HANDOFF
        stateMachine.transitionTo('HANDOFF');
        const lifecycleState = stateMachine.getCurrentState();
        const lifecycleHistory = stateMachine.getHistory();

        const repositoryDescriptor = {
          url: String(repositoryUrl),
          branch: String(branch),
          artifactDigest,
        };

        const targetDescriptor = {
          targetId: String(targetId),
          environment: String(targetEnvironment),
          platform: targetAdapter.platform,
          strategy,
        };

        const envelope = {
          recipeVersion,
          protocolVersion: '1.0.0',
          issuer: 'ugondu-engine',
          keyId: signingKeyId,
          publicKey: publicKeyPem,
          transactionId,
          tenantId,
          workspaceId,
          projectId,
          environmentId: targetEnvironment,
          targetId,
          repository: repositoryDescriptor,
          target: targetDescriptor,
          policyVersion,
          executionId,
          nonce,
          artifactDigest,
          issuedAt,
          expiresAt,
          edition,
          planHash,
          policyHash,
          lifecycleState,
          capabilities: envelopeCapabilities,
          actions: steps,
          steps,
          agentMinVersion: '1.0.0',
        };

        const canonicalEnvelope = canonicalize(envelope) ?? '{}';
        const signature = sign(null, Buffer.from(canonicalEnvelope), signingKey).toString('base64');

        const responsePayload: Record<string, unknown> = {
          recipeVersion,
          transactionId,
          tenantId,
          repository: repositoryDescriptor,
          target: targetDescriptor,
          policyVersion,
          issuedAt,
          expiresAt,
          nonce,
          planHash,
          lifecycleState,
          lifecycleHistory,
          actions: steps,
          signature,
          keyId: signingKeyId,
          publicKey: publicKeyPem,
          strategy,
          steps,
          edition,
          canonicalEnvelope,
          canonicalSteps,
          envelope: JSON.parse(canonicalEnvelope),
          recipe: {
            recipeVersion,
            transactionId,
            tenantId,
            repository: repositoryDescriptor,
            target: targetDescriptor,
            policyVersion,
            issuedAt,
            expiresAt,
            nonce,
            planHash,
            lifecycleState,
            actions: steps,
            signature,
            keyId: signingKeyId,
            publicKey: publicKeyPem,
          },
        };

        if (idempotencyKey) {
          ledger.recordIdempotentResult(
            {
              idempotencyKey: `resolve:${idempotencyKey}`,
              payloadHash,
              transactionId,
              lifecycleState,
              lifecycleHistory,
              createdAt: new Date(issuedAt).toISOString(),
              responsePayload,
            },
            planHash
          );
        } else {
          ledger.recordTransaction(transactionId, payloadHash, planHash, lifecycleState, lifecycleHistory);
        }

        res.status(200).json(responsePayload);
      } finally {
        leaseManager.releaseLease(executionId, 'engine-core', lease.leaseId);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: __t('internal_err', msg) });
    }
  });

  router.post('/preview', async (req: Request, res: Response): Promise<void> => {
    const reqBody = (req.body ?? {}) as Record<string, unknown>;
    const {
      repositoryUrl, branch, fileMap, targetEnvironment,
      token, projectId, workspaceId, targetId,
    } = reqBody;

    if (
      !repositoryUrl || !branch || !targetEnvironment || !token ||
      !projectId || !workspaceId || !targetId
    ) {
      res.status(400).json({ error: __t('msg_invalid_deploymentcontext_missing_requir') });
      return;
    }

    const idempotencyKey = extractIdempotencyKey(req);
    const payloadHash = computeRequestPayloadHash(reqBody);

    if (idempotencyKey) {
      const scopedKey = `preview:${idempotencyKey}`;
      const existing = ledger.getByIdempotencyKey(scopedKey);
      if (existing) {
        if (existing.payloadHash !== payloadHash) {
          res.status(409).json({
            error: 'IDEMPOTENCY_CONFLICT',
            code: 'IDEMPOTENCY_CONFLICT',
            message: 'Idempotency-Key already used with a different preview payload.',
          });
          return;
        }
        res.status(200).json(existing.responsePayload);
        return;
      }
    }

    const stateMachine = new DeploymentLifecycleStateMachine();

    try {
      // Phase 1: DISCOVER
      stateMachine.transitionTo('DISCOVER');
      const targetAdapter = globalTargetAdapterRegistry.get(String(targetEnvironment));
      const discovery = await targetAdapter.discover({
        targetId: String(targetId),
        platform: String(targetEnvironment),
        repositoryUrl: String(repositoryUrl),
        branch: String(branch),
        workspaceId: String(workspaceId),
        projectId: String(projectId),
        fileMap: (fileMap as Record<string, unknown>) ?? {},
      });

      // Phase 2: CLASSIFY
      stateMachine.transitionTo('CLASSIFY');
      const bgAuth = safeSignServiceToken('engine-core', 'billing-gateway', keyState);
      const authResponseStr = await hardenedPost(
        `${billingGatewayUrl}/authorize`,
        { token, repositoryUrl },
        { headers: { Authorization: `Bearer ${bgAuth}` } },
      ).catch((e) => {
        Logger.warn(__t('suppressed_error_in_deploy_route') + String(e));
        return null;
      });

      const authResponse = authResponseStr ? { data: JSON.parse(authResponseStr) } : null;
      if (!authResponse?.data?.edition) {
        res.status(402).json({ error: __t('msg_deployment_blocked_by_billing_gateway_li') });
        return;
      }

      const { edition, capabilities } = authResponse.data as {
        edition: string;
        capabilities: Record<string, unknown>;
      };

      // Phase 3: PLAN (Deterministic plan derived from repository, target adapter, and active plugins)
      stateMachine.transitionTo('PLAN');
      const requestedPlugins = Array.isArray(reqBody['plugins']) ? (reqBody['plugins'] as unknown[]) : [];
      const requiredPlugins = Array.isArray(reqBody['requiredPlugins']) ? (reqBody['requiredPlugins'] as string[]) : [];
      const activePluginNames: string[] = [];

      for (const item of [...requestedPlugins, ...requiredPlugins]) {
        const name = typeof item === 'string' ? item : (item as Record<string, unknown> | null)?.['name'] as string | undefined;
        if (name && !activePluginNames.includes(name)) {
          activePluginNames.push(name);
        }
      }

      const targetPlan = await targetAdapter.plan({
        targetId: String(targetId),
        platform: String(targetEnvironment),
        repositoryUrl: String(repositoryUrl),
        branch: String(branch),
        workspaceId: String(workspaceId),
        projectId: String(projectId),
        edition,
        capabilities,
        fileMap: (fileMap as Record<string, unknown>) ?? {},
        plugins: activePluginNames,
      });

      let strategy: string = targetPlan.strategy;
      if (targetEnvironment === 'cpanel' || targetEnvironment === 'directadmin') {
        strategy = 'quota-sync';
      } else if (!capabilities['allowAtomic'] && strategy === 'atomic') {
        strategy = 'quota-sync';
      }

      const steps: Record<string, unknown>[] = [
        { action: 'FETCH_REPOSITORY', payload: { url: repositoryUrl, branch, platform: targetAdapter.platform } },
      ];

      for (const pluginName of activePluginNames) {
        steps.push({
          action: `PLUGIN_${pluginName.toUpperCase().replace(/[^A-Z0-9_]/g, '_')}`,
          payload: { plugin: pluginName, repositoryUrl, branch, targetId },
        });
      }

      steps.push({
        action: 'SYNC_ENVIRONMENT',
        payload: { strategy, platform: targetAdapter.platform, targetId },
      });

      if (capabilities['allowRollback']) {
        steps.push({ action: 'PRUNE_RELEASES', payload: { retention: 3 } });
      }

      const resourceChanges = [
        ...targetPlan.resourceChanges,
        ...activePluginNames.map((pluginName) => ({
          type: 'UPDATE' as const,
          resource: `Plugin:${pluginName}`,
          targetId: String(targetId),
        })),
      ];

      const blastRadius = Array.from(
        new Set([
          ...targetPlan.blastRadius,
          ...activePluginNames.map((p) => `plugin:${p}`),
        ])
      );

      const rollback = [
        ...targetPlan.rollback,
        ...activePluginNames.map((pluginName) => ({
          action: 'REVERT_PLUGIN',
          resource: `Plugin:${pluginName}`,
          payload: { plugin: pluginName, targetId },
        })),
      ];

      const canonicalPlanPayload = canonicalize({
        repositoryUrl,
        branch,
        targetId,
        targetEnvironment,
        platform: targetAdapter.platform,
        strategy,
        steps,
        resourceChanges,
        fileMap: fileMap ?? {},
      }) ?? '{}';
      const planHash = createHash('sha256').update(canonicalPlanPayload, 'utf8').digest('hex');
      const transactionId = `dryrun_${planHash.slice(0, 24)}`;

      // Phase 4: AUTHORIZE
      stateMachine.transitionTo('AUTHORIZE');
      const lifecycleState = stateMachine.getCurrentState();
      const lifecycleHistory = stateMachine.getHistory();

      const responsePayload: Record<string, unknown> = {
        isPreview: true,
        transactionId,
        targetId,
        platform: targetAdapter.platform,
        osFamily: discovery.osFamily,
        strategy,
        steps,
        edition,
        planHash,
        lifecycleState,
        lifecycleHistory,
        message: __t('msg_dry_run_execution_plan_compiled_successf'),
        resourceChanges,
        risk: targetPlan.risk,
        blastRadius,
        rollback,
      };

      if (idempotencyKey) {
        ledger.recordIdempotentResult(
          {
            idempotencyKey: `preview:${idempotencyKey}`,
            payloadHash,
            transactionId,
            lifecycleState,
            lifecycleHistory,
            createdAt: new Date().toISOString(),
            responsePayload,
          },
          planHash
        );
      } else {
        ledger.recordTransaction(transactionId, payloadHash, planHash, lifecycleState, lifecycleHistory);
      }

      res.status(200).json(responsePayload);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: __t('internal_err', msg) });
    }
  });

  return router;
}
