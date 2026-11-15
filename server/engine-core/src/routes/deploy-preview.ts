/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Engine Core — Deploy Preview Handler
 * File           : deploy-preview.ts
 * Version        : 2.1.0
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

import { Request, Response } from 'express';
import { createHash } from 'crypto';
import canonicalize from 'canonicalize';
import { __t, Logger } from '@ugondu/shared';
import { hardenedPost } from '../http/hardened-client';
import { KeyState } from '../crypto/key-loader';
import { globalTargetAdapterRegistry } from '../targets/target-adapter-contract';
import {
  DeploymentLifecycleStateMachine,
  DurableDeploymentLedger,
  computeRequestPayloadHash,
  extractIdempotencyKey,
  safeSignServiceToken,
} from './deploy-ledger';
import { evaluateDeployBootstrapAndAiGuardrails } from './deploy-bootstrap-reconciler';

export function createPreviewHandler(
  keyState: KeyState,
  billingGatewayUrl: string,
  ledger: DurableDeploymentLedger
) {
  return async (req: Request, res: Response): Promise<void> => {
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
            message: __t('messages.error.idempotency_key_preview_conflict'),
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
      const discovery = await targetAdapter.discover({
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
        Logger.warn(__t('suppressed_error_in_deploy_route'), { error: String(e) });
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

      const blastRadius = Array.from(new Set([...targetPlan.blastRadius, ...activePluginNames.map((p) => `plugin:${p}`)]));
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
        policyReconciliation,
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
  };
}
