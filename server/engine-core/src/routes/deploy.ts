/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Engine Core — Durable Deploy Route & State Machine
 * File           : deploy.ts
 * Version        : 2.1.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-02
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

import { Router, Request, Response } from 'express';
import { randomBytes, sign, createHash } from 'crypto';
import canonicalize from 'canonicalize';
import { __t, Logger, ProductRegistry } from '@ugondu/shared';
import { hardenedPost, hardenedGet } from '../http/hardened-client';
import { KeyState } from '../crypto/key-loader';
import { isPluginRequired } from '../utils/plugin-policy';
import { ExecutionLeaseManager } from '../urre/execution/lease';
import { TransactionStore } from '../urre/transaction/transaction-store';
import { TransactionDag } from '../urre/transaction/transaction-dag';
import { globalTargetAdapterRegistry } from '../targets/target-adapter-contract';
import {
  DeploymentLifecyclePhase,
  DEPLOYMENT_LIFECYCLE_PHASES,
  LifecycleTransitionRecord,
  DeploymentLifecycleStateMachine,
  DurableIdempotencyEntry,
  DurableDeploymentLedger,
  computeRequestPayloadHash,
  extractIdempotencyKey,
  safeSignServiceToken,
  safeResolveRecipeKey,
} from './deploy-ledger';
import {
  DeployBootstrapOperatingState,
  DeployEntrypointSurface,
  DeployBootstrapReconciliationSummary,
  resolveDeployEntrypoint,
  evaluateDeployBootstrapAndAiGuardrails,
} from './deploy-bootstrap-reconciler';

import { createPreviewHandler } from './deploy-preview';

export {
  DeploymentLifecyclePhase,
  DEPLOYMENT_LIFECYCLE_PHASES,
  LifecycleTransitionRecord,
  DeploymentLifecycleStateMachine,
  DurableIdempotencyEntry,
  DurableDeploymentLedger,
  DeployBootstrapOperatingState,
  DeployEntrypointSurface,
  DeployBootstrapReconciliationSummary,
  resolveDeployEntrypoint,
  evaluateDeployBootstrapAndAiGuardrails,
};

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

    if (idempotencyKey) {
      const scopedKey = `resolve:${idempotencyKey}`;
      const existing = ledger.getByIdempotencyKey(scopedKey);
      if (existing) {
        if (existing.payloadHash !== payloadHash) {
          res.status(409).json({
            error: 'IDEMPOTENCY_CONFLICT',
            code: 'IDEMPOTENCY_CONFLICT',
            message: __t('messages.error.idempotency_key_deployment_conflict'),
          });
          return;
        }
        res.status(200).json(existing.responsePayload);
        return;
      }
    }

    const stateMachine = new DeploymentLifecycleStateMachine();

    try {
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

      stateMachine.transitionTo('PLAN');
      const transactionId = `tx_${randomBytes(12).toString('hex')}`;
      const declaredCapabilities = Array.isArray(capabilities['allowedActions'])
        ? (capabilities['allowedActions'] as string[])
        : [];

      const policyReconciliation = evaluateDeployBootstrapAndAiGuardrails(
        reqBody,
        req.headers['x-ugondu-client'] as string | undefined,
        transactionId,
        targetAdapter.platform,
        declaredCapabilities
      );
      if (!policyReconciliation.readyForDeploy) {
        res.status(403).json({
          error: policyReconciliation.errorCode ?? 'POLICY_RECONCILIATION_BLOCKED',
          code: policyReconciliation.errorCode ?? 'POLICY_RECONCILIATION_BLOCKED',
          message: policyReconciliation.errorMessage,
          operatingState: policyReconciliation.operatingState,
          missingCapabilities: policyReconciliation.missingCapabilities ?? [],
          supportedAuthorizationOptions: policyReconciliation.supportedAuthorizationOptions ?? [],
          policyReconciliation,
        });
        return;
      }

      const steps: Record<string, unknown>[] = [
        { action: 'FETCH_REPOSITORY', payload: { url: repositoryUrl, branch } },
      ];

      const PLUGIN_MANAGER_URL = ProductRegistry.getServiceUrl('plugin_manager', '/v1');
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
        if (pluginsResponse?.data && Array.isArray(pluginsResponse.data.plugins)) {
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

      const targetPlugins: unknown[] = [];
      const seenNames = new Set<string>();
      const addPlugin = (item: unknown): void => {
        const name = typeof item === 'string' ? item : (item as Record<string, unknown> | null)?.['name'] as string | undefined;
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
      const rawMax = capabilities['maxPlugins'] as string | number | undefined;
      const maxPlugins = rawMax === 'unlimited' ? Infinity : (Number(rawMax) || 1);

      for (const pluginItem of targetPlugins) {
        const pluginName = typeof pluginItem === 'string' ? pluginItem : (pluginItem as Record<string, unknown>)?.['name'] as string | undefined;
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
          const parsed = execResponseStr ? { status: 200, data: JSON.parse(execResponseStr) as Record<string, unknown> } : null;
          if (!parsed || parsed.status !== 200 || !parsed.data || parsed.data['error'] || !Array.isArray(parsed.data['injectedSteps'])) {
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

      stateMachine.transitionTo('AUTHORIZE');
      const executionId = `exec_${randomBytes(12).toString('hex')}`;
      const lease = leaseManager.acquireLease(executionId, 'engine-core', 60_000, fencingCounter++);

      try {
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

        stateMachine.transitionTo('VERIFY');
        const canonicalSteps = canonicalize(steps) ?? '[]';
        const planHash = createHash('sha256').update(canonicalSteps).digest('hex');
        const nonce = randomBytes(16).toString('hex');
        const artifactCanonical = canonicalize(fileMap ?? {}) ?? '{}';
        const artifactDigest = `sha256:${createHash('sha256').update(artifactCanonical, 'utf8').digest('hex')}`;

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
        const policyHash = createHash('sha256').update(canonicalize(policyDocument) ?? '{}', 'utf8').digest('hex');
        const envelopeCapabilities = {
          required: Array.from(new Set(steps.map((step) => step['action']))),
          allowed: declaredCapabilities,
        };

        stateMachine.transitionTo('FREEZE');
        const { signingKeyId, signingKey, publicKeyPem } = safeResolveRecipeKey(keyState);
        const issuedAt = Date.now();
        const expiresAt = issuedAt + 1000 * 60 * 5;
        const recipeVersion = '1.0.0';

        stateMachine.transitionTo('HANDOFF');
        const lifecycleState = stateMachine.getCurrentState();
        const lifecycleHistory = stateMachine.getHistory();

        const repositoryDescriptor = { url: String(repositoryUrl), branch: String(branch), artifactDigest };
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
          policyReconciliation,
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

  router.post('/preview', createPreviewHandler(keyState, billingGatewayUrl, ledger));

  return router;
}
