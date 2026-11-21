/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Billing Gateway — Replay Protection & Origin Resolution
 * File           : replay-protection.ts
 * Version        : 2026.3.2-LTS
 * Author         : Ignatus Chika Ujomor
 * Organization   : Air Roofers SASU / Enterprise Governance
 * Created Date   : 2026-10-03
 * Last Modified  : 2026-11-05
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
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
 * - Architecture Authority : Ignatus Chika Ujomor
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import { ProductRegistry } from '@ugondu/shared';

export interface IdempotencyEntry {
    payloadHash: string;
    status: number;
    body: Record<string, any>;
    expiresAt: number;
}

export const seenNonces = new Map<string, number>();
export const idempotencyCache = new Map<string, IdempotencyEntry>();
export const REPLAY_TTL_MS = 5 * 60 * 1000;

export function clearReplayCache(): void {
    seenNonces.clear();
    idempotencyCache.clear();
}

export function pruneReplayCaches(now: number): void {
    for (const [k, exp] of seenNonces.entries()) {
        if (exp <= now) seenNonces.delete(k);
    }
    for (const [k, entry] of idempotencyCache.entries()) {
        if (entry.expiresAt <= now) idempotencyCache.delete(k);
    }
}

export function resolveAllowedOrigins(): string[] {
    if (process.env.ALLOWED_ORIGINS && process.env.ALLOWED_ORIGINS.trim().length > 0) {
        return process.env.ALLOWED_ORIGINS.split(',')
            .map((o) => o.trim())
            .filter(Boolean);
    }
    return [
        process.env.ENGINE_CORE_ORIGIN || ProductRegistry.getServiceUrl('engine_core'),
        process.env.ADMIN_ORIGIN || 'https://admin.airroofers.eu',
    ];
}
