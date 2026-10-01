/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core
 * File           : index.ts
 * Version        : 2.0.0
 * Author         : Server & Cryptography Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-09-30
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import express from 'express';
import cors from 'cors';
import { randomBytes, generateKeyPairSync, sign, createPrivateKey, createPublicKey, createHash, KeyObject } from 'crypto';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { __t, signServiceIdentity } from '@ugondu/shared';
import canonicalize from 'canonicalize';
import { KeyLoader, KeyState } from './crypto/key-loader';

const app = express();
const allowedOrigins = [
    'https://admin.airroofers.eu',
    'https://governance.airroofers.eu',
    'https://license.airroofers.eu'
];
app.use(cors({
    origin: function(origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            return callback(new Error('CORS policy violation'), false);
        }
        return callback(null, true);
    }
}));
app.use(express.json());

// Persistent ED25519 Keypair Management
const KEYS_DIR = process.env.KEYS_DIR || path.resolve(__dirname, '../keys');
const PRIV_KEY_PATH = path.join(KEYS_DIR, 'ed25519_private.pem');
const PUB_KEY_PATH = path.join(KEYS_DIR, 'ed25519_public.pem');
const KEY_ID_PATH = path.join(KEYS_DIR, 'key_id.txt');

function loadOrGeneratePersistentKeys(): KeyState {
    try {
        return new KeyLoader().load();
    } catch (err) {
        if (process.env.NODE_ENV === 'production') throw err;
        if (!fs.existsSync(KEYS_DIR)) fs.mkdirSync(KEYS_DIR, { recursive: true });
        const { publicKey, privateKey } = generateKeyPairSync('ed25519');
        const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
        const pubPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
        const keyId = 'key_' + createHash('sha256').update(pubPem).digest('hex').substring(0, 16);
        fs.writeFileSync(PRIV_KEY_PATH, privPem, { encoding: 'utf-8', mode: 0o600 });
        try { fs.chmodSync(PRIV_KEY_PATH, 0o600); } catch {}
        fs.writeFileSync(PUB_KEY_PATH, pubPem, { encoding: 'utf-8' });
        fs.writeFileSync(KEY_ID_PATH, keyId, { encoding: 'utf-8' });
        return { privateKey, publicKey, keyId, publicKeyPem: pubPem };
    }
}

const keyState = loadOrGeneratePersistentKeys();
const BILLING_GATEWAY_URL = process.env.BILLING_GATEWAY_URL || 'http://localhost:4002/v1';

import { globalTrustRegistry } from '@ugondu/shared';

app.get('/v1/keys', (req, res) => {
    const keys = globalTrustRegistry.getTrustRootAnchor();
    const result = Object.keys(keys).map(keyId => ({
        id: keyId,
        type: keys[keyId].algorithm,
        publicKey: keys[keyId].publicKey,
        purpose: keys[keyId].purpose,
        status: keys[keyId].status
    }));
    res.json({ keys: result });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'engine-core', cor_level: 'A' });
});

function isPluginRequired(pluginItem: any, reqBody: any): boolean {
    const pluginName = typeof pluginItem === 'string' ? pluginItem : (pluginItem?.name || '');
    if (typeof pluginItem === 'object' && pluginItem !== null) {
        if (pluginItem.required === true) return true;
        if (String(pluginItem.failurePolicy || '').toUpperCase() === 'REQUIRED') return true;
        if (String(pluginItem.policy || '').toUpperCase() === 'REQUIRED') return true;
    }
    if (Array.isArray(reqBody.requiredPlugins) && reqBody.requiredPlugins.includes(pluginName)) {
        return true;
    }
    if (reqBody.pluginPolicies && String(reqBody.pluginPolicies[pluginName] || '').toUpperCase() === 'REQUIRED') {
        return true;
    }
    if (Array.isArray(reqBody.plugins)) {
        for (const p of reqBody.plugins) {
            if (typeof p === 'object' && p !== null && p.name === pluginName) {
                if (p.required === true) return true;
                if (String(p.failurePolicy || '').toUpperCase() === 'REQUIRED') return true;
                if (String(p.policy || '').toUpperCase() === 'REQUIRED') return true;
            }
        }
    }
    return false;
}

import { passportGuardMiddleware } from './middleware/passport-guard.middleware';

app.post('/v1/deploy/resolve', passportGuardMiddleware, async (req, res): Promise<any> => {
    const { repositoryUrl, branch, fileMap, targetEnvironment, token, projectId, workspaceId, targetId, agentId, agentVersion } = req.body;
    
    if (!repositoryUrl || !branch || !targetEnvironment || !token || !projectId || !workspaceId || !targetId || !agentId || !agentVersion) {
        return res.status(400).json({ error: __t('invalid_ctx') });
    }

    try {
        const bgAuth = signServiceIdentity('engine-core', 'billing-gateway');
        const authResponse = await axios.post(`${BILLING_GATEWAY_URL}/authorize`, { token, repositoryUrl }, { headers: { Authorization: `Bearer ${bgAuth}` } }).catch(() => null);
        if (!authResponse || !authResponse.data || !authResponse.data.edition) {
            return res.status(402).json({ error: __t('blocked') });
        }

        const { edition, capabilities } = authResponse.data;

        let strategy = (targetEnvironment === 'cpanel' || targetEnvironment === 'directadmin') ? 'quota-sync' : 'atomic';
        
        if (!capabilities.allowAtomic && strategy === 'atomic') {
            console.log(__t('atomic_denied', edition));
            strategy = 'quota-sync';
        }
        
        const transactionId = `tx_${randomBytes(12).toString('hex')}`;
        const steps: any[] = [
            {
                action: 'FETCH_REPOSITORY',
                payload: { url: repositoryUrl, branch }
            }
        ];

        // Plugin Resolution with Strict Failure Policy Enforcement
        const PLUGIN_MANAGER_URL = process.env.PLUGIN_MANAGER_URL || 'http://localhost:4003/v1';
        const pmAuth = signServiceIdentity('engine-core', 'plugin-manager');
        let discoveredPlugins: any[] = [];

        try {
            const pluginsResponse = await axios.get(`${PLUGIN_MANAGER_URL}/plugins`, {
                headers: { Authorization: `Bearer ${pmAuth}` },
                timeout: 5000
            });
            if (pluginsResponse && pluginsResponse.data && Array.isArray(pluginsResponse.data.plugins)) {
                discoveredPlugins = pluginsResponse.data.plugins;
            }
        } catch (pluginFetchErr: any) {
            console.error(__t('plugin_failed'), pluginFetchErr.message || pluginFetchErr);
            if ((Array.isArray(req.body.requiredPlugins) && req.body.requiredPlugins.length > 0) ||
                (req.body.pluginPolicies && Object.values(req.body.pluginPolicies).some(pol => String(pol).toUpperCase() === 'REQUIRED'))) {
                return res.status(500).json({ error: 'REQUIRED_PLUGIN_FAILED', message: __t('required_plugin_failed', 'discovery') });
            }
        }

        // Build target plugin list
        const targetPlugins: any[] = [];
        const seenNames = new Set<string>();

        const addPlugin = (item: any) => {
            const name = typeof item === 'string' ? item : item?.name;
            if (name && !seenNames.has(name)) {
                seenNames.add(name);
                targetPlugins.push(item);
            }
        };

        if (Array.isArray(req.body.plugins) && req.body.plugins.length > 0) {
            for (const p of req.body.plugins) addPlugin(p);
        } else {
            for (const p of discoveredPlugins) addPlugin(p);
        }

        if (Array.isArray(req.body.requiredPlugins)) {
            for (const reqName of req.body.requiredPlugins) {
                if (!seenNames.has(reqName)) {
                    const found = discoveredPlugins.find(p => (typeof p === 'string' ? p : p?.name) === reqName);
                    addPlugin(found || { name: reqName, policy: 'REQUIRED' });
                }
            }
        }

        let injectedCount = 0;
        const maxPlugins = capabilities.maxPlugins === 'unlimited' ? Infinity : (capabilities.maxPlugins || 1);

        for (const pluginItem of targetPlugins) {
            const pluginName = typeof pluginItem === 'string' ? pluginItem : pluginItem.name;
            if (!pluginName) continue;

            const isRequired = isPluginRequired(pluginItem, req.body);

            if (injectedCount >= maxPlugins) {
                if (isRequired) {
                    console.error(__t('engine_plugin_limit_exceeded', pluginName, maxPlugins));
                    return res.status(500).json({ error: 'REQUIRED_PLUGIN_FAILED', message: __t('required_plugin_failed', pluginName) });
                }
                console.log(__t('max_plugins', maxPlugins, edition, pluginName));
                break;
            }

            let execResponse: any = null;
            let execFailed = false;

            try {
                execResponse = await axios.post(
                    `${PLUGIN_MANAGER_URL}/plugins/${encodeURIComponent(pluginName)}/execute`,
                    {
                        payload: {},
                        tenantId: authResponse.data.tenantId,
                        edition
                    },
                    {
                        headers: { Authorization: `Bearer ${pmAuth}` },
                        timeout: 5000
                    }
                );

                if (!execResponse || execResponse.status !== 200 || !execResponse.data || execResponse.data.error || !Array.isArray(execResponse.data.injectedSteps)) {
                    execFailed = true;
                }
            } catch (execErr: any) {
                execFailed = true;
            }

            if (execFailed) {
                if (isRequired) {
                    console.error(__t('engine_required_plugin_failed', pluginName));
                    return res.status(500).json({ error: 'REQUIRED_PLUGIN_FAILED', message: __t('required_plugin_failed', pluginName) });
                }
                console.warn(__t('engine_optional_plugin_skipped', pluginName));
                continue;
            }

            steps.push(...execResponse.data.injectedSteps);
            injectedCount++;
        }

        steps.push({
            action: 'SYNC_ENVIRONMENT',
            payload: { strategy }
        });

        if (capabilities.allowRollback) {
            steps.push({
                action: 'PRUNE_RELEASES',
                payload: { retention: 3 }
            });
        } else {
            console.log(__t('rollback_denied'));
            steps.push({
                action: 'UPSELL_NOTICE',
                payload: { message: __t('upsell_notice') }
            });
        }

        const canonicalSteps = canonicalize(steps) || '[]';
        const planHash = require('crypto').createHash('sha256').update(canonicalSteps).digest('hex');

        const nonce = randomBytes(16).toString('hex');
        const executionId = `exec_${randomBytes(12).toString('hex')}`;
        const artifactCanonical = canonicalize(fileMap || {}) || '{}';
        const artifactDigest = `sha256:${createHash('sha256').update(artifactCanonical, 'utf8').digest('hex')}`;
        const policyDocument = {
            edition,
            targetEnvironment,
            strategy,
            capabilities,
            requiredPlugins: req.body.requiredPlugins || []
        };
        const policyHash = createHash('sha256').update(canonicalize(policyDocument) || '{}', 'utf8').digest('hex');
        const declaredCapabilities = Array.isArray(capabilities.allowedActions)
            ? capabilities.allowedActions
            : [];
        const envelopeCapabilities = {
            required: Array.from(new Set(steps.map(step => step.action))),
            allowed: declaredCapabilities
        };

        const activeKey = globalTrustRegistry.getActiveKeyByPurpose('recipe');
        const signingKeyId = activeKey ? activeKey.keyId : keyState.keyId;
        const signingKey = activeKey ? globalTrustRegistry.getPrivateKeyObject(signingKeyId) : keyState.privateKey;

        const envelope = {
            protocolVersion: '1.0.0',
            issuer: 'ugondu-engine',
            keyId: signingKeyId,
            transactionId,
            tenantId: authResponse.data.tenantId,
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
            agentMinVersion: '1.0.0'
        };

        const canonicalEnvelope = canonicalize(envelope) || '{}';
        const signature = sign(null, Buffer.from(canonicalEnvelope), signingKey).toString('base64');

        return res.status(200).json({
            transactionId,
            strategy,
            steps,
            edition,
            canonicalEnvelope,
            canonicalSteps,
            signature,
            envelope: JSON.parse(canonicalEnvelope)
        });

    } catch (err: any) {
        return res.status(500).json({ error: __t('internal_err', err.message) });
    }
});

app.post('/v1/telemetry/report', (req, res) => {
    const { transactionId, status, logs } = req.body;
    if (!transactionId || !status) {
        return res.status(400).json({ error: __t('invalid_telemetry') });
    }

    console.log(__t('telemetry_rec', transactionId, status));
    return res.status(201).json({ message: __t('telemetry_saved') });
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
    console.log(__t('listening', 'Ugondu Engine Core', PORT));
});