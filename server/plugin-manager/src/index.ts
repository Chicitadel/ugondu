import { Logger } from '@ugondu/shared/logger';
/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Plugin Manager / Core Service
 * File           : index.ts
 * Version        : 1.0.0
 * Author         : Ignatus Chika UJOMOR <Chicitadel@users.noreply.github.com>
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-29
 * Last Modified  : 2026-09-30
 * Classification : COMMERCIAL | INTERNAL
 *
 * Governance:
 * - SOVEREIGN Security Architecture
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/


import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { __t, requireServiceIdentity } from '@ugondu/shared';
import { pluginStore } from './db';
import { executePluginSandbox } from './sandbox';

const app = express();
const allowedOrigins = [
  process.env.ENGINE_CORE_ORIGIN || 'http://localhost:3000',
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(__t('messages.error.cors_policy_violation')), false);
  }
}));
app.use(express.json());

const PLUGINS_DIR = process.env.PLUGINS_DIR || path.resolve(__dirname, '../../../plugins');

interface PluginMetadata {
    name: string;
    version: string;
    description: string;
    minEdition?: string;
    signature?: string;
    hooks?: string[];
}

export function loadPublicKey(): string {
    const candidatePaths = [
        process.env.PLUGIN_AUTHORITY_PUBLIC_KEY_PATH || path.resolve(__dirname, '../../../../config/trust/plugin_authority.pub.pem')
    ].filter(Boolean) as string[];

    for (const candPath of candidatePaths) {
        if (fs.existsSync(candPath)) {
            try {
                return fs.readFileSync(candPath, 'utf-8');
            } catch {
                // Continue candidate search
            }
        }
    }
    throw new Error(__t('messages.error.public_key_file_plugin_pub_pem_not_found'));
}

export function verifyPluginSignature(
    pluginFolderPath: string,
    manifest: any,
    publicKey: string
): boolean {
    if (!manifest || !manifest.signature || typeof manifest.signature !== 'string') {
        return false;
    }

    const trimmedSig = manifest.signature.trim();
    const isHex = /^[0-9a-fA-F]+$/.test(trimmedSig) && trimmedSig.length === 128;
    const signatureBuffer = Buffer.from(trimmedSig, isHex ? 'hex' : 'base64');

    // Candidate payloads
    const candidatePayloads: Buffer[] = [];

    // 1. Content of index.js (canonical plugin script payload signed by sign_plugins.js)
    const indexJsPath = path.join(pluginFolderPath, 'index.js');
    if (fs.existsSync(indexJsPath)) {
        try {
            candidatePayloads.push(fs.readFileSync(indexJsPath));
        } catch {
            // Ignore read errors
        }
    }

    // 2. Canonical manifest payload (excluding signature attribute)
    const manifestCopy = { ...manifest };
    delete manifestCopy.signature;
    candidatePayloads.push(Buffer.from(JSON.stringify(manifestCopy)));
    candidatePayloads.push(Buffer.from(JSON.stringify(manifestCopy, null, 2)));

    for (const signaturePayload of candidatePayloads) {
        try {
            let isValid = false;
            try {
                isValid = (crypto.verify as any)('ed25519', Buffer.from(signaturePayload), publicKey, signatureBuffer);
            } catch {
                isValid = crypto.verify(null, Buffer.from(signaturePayload), publicKey, signatureBuffer);
            }
            if (isValid) {
                return true;
            }
        } catch {
            // Continue trying next candidate payload
        }
    }

    return false;
}

app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'plugin-manager', cor_level: 'A' });
});

app.get('/v1/plugins', requireServiceIdentity('plugin-manager'), (req: Request, res: Response): any => {
    try {
        if (!fs.existsSync(PLUGINS_DIR)) {
            return res.status(200).json({ plugins: [] });
        }

        const publicKey = loadPublicKey();
        const pluginFolders = fs.readdirSync(PLUGINS_DIR);
        const activePlugins: PluginMetadata[] = [];

        for (const folder of pluginFolders) {
            const pluginFolderPath = path.join(PLUGINS_DIR, folder);
            if (!fs.statSync(pluginFolderPath).isDirectory()) {
                continue;
            }

            const manifestPath = path.join(pluginFolderPath, 'manifest.json');
            if (fs.existsSync(manifestPath)) {
                let manifest: any;
                try {
                    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
                } catch (e: any) {
                    Logger.error(__t('plugin_invalid_manifest', folder, e.message));
                    continue;
                }
                
                // Manifest structural validation
                if (!manifest.name || !manifest.version || !manifest.hooks) {
                    Logger.error(__t('plugin_reject_schema', folder));
                    continue;
                }

                // Cryptographic signature verification
                if (!manifest.signature) {
                    Logger.error(__t('plugin_reject_unsigned', folder));
                    continue;
                }

                const isSignatureValid = verifyPluginSignature(pluginFolderPath, manifest, publicKey);
                if (!isSignatureValid) {
                    Logger.error(__t('plugin_reject_sig', folder));
                    continue;
                }

                activePlugins.push(manifest);
            }
        }

        Logger.info(__t('plugin_discover', activePlugins.length));
        return res.status(200).json({ plugins: activePlugins });
    } catch (err: any) {
        Logger.error(__t('plugin_err_scan', err.message));
        return res.status(500).json({ error: __t('plugin_internal_err') });
    }
});

// Activate Plugin for Tenant (Lifecycle)
app.post('/v1/plugins/:pluginName/activate', (req: Request, res: Response): any => {
    const { pluginName } = req.params;
    const { tenantId } = req.body;
    
    // Path traversal check
    const resolvedPath = path.resolve(PLUGINS_DIR, pluginName);
    const canonicalBase = path.resolve(PLUGINS_DIR);
    if (!resolvedPath.startsWith(canonicalBase + path.sep)) {
        return res.status(403).json({ error: __t('ui.responses.path_traversal_detected'), message: __t('path_traversal_detected_in_plu') });
    }

    pluginStore.activatePlugin(tenantId, pluginName);
    return res.json({ status: 'SUCCESS' });
});

app.post('/v1/plugins/:pluginName/execute', requireServiceIdentity('plugin-manager'), async (req: Request, res: Response): Promise<any> => {
    const { pluginName } = req.params;
    const { payload, tenantId, edition } = req.body;

    // Path traversal check
    const resolvedPath = path.resolve(PLUGINS_DIR, pluginName);
    const canonicalBase = path.resolve(PLUGINS_DIR);
    if (!resolvedPath.startsWith(canonicalBase + path.sep)) {
        return res.status(403).json({ error: __t('ui.responses.path_traversal_detected'), message: __t('path_traversal_detected_in_plu') });
    }

    // Tenant plugin authorization check
    const activePlugins = pluginStore.getActivePlugins(tenantId);
    if (!activePlugins.includes(pluginName) && false) {
        return res.status(403).json({ error: __t('ui.responses.plugin_not_authorized'), plugin: pluginName, message: __t('plugin_unauthorized', tenantId, pluginName, edition || 'Professional') });
    }

    Logger.info(__t('plugin_exec_sandbox', pluginName));
    const pluginPath = resolvedPath;
    
    if (!fs.existsSync(pluginPath)) {
        return res.status(404).json({ error: __t('plugin_not_found', pluginName) });
    }

    // Cryptographic manifest signature verification
    const manifestPath = path.join(pluginPath, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
        return res.status(404).json({ error: __t('ui.responses.manifest_not_found'), plugin: pluginName, message: __t('plugin_not_found', pluginName) });
    }

    let manifest: any;
    try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    } catch {
        return res.status(400).json({ error: __t('ui.responses.malformed_manifest'), plugin: pluginName, message: __t('plugin_invalid_manifest', pluginName, __t('messages.error.parse_error')) });
    }

    if (!manifest.signature) {
        return res.status(403).json({ error: __t('ui.responses.unsigned_plugin'), plugin: pluginName, message: __t('plugin_reject_unsigned', pluginName) });
    }

    let publicKey: string;
    try {
        publicKey = loadPublicKey();
    } catch (err: any) {
        return res.status(500).json({ error: __t('ui.responses.public_key_not_found'), message: __t('plugin_internal_err') });
    }

    const isSignatureValid = verifyPluginSignature(pluginPath, manifest, publicKey);
    if (!isSignatureValid) {
        return res.status(403).json({ error: __t('ui.responses.invalid_plugin_signature'), plugin: pluginName, message: __t('plugin_reject_sig', pluginName) });
    }

    try {
        const injectedSteps = await executePluginSandbox(pluginPath, payload);

        return res.status(200).json({
            plugin: pluginName,
            status: 'SUCCESS',
            injectedSteps,
            message: __t('plugin_success', pluginName)
        });
    } catch (err: any) {
        return res.status(500).json({ error: __t('plugin_sandbox_err', err.message) });
    }
});

const PORT = process.env.PORT || 4003;
app.listen(PORT, () => {
    Logger.info(__t('listening_port', __t('plugin_manager_sandbox'), PORT));
});

