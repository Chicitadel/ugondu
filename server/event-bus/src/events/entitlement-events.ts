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

import { z } from 'zod';

/**
 * EntitlementEventType — all event types emitted by Mandatag (license.airroofers.eu).
 *
 * INVARIANT:
 * - AeroBill (billing) NEVER emits CAPABILITY_ACTIVATED or EDITION_UPGRADED.
 * - Only Mandatag-signed entitlement events activate or deactivate capabilities.
 * - Payment confirmation alone does NOT activate any feature.
 */
export type EntitlementEventType =
  | 'SUBSCRIPTION_CHANGED'
  | 'ENTITLEMENT_SUSPENDED'
  | 'ENTITLEMENT_RESTORED'
  | 'CAPABILITY_ACTIVATED'
  | 'CAPABILITY_DEACTIVATED'
  | 'EDITION_UPGRADED'
  | 'EDITION_DOWNGRADED'
  | 'ENTITLEMENT_EXPIRED'
  | 'ENTITLEMENT_REVOKED'
  | 'PLUGIN_ACTIVATED'
  | 'PLUGIN_DEACTIVATED';

/**
 * EntitlementEvent — a signed, versioned, idempotent event from Mandatag.
 *
 * Race condition protection:
 *   entitlementVersion + sequence + effectiveAt + eventId.
 *   Only the latest valid state may activate. Old delayed events MUST NOT override newer state.
 */
export interface EntitlementEvent {
  eventId:             string;    // UUID — deduplication key
  eventType:           EntitlementEventType;
  tenantId:            string;
  subjectId:           string;
  entitlementVersion:  number;   // monotonically increasing
  sequence:            number;   // per-tenant sequence
  effectiveAt:         string;   // ISO-8601 — when this event takes effect
  issuedAt:            string;   // ISO-8601 — when Mandatag issued it
  payload:             EntitlementEventPayload;
  signature:           string;   // Ed25519 signed by Mandatag key
  signatureKeyId:      string;   // Mandatag signing key ID (for key rotation)
}

/**
 * @interface SubscriptionChangedPayload
 * @description Corporate Governed interface implementation for SubscriptionChangedPayload
 * @classification ENTERPRISE
 */
export interface SubscriptionChangedPayload {
  previousEdition:  string;
  newEdition:       string;
  effectiveAt:      string;   // ISO-8601
}

/**
 * @interface CapabilityChangedPayload
 * @description Corporate Governed interface implementation for CapabilityChangedPayload
 * @classification ENTERPRISE
 */
export interface CapabilityChangedPayload {
  capabilityId:     string;
  previousState?:   string;
  newState:         string;
  reason:           string;
}

/**
 * @interface EditionChangedPayload
 * @description Corporate Governed interface implementation for EditionChangedPayload
 * @classification ENTERPRISE
 */
export interface EditionChangedPayload {
  previousEdition:      string;
  newEdition:           string;
  gracePeriodDays?:     number;    // present on EDITION_DOWNGRADED
  affectedCapabilities: string[];  // capability IDs impacted by the change
}

/**
 * @interface PluginChangedPayload
 * @description Corporate Governed interface implementation for PluginChangedPayload
 * @classification ENTERPRISE
 */
export interface PluginChangedPayload {
  pluginId:   string;
  version:    string;
  reason:     string;
}

/**
 * @interface GenericEntitlementPayload
 * @description Corporate Governed interface implementation for GenericEntitlementPayload
 * @classification ENTERPRISE
 */
export interface GenericEntitlementPayload {
  reason:   string;
  metadata: Record<string, unknown>;
}

export type EntitlementEventPayload =
  | SubscriptionChangedPayload
  | CapabilityChangedPayload
  | EditionChangedPayload
  | PluginChangedPayload
  | GenericEntitlementPayload;

export const EntitlementEventSchema = z.object({
  eventId:            z.string().uuid(),
  eventType:          z.enum([
    'SUBSCRIPTION_CHANGED', 'ENTITLEMENT_SUSPENDED', 'ENTITLEMENT_RESTORED',
    'CAPABILITY_ACTIVATED', 'CAPABILITY_DEACTIVATED', 'EDITION_UPGRADED',
    'EDITION_DOWNGRADED', 'ENTITLEMENT_EXPIRED', 'ENTITLEMENT_REVOKED',
    'PLUGIN_ACTIVATED', 'PLUGIN_DEACTIVATED',
  ]),
  tenantId:           z.string(),
  subjectId:          z.string(),
  entitlementVersion: z.number().int().positive(),
  sequence:           z.number().int().nonnegative(),
  effectiveAt:        z.string().datetime(),
  issuedAt:           z.string().datetime(),
  payload:            z.record(z.string(), z.unknown()),
  signature:          z.string().min(1),
  signatureKeyId:     z.string().min(1),
});

/**
 * Determine if an incoming event is newer than the current tracked entitlement version.
 * Old delayed events MUST NOT override newer state.
 */
export function isNewerThanCurrentVersion(
  event:          EntitlementEvent,
  currentVersion: number,
  currentSeq:     number
): boolean {
  if (event.entitlementVersion > currentVersion) return true;
  if (event.entitlementVersion === currentVersion && event.sequence > currentSeq) return true;
  return false;
}
