/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Plugin Manager / Core Service
 * File           : index.ts
 * Version        : 1.1.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-29
 * Last Modified  : 2026-10-18
 * Classification : COMMERCIAL | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
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

import './preload';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
    __t,
    verifyServiceIdentityToken,
    ALLOWED_SERVICE_ISSUERS,
    globalTrustRegistry,
    Logger,
    ProductRegistry
} from '@ugondu/shared';
import { pluginStore, PluginExecutionReceipt } from './db';
import { executePluginSandbox } from './sandbox';

(globalThis as any).__t = __t;

const SERVICE_NAME = 'plugin-manager';
const SERVICE_VERSION = '1.1.0';

export function resolveValidatedCorsOrigins(): Set<string> {
    const rawOrigins = [
        process.env.ENGINE_CORE_ORIGIN,
        ...(process.env.ALLOWED_CORS_ORIGINS ? process.env.ALLOWED_CORS_ORIGINS.split(',') : [])
    ]
        .map(o => (o ? o.trim() : ''))
        .filter(Boolean);

    const validated = new Set<string>();
    for (const candidate of rawOrigins) {
        try {
            const parsed = new URL(candidate);
            if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
                validated.add(parsed.origin);
            }
        } catch {
            // Ignore malformed origin entry
        }
    }
    return validated;
}

export function requireServiceIdentity(expectedAudience: string = SERVICE_NAME, requiredScope?: string) {
    return (req: Request, res: Response, next: NextFunction): any => {
        const rawHeader = req.headers.authorization || (req.headers['x-service-identity'] as string | undefined);
        if (!rawHeader || typeof rawHeader !== 'string') {
            return res.status(401).json({
                error: 'MISSING_SERVICE_TOKEN',
                message: __t('auth_service_token_missing')
            });
        }

        let token = rawHeader.trim();
        const localizedBearer = __t('bearer');
        if (token.toLowerCase().startsWith('bearer ')) {
            token = token.slice(7).trim();
        } else if (localizedBearer && token.startsWith(localizedBearer)) {
            token = token.slice(localizedBearer.length).trim();
        } else if (req.headers.authorization) {
            return res.status(401).json({
                error: 'MISSING_SERVICE_TOKEN',
                message: __t('auth_service_token_missing')
            });
        }

        const verification = verifyServiceIdentityToken(token, expectedAudience, requiredScope);
        if (!verification.valid || !verification.payload) {
            return res.status(verification.status || 401).json({
                error: verification.error || 'INVALID_SERVICE_TOKEN',
                message: __t(`auth_service_${String(verification.error || 'malformed').toLowerCase()}`)
            });
        }

        if (!ALLOWED_SERVICE_ISSUERS.has(verification.payload.iss)) {
            return res.status(403).json({
                error: 'ISSUER_NOT_ALLOWED',
                message: __t('ui.responses.issuer_not_allowed')
            });
        }

        (req as any).serviceIdentity = verification.payload;
        return next();
    };
}

export const app = express();

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const allowedOrigins = resolveValidatedCorsOrigins();
        if (allowedOrigins.has(origin)) return callback(null, true);
        return callback(new Error(__t('messages.error.cors_policy_violation')), false);
    }
}));
app.use(express.json());

export function getPluginsDirectory(): string {
    return process.env.PLUGINS_DIR || path.resolve(__dirname, '../../../plugins');
}

interface PluginMetadata {
    name: string;
    version: string;
    description: string;
    minEdition?: string;
    signature?: string;
    hooks?: string[];
    capabilities?: string[];
    signerKeyId?: string;
}

export function loadPublicKey(): string {
    const candidatePaths = [
        process.env.PLUGIN_AUTHORITY_PUBLIC_KEY_PATH,
        path.resolve(__dirname, '../plugin_pub.pem'),
        path.resolve(__dirname, '../../shared/keys/plugin_public.pem'),
        path.resolve(__dirname, '../../../config/trust/plugin_authority.pub.pem'),
        path.resolve(__dirname, '../../../../config/trust/plugin_authority.pub.pem')
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

    const activePluginKey = globalTrustRegistry.getActiveKeyByPurpose('plugin');
    if (activePluginKey?.publicKey) {
        return activePluginKey.publicKey;
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
    if (signatureBuffer.length !== 64) {
        return false;
    }

    const candidatePayloads: Buffer[] = [];

    // 1. Content of index.js (canonical plugin script payload)
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
            const isValid = crypto.verify(null, Buffer.from(signaturePayload), publicKey, signatureBuffer);
            if (isValid) {
                return true;
            }
        } catch {
            // Continue trying next candidate payload
        }
    }

    return false;
}

export function createExecutionReceipt(
    pluginFolderPath: string,
    manifest: any,
    tenantId: string,
    injectedSteps: any[]
): PluginExecutionReceipt {
    const indexJsPath = path.join(pluginFolderPath, 'index.js');
    const manifestPath = path.join(pluginFolderPath, 'manifest.json');
    const digestHash = crypto.createHash('sha256');
    if (fs.existsSync(indexJsPath)) {
        digestHash.update(fs.readFileSync(indexJsPath));
    }
    if (fs.existsSync(manifestPath)) {
        digestHash.update(fs.readFileSync(manifestPath));
    }
    const pluginDigest = `sha256:${digestHash.digest('hex')}`;
    const signerKeyId = String(
        manifest.signerKeyId ||
        globalTrustRegistry.getActiveKeyByPurpose('plugin')?.keyId ||
        'key_plugin_v2'
    );
    const version = String(manifest.version || '1.0.0');
    const capabilities: string[] = Array.isArray(manifest.capabilities)
        ? manifest.capabilities.map(String)
        : Array.isArray(manifest.hooks)
        ? manifest.hooks.map(String)
        : [];
    const executedAt = new Date().toISOString();

    const receiptPayload = JSON.stringify({
        pluginName: manifest.name,
        pluginDigest,
        signerKeyId,
        version,
        capabilities,
        tenantId,
        executedAt,
        injectedSteps
    });
    const receiptHash = `sha256:${crypto.createHash('sha256').update(receiptPayload).digest('hex')}`;

    return {
        pluginName: String(manifest.name),
        pluginDigest,
        signerKeyId,
        version,
        capabilities,
        tenantId: String(tenantId),
        executedAt,
        receiptHash
    };
}

function isSafePluginSubpath(pluginsBaseDir: string, pluginName: string): { safe: boolean; resolvedPath: string } {
    if (!pluginName || typeof pluginName !== 'string' || pluginName.includes('\0')) {
        return { safe: false, resolvedPath: '' };
    }
    if (pluginName.includes('..') || pluginName.includes('/') || pluginName.includes('\\')) {
        return { safe: false, resolvedPath: '' };
    }
    const canonicalBase = path.resolve(pluginsBaseDir);
    const resolvedPath = path.resolve(canonicalBase, pluginName);
    if (!resolvedPath.startsWith(canonicalBase + path.sep)) {
        return { safe: false, resolvedPath };
    }
    return { safe: true, resolvedPath };
}

app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
        status: 'ok',
        service: SERVICE_NAME,
        version: SERVICE_VERSION,
        timestamp: new Date().toISOString()
    });
});

app.get('/health/live', (_req: Request, res: Response) => {
    res.status(200).json({
        status: 'alive',
        service: SERVICE_NAME,
        timestamp: new Date().toISOString()
    });
});

app.get('/health/ready', (_req: Request, res: Response) => {
    const pluginsDir = getPluginsDirectory();
    let keyAvailable = false;
    try {
        keyAvailable = Boolean(loadPublicKey());
    } catch {
        keyAvailable = false;
    }
    const ready = fs.existsSync(pluginsDir) && keyAvailable;
    res.status(ready ? 200 : 503).json({
        status: ready ? 'ready' : 'not_ready',
        service: SERVICE_NAME,
        pluginsDirAvailable: fs.existsSync(pluginsDir),
        signingKeyAvailable: keyAvailable,
        timestamp: new Date().toISOString()
    });
});

app.get('/v1/metadata', (_req: Request, res: Response) => {
    res.status(200).json({
        service: SERVICE_NAME,
        version: SERVICE_VERSION,
        apiVersion: 'v1',
        capabilities: [
            'plugin-discovery',
            'tenant-activation',
            'sandbox-execution',
            'signature-verification',
            'execution-receipts'
        ]
    });
});

app.get('/v1/plugins', requireServiceIdentity(SERVICE_NAME), (_req: Request, res: Response): any => {
    try {
        const pluginsDir = getPluginsDirectory();
        if (!fs.existsSync(pluginsDir)) {
            return res.status(200).json({ plugins: [] });
        }

        const publicKey = loadPublicKey();
        const pluginFolders = fs.readdirSync(pluginsDir);
        const activePlugins: PluginMetadata[] = [];

        for (const folder of pluginFolders) {
            const pluginFolderPath = path.join(pluginsDir, folder);
            let stat: fs.Stats;
            try {
                stat = fs.lstatSync(pluginFolderPath);
            } catch {
                continue;
            }
            if (stat.isSymbolicLink() || !stat.isDirectory()) {
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
                if (!manifest.name || !manifest.version || !Array.isArray(manifest.hooks)) {
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
app.post('/v1/plugins/:pluginName/activate', requireServiceIdentity(SERVICE_NAME), (req: Request, res: Response): any => {
    const { pluginName } = req.params;
    const { tenantId } = req.body || {};

    const pluginsDir = getPluginsDirectory();
    const pathCheck = isSafePluginSubpath(pluginsDir, pluginName);
    if (!pathCheck.safe) {
        return res.status(403).json({
            error: 'PATH_TRAVERSAL_DETECTED',
            message: __t('path_traversal_detected_in_plu')
        });
    }

    if (!tenantId || typeof tenantId !== 'string') {
        return res.status(400).json({
            error: 'TENANT_ID_REQUIRED',
            message: __t('err_tenant_id_required')
        });
    }

    pluginStore.activatePlugin(tenantId, pluginName);
    return res.status(200).json({ status: 'SUCCESS', tenantId, plugin: pluginName });
});

app.post('/v1/plugins/:pluginName/execute', requireServiceIdentity(SERVICE_NAME), async (req: Request, res: Response): Promise<any> => {
    const { pluginName } = req.params;
    const { payload, tenantId, edition } = req.body || {};

    const pluginsDir = getPluginsDirectory();
    const pathCheck = isSafePluginSubpath(pluginsDir, pluginName);
    if (!pathCheck.safe) {
        return res.status(403).json({
            error: 'PATH_TRAVERSAL_DETECTED',
            message: __t('path_traversal_detected_in_plu')
        });
    }

    const pluginPath = pathCheck.resolvedPath;
    if (!fs.existsSync(pluginPath)) {
        return res.status(404).json({ error: __t('plugin_not_found', pluginName) });
    }

    // Cryptographic manifest signature verification
    const manifestPath = path.join(pluginPath, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
        return res.status(404).json({
            error: 'MANIFEST_NOT_FOUND',
            plugin: pluginName,
            message: __t('plugin_not_found', pluginName)
        });
    }

    let manifest: any;
    try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    } catch {
        return res.status(400).json({
            error: 'MALFORMED_MANIFEST',
            plugin: pluginName,
            message: __t('plugin_invalid_manifest', pluginName, __t('messages.error.parse_error'))
        });
    }

    if (!manifest.name || !manifest.version || !Array.isArray(manifest.hooks)) {
        return res.status(400).json({
            error: 'INVALID_MANIFEST_SCHEMA',
            plugin: pluginName,
            message: __t('plugin_reject_schema', pluginName)
        });
    }

    if (!manifest.signature) {
        return res.status(403).json({
            error: 'UNSIGNED_PLUGIN',
            plugin: pluginName,
            message: __t('plugin_reject_unsigned', pluginName)
        });
    }

    let publicKey: string;
    try {
        publicKey = loadPublicKey();
    } catch {
        return res.status(500).json({
            error: 'PUBLIC_KEY_NOT_FOUND',
            message: __t('plugin_internal_err')
        });
    }

    const isSignatureValid = verifyPluginSignature(pluginPath, manifest, publicKey);
    if (!isSignatureValid) {
        return res.status(403).json({
            error: 'INVALID_PLUGIN_SIGNATURE',
            plugin: pluginName,
            message: __t('plugin_reject_sig', pluginName)
        });
    }

    // Strict tenant plugin authorization check (COR-017)
    const activePlugins = pluginStore.getActivePlugins(tenantId);
    if (!activePlugins.includes(pluginName)) {
        return res.status(403).json({
            error: 'PLUGIN_NOT_AUTHORIZED',
            plugin: pluginName,
            message: __t('plugin_unauthorized', tenantId, pluginName, edition || 'Professional')
        });
    }

    Logger.info(__t('plugin_exec_sandbox', pluginName));

    try {
        const injectedSteps = await executePluginSandbox(pluginPath, payload, {
            basePluginsDir: pluginsDir
        });
        const receipt = createExecutionReceipt(pluginPath, manifest, tenantId, injectedSteps);
        pluginStore.recordExecutionReceipt(receipt);

        return res.status(200).json({
            plugin: pluginName,
            status: 'SUCCESS',
            injectedSteps,
            receipt,
            pluginDigest: receipt.pluginDigest,
            signerKeyId: receipt.signerKeyId,
            version: receipt.version,
            capabilities: receipt.capabilities,
            tenantId: receipt.tenantId,
            executedAt: receipt.executedAt,
            receiptHash: receipt.receiptHash,
            message: __t('plugin_success', pluginName)
        });
    } catch (err: any) {
        return res.status(500).json({ error: __t('plugin_sandbox_err', err.message) });
    }
});

if (require.main === module) {
    const PORT = process.env.PORT || ProductRegistry.getServiceConfig('plugin_manager').port;
    app.listen(Number(PORT), '0.0.0.0', () => {
        Logger.info(__t('listening_port', __t('plugin_manager_sandbox'), PORT));
    });
}
