/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Engine Core — Deploy Route
 * File           : deploy.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-02
 * Last Modified  : 2026-10-02
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
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/


import { Router, Request, Response } from 'express';
import { randomBytes, sign, createHash } from 'crypto';
import { hardenedPost, hardenedGet } from '../http/hardened-client';
import { __t, signServiceIdentity, globalTrustRegistry } from '@ugondu/shared';
import canonicalize from 'canonicalize';
import { KeyState } from '../crypto/key-loader';
import { isPluginRequired } from '../utils/plugin-policy';

// ─── Router Factory ───────────────────────────────────────────────────────────

export function createDeployRouter(keyState: KeyState, billingGatewayUrl: string): Router {
  const router = Router();

  router.post('/resolve', async (req: Request, res: Response): Promise<void> => {
    const {
      repositoryUrl, branch, fileMap, targetEnvironment,
      token, projectId, workspaceId, targetId, agentId, agentVersion,
    } = req.body as Record<string, unknown>;

    if (
      !repositoryUrl || !branch || !targetEnvironment || !token ||
      !projectId || !workspaceId || !targetId || !agentId || !agentVersion
    ) {
      res.status(400).json({ error: __t('invalid_ctx') });
      return;
    }

    try {
      const bgAuth = signServiceIdentity('engine-core', 'billing-gateway');
      const authResponseStr = await hardenedPost(
        `${billingGatewayUrl}/authorize`,
        { token, repositoryUrl },
        { headers: { Authorization: `Bearer ${bgAuth}` } },
      ).catch(() => null);

      const authResponse = authResponseStr ? { data: JSON.parse(authResponseStr) } : null;
      if (!authResponse?.data?.edition) {
        res.status(402).json({ error: __t('blocked') });
        return;
      }

      const { edition, capabilities } = authResponse.data as {
        edition: string;
        capabilities: Record<string, unknown>;
      };

      let strategy =
        targetEnvironment === 'cpanel' || targetEnvironment === 'directadmin'
          ? 'quota-sync'
          : 'atomic';

      if (!capabilities['allowAtomic'] && strategy === 'atomic') {
        console.log(__t('atomic_denied', edition));
        strategy = 'quota-sync';
      }

      const transactionId = `tx_${randomBytes(12).toString('hex')}`;
      const steps: Record<string, unknown>[] = [
        { action: 'FETCH_REPOSITORY', payload: { url: repositoryUrl, branch } },
      ];

      // Plugin Resolution with Strict Failure Policy Enforcement
      const PLUGIN_MANAGER_URL =
        process.env['PLUGIN_MANAGER_URL'] ?? 'http://localhost:4003/v1';
      const pmAuth = signServiceIdentity('engine-core', 'plugin-manager');
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
        console.error(__t('plugin_failed'), msg);
        const reqBody = req.body as Record<string, unknown>;
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

      const reqBody = req.body as Record<string, unknown>;
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
            console.error(__t('engine_plugin_limit_exceeded', pluginName, maxPlugins));
            res.status(500).json({ error: __t('ui.responses.required_plugin_failed'), message: __t('required_plugin_failed', pluginName) });
            return;
          }
          console.log(__t('max_plugins', maxPlugins, edition, pluginName));
          break;
        }

        let execResponseData: Record<string, unknown> | null = null;
        let execFailed = false;

        try {
          const execResponseStr = await hardenedPost(
            `${PLUGIN_MANAGER_URL}/plugins/${encodeURIComponent(pluginName)}/execute`,
            { payload: {}, tenantId: (authResponse.data as Record<string, unknown>)['tenantId'], edition },
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
            console.error(__t('engine_required_plugin_failed', pluginName));
            res.status(500).json({ error: __t('ui.responses.required_plugin_failed'), message: __t('required_plugin_failed', pluginName) });
            return;
          }
          console.warn(__t('engine_optional_plugin_skipped', pluginName));
          continue;
        }

        steps.push(...(execResponseData!['injectedSteps'] as Record<string, unknown>[]));
        injectedCount++;
      }

      steps.push({ action: 'SYNC_ENVIRONMENT', payload: { strategy } });

      if (capabilities['allowRollback']) {
        steps.push({ action: 'PRUNE_RELEASES', payload: { retention: 3 } });
      } else {
        console.log(__t('rollback_denied'));
        steps.push({ action: 'UPSELL_NOTICE', payload: { message: __t('upsell_notice') } });
      }

      const canonicalSteps = canonicalize(steps) ?? '[]';
      const planHash = createHash('sha256').update(canonicalSteps).digest('hex');

      const nonce = randomBytes(16).toString('hex');
      const executionId = `exec_${randomBytes(12).toString('hex')}`;
      const artifactCanonical = canonicalize(fileMap ?? {}) ?? '{}';
      const artifactDigest = `sha256:${createHash('sha256').update(artifactCanonical, 'utf8').digest('hex')}`;

      const policyDocument = {
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

      const activeKey = globalTrustRegistry.getActiveKeyByPurpose('recipe');
      const signingKeyId = activeKey ? activeKey.keyId : keyState.keyId;
      const signingKey = activeKey
        ? globalTrustRegistry.getPrivateKeyObject(signingKeyId)
        : keyState.privateKey;

      const envelope = {
        protocolVersion: '1.0.0',
        issuer: 'ugondu-engine',
        keyId: signingKeyId,
        transactionId,
        tenantId: (authResponse.data as Record<string, unknown>)['tenantId'],
        workspaceId,
        projectId,
        environmentId: targetEnvironment,
        targetId,
        agentId,
        agentVersion,
        executionId,
        nonce,
        artifactDigest,
        issuedAt: Date.now(),
        expiresAt: Date.now() + 1000 * 60 * 5,
        edition,
        planHash,
        policyHash,
        capabilities: envelopeCapabilities,
        steps,
        agentMinVersion: '1.0.0',
      };

      const canonicalEnvelope = canonicalize(envelope) ?? '{}';
      const signature = sign(null, Buffer.from(canonicalEnvelope), signingKey).toString('base64');

      res.status(200).json({
        transactionId,
        strategy,
        steps,
        edition,
        canonicalEnvelope,
        canonicalSteps,
        signature,
        envelope: JSON.parse(canonicalEnvelope),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: __t('internal_err', msg) });
    }
  });

  return router;
}
