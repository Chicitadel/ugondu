/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Shared / Service Identity
 * File           : identity.ts
 * Version        : 2.1.0
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
 * - OWASP ASVS 5.0 (V9.1 Token Source and Integrity, V9.2 Token Protection)
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

import { randomBytes, sign, verify, createPrivateKey } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { __t } from './i18n';
import { globalTrustRegistry } from './trust_registry';
export { globalTrustRegistry } from './trust_registry';

export const ALLOWED_SERVICE_ISSUERS = new Set<string>([
    'engine-core',
    'billing-gateway',
    'plugin-manager',
    'repository-adapter',
    'event-bus',
    'test-suite'
]);

export interface ServiceTokenPayload {
    iss: string;
    sub: string;
    aud: string;
    scope: string;
    iat: number;
    nbf: number;
    exp: number;
    jti: string;
    keyId: string;
    tokenVersion: string;
}

export interface IReplayAuthority {
    atomicRecordIfUnseen(compositeKey: string, exp: number): boolean;
    isReplayed(compositeKey: string): boolean;
}

export class DurableTokenReplayStore implements IReplayAuthority {
    private ledgerPath: string;
    private entries: Map<string, number> = new Map();

    constructor(customPath?: string) {
        this.ledgerPath = customPath || process.env.SERVICE_REPLAY_LEDGER_PATH || path.resolve(process.cwd(), '.service_replay_ledger.json');
        this.loadLedger();
    }

    private loadLedger(): void {
        try {
            if (fs.existsSync(this.ledgerPath)) {
                const data = JSON.parse(fs.readFileSync(this.ledgerPath, 'utf8'));
                const now = Math.floor(Date.now() / 1000);
                if (data && typeof data === 'object') {
                    for (const [key, exp] of Object.entries(data)) {
                        if (typeof exp === 'number' && exp > now) {
                            this.entries.set(key, exp);
                        }
                    }
                }
            }
        } catch {
            // Fail closed on disk read error
        }
    }

    private persistLedger(): void {
        const dir = path.dirname(this.ledgerPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        const obj: Record<string, number> = {};
        const now = Math.floor(Date.now() / 1000);
        for (const [key, exp] of this.entries.entries()) {
            if (exp > now) {
                obj[key] = exp;
            }
        }
        const tmpPath = `${this.ledgerPath}.tmp.${randomBytes(4).toString('hex')}`;
        fs.writeFileSync(tmpPath, JSON.stringify(obj), { encoding: 'utf8', mode: 0o600 });
        fs.renameSync(tmpPath, this.ledgerPath);
    }

    public isReplayed(compositeKey: string): boolean {
        const now = Math.floor(Date.now() / 1000);
        const exp = this.entries.get(compositeKey);
        if (exp !== undefined) {
            if (exp > now) {
                return true;
            }
            this.entries.delete(compositeKey);
        }
        return false;
    }

    public recordToken(compositeKey: string, exp: number): void {
        this.entries.set(compositeKey, exp);
        try {
            this.persistLedger();
        } catch {
            // Fail closed
        }
    }

    public atomicRecordIfUnseen(compositeKey: string, exp: number): boolean {
        if (this.isReplayed(compositeKey)) {
            return false;
        }
        this.entries.set(compositeKey, exp);
        try {
            this.persistLedger();
            return true;
        } catch {
            this.entries.delete(compositeKey);
            return false;
        }
    }

    public reloadFromDisk(): void {
        this.entries.clear();
        this.loadLedger();
    }

    public clearForTesting(): void {
        this.entries.clear();
        try {
            if (fs.existsSync(this.ledgerPath)) {
                fs.unlinkSync(this.ledgerPath);
            }
        } catch {}
    }
}

export const durableTokenReplayStore = new DurableTokenReplayStore();
let activeReplayAuthority: IReplayAuthority = durableTokenReplayStore;

export function setReplayAuthority(authority: IReplayAuthority): void {
    activeReplayAuthority = authority;
}

export function getReplayAuthority(): IReplayAuthority {
    return activeReplayAuthority;
}

export function signServiceIdentity(issuer: string, audience: string, scope: string = 'execute', privateKeyPem?: string, signingKeyId?: string): string {
    const activeKey = globalTrustRegistry.getActiveKeyByPurpose('service-identity');
    if (!activeKey) {
        throw new Error(__t('error_service_key_missing'));
    }

    const keyId = signingKeyId || activeKey.keyId;
    const header = Buffer.from(JSON.stringify({ alg: 'EdDSA', typ: 'JWT', kid: keyId })).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const jti = randomBytes(16).toString('hex');
    
    const payloadObj: ServiceTokenPayload = {
        iss: issuer,
        sub: issuer,
        aud: audience,
        scope: scope,
        iat: now,
        nbf: now,
        exp: now + 60, // 60 seconds validity
        jti: jti,
        keyId: keyId,
        tokenVersion: '1.0'
    };
    
    const payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
    const pem = privateKeyPem || process.env.UGONDU_SERVICE_IDENTITY_PRIVATE_KEY;
    if (!pem) throw new Error(__t('messages.error.ugondu_service_identity_private_key_is_requir'));
    const privateKeyObj = createPrivateKey(pem);
    
    const signature = sign(null, Buffer.from(`${header}.${payload}`), privateKeyObj).toString('base64url');
    return `${header}.${payload}.${signature}`;
}

export function verifyServiceIdentityToken(
    token: string,
    expectedAudience: string,
    requiredScope?: string
): { valid: boolean; error?: string; status?: number; payload?: ServiceTokenPayload } {
    try {
        const [headerB64, payloadB64, signatureB64] = token.split('.');
        if (!headerB64 || !payloadB64 || !signatureB64) {
            return { valid: false, error: __t('ui.responses.malformed_service_token'), status: 401 };
        }

        const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
        if (header.alg !== 'EdDSA') {
            return { valid: false, error: __t('ui.responses.invalid_algorithm'), status: 401 };
        }

        const keyId = header.kid;
        if (!keyId) {
            return { valid: false, error: __t('ui.responses.missing_key_id'), status: 401 };
        }

        try {
            globalTrustRegistry.validateKeyStatus(keyId);
        } catch (err: any) {
            return { valid: false, error: err.message === 'ERR_KEY_REVOKED' || err.message?.includes('revoked') ? 'KEY_REVOKED' : 'INVALID_KEY_STATUS', status: 401 };
        }
        globalTrustRegistry.verifyPurpose(keyId, 'service-identity');

        const publicKeyObj = globalTrustRegistry.getPublicKeyObject(keyId);
        const isValid = verify(
            null,
            Buffer.from(`${headerB64}.${payloadB64}`),
            publicKeyObj,
            Buffer.from(signatureB64, 'base64url')
        );

        if (!isValid) {
            return { valid: false, error: __t('ui.responses.invalid_service_signature'), status: 401 };
        }

        const decodedPayload: ServiceTokenPayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));

        // Header / Payload KeyId Consistency (OWASP ASVS 5.0 V9.1)
        if (header.kid !== decodedPayload.keyId) {
            return { valid: false, error: __t('ui.responses.key_id_mismatch'), status: 401 };
        }

        // Subject / Issuer Binding Enforcement (OWASP ASVS 5.0 V9.2)
        if (decodedPayload.iss !== decodedPayload.sub) {
            return { valid: false, error: __t('ui.responses.subject_issuer_mismatch'), status: 401 };
        }

        // Issuer Allowlist Enforcement (COR-08 / OWASP ASVS V9.2)
        if (!ALLOWED_SERVICE_ISSUERS.has(decodedPayload.iss)) {
            return { valid: false, error: __t('ui.responses.issuer_not_allowed'), status: 403 };
        }

        if (decodedPayload.aud !== expectedAudience) {
            return { valid: false, error: __t('ui.responses.audience_mismatch'), status: 403 };
        }

        if (requiredScope && decodedPayload.scope !== requiredScope) {
            return { valid: false, error: __t('ui.responses.scope_mismatch'), status: 403 };
        }

        const now = Math.floor(Date.now() / 1000);
        if (now < decodedPayload.nbf) {
            return { valid: false, error: __t('ui.responses.token_not_yet_valid'), status: 401 };
        }

        if (now > decodedPayload.exp) {
            return { valid: false, error: __t('ui.responses.token_expired'), status: 401 };
        }

        // Composite Replay Authority Check & Atomic Persistence (COR-07 / OWASP ASVS V9.1)
        const compositeKey = `${decodedPayload.iss}:${decodedPayload.keyId}:${decodedPayload.aud}:${decodedPayload.jti}`;
        const recorded = activeReplayAuthority.atomicRecordIfUnseen(compositeKey, decodedPayload.exp);
        if (!recorded) {
            return { valid: false, error: __t('ui.responses.token_replayed'), status: 401 };
        }

        return { valid: true, payload: decodedPayload };
    } catch {
        return { valid: false, error: __t('ui.responses.malformed_service_token'), status: 401 };
    }
}

export function requireServiceIdentity(expectedAudience: string, requiredScope?: string) {
    return (req: any, res: any, next: any) => {
        const auth = req.headers.authorization;
        if (!auth || !auth.startsWith('Bearer ')) {
            return res.status(401).json({ error: __t('ui.responses.missing_service_token'), message: __t('auth_service_token_missing') });
        }
        
        const token = auth.substring(7);
        const result = verifyServiceIdentityToken(token, expectedAudience, requiredScope);
        if (!result.valid) {
            return res.status(result.status || 401).json({
                error: result.error,
                message: __t(`auth_service_${result.error?.toLowerCase()}`) || result.error
            });
        }

        (req as any).serviceIdentity = result.payload;
        next();
    };
}
