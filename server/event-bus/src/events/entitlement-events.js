"use strict";
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Event Bus — Entitlement Events
 * File           : entitlement-events.ts
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntitlementEventSchema = void 0;
exports.isNewerThanCurrentVersion = isNewerThanCurrentVersion;
const zod_1 = require("zod");
exports.EntitlementEventSchema = zod_1.z.object({
    eventId: zod_1.z.string().uuid(),
    eventType: zod_1.z.enum([
        'SUBSCRIPTION_CHANGED', 'ENTITLEMENT_SUSPENDED', 'ENTITLEMENT_RESTORED',
        'CAPABILITY_ACTIVATED', 'CAPABILITY_DEACTIVATED', 'EDITION_UPGRADED',
        'EDITION_DOWNGRADED', 'ENTITLEMENT_EXPIRED', 'ENTITLEMENT_REVOKED',
        'PLUGIN_ACTIVATED', 'PLUGIN_DEACTIVATED',
    ]),
    tenantId: zod_1.z.string(),
    subjectId: zod_1.z.string(),
    entitlementVersion: zod_1.z.number().int().positive(),
    sequence: zod_1.z.number().int().nonnegative(),
    effectiveAt: zod_1.z.string().datetime(),
    issuedAt: zod_1.z.string().datetime(),
    payload: zod_1.z.record(zod_1.z.unknown()),
    signature: zod_1.z.string().min(1),
    signatureKeyId: zod_1.z.string().min(1),
});
/**
 * Determine if an incoming event is newer than the current tracked entitlement version.
 * Old delayed events MUST NOT override newer state.
 */
function isNewerThanCurrentVersion(event, currentVersion, currentSeq) {
    if (event.entitlementVersion > currentVersion)
        return true;
    if (event.entitlementVersion === currentVersion && event.sequence > currentSeq)
        return true;
    return false;
}
