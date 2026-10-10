/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : CEG — Capability Registry
 * File           : CapabilityDefinition.ts
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
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import type { UgonduEdition } from '../edition-registry/EditionDefinition';

/**
 * CapabilityClass — determines paywall behavior.
 * CORE capabilities are NEVER paywalled — required for safe operation.
 */
export type CapabilityClass =
  | 'CORE'     // always available — required for safe operation (NEVER paywalled)
  | 'EDITION'  // requires specific paid edition
  | 'METERED'  // available but subject to quotas
  | 'ADDON';   // separately licensed

/**
 * CapabilityState — 12-state lifecycle.
 * NEVER reduce to boolean — the difference between SUSPENDED and DEACTIVATED matters.
 */
export type CapabilityState =
  | 'AVAILABLE'
  | 'ACTIVE'
  | 'IN_USE'
  | 'LIMITED'
  | 'PENDING_UPGRADE'
  | 'PENDING_ACTIVATION'
  | 'SUSPENDED'
  | 'DEACTIVATING'
  | 'DEACTIVATED'
  | 'GRACE'
  | 'BLOCKED'
  | 'UNSUPPORTED'
  | 'UNQUALIFIED';

/**
 * Deactivation mode — how a capability behaves during downgrade.
 */
export type DeactivationMode =
  | 'DISABLE_NEW_USE'           // new invocations blocked; existing continue
  | 'DISABLE_RUNTIME'           // runtime execution blocked immediately
  | 'READ_ONLY'                 // write operations blocked; read continues
  | 'RETENTION_ONLY'            // no new operations; read-only data retention
  | 'GRACEFUL_COMPLETION'       // current executions complete; no new
  | 'MIGRATE'                   // migrate data/config then disable
  | 'SUSPEND'                   // pause execution; resume possible
  | 'TERMINATE'                 // hard stop (unsafe — use only when no other option)
  | 'NEVER_DISABLE';            // safety-critical: CORE only

/**
 * @interface CapabilityDefinition
 * @description Corporate Governed interface implementation for CapabilityDefinition
 * @classification ENTERPRISE
 */
export interface CapabilityDefinition {
  capabilityId:     string;    // e.g. 'ROLLBACK'
  displayName:      string;
  description:      string;
  capabilityClass:  CapabilityClass;
  minimumEdition:   UgonduEdition;
  deactivationMode: DeactivationMode;
  dependencies:     string[];   // capability IDs this depends on
  conflicts:        string[];   // capability IDs that conflict with this one
  metered?:         boolean;
  quotaKey?:        string;    // key in EditionLimits if metered
}

/**
 * CORE capabilities — MUST NEVER be paywalled.
 * Required for safe operation of the platform.
 */
export const CORE_CAPABILITY_IDS: ReadonlySet<string> = new Set([
  'SECURITY_KERNEL',
  'BASIC_VERIFICATION',
  'CORE_RECOVERY_SAFETY',
  'COR_EXECUTION_INTEGRITY',
  'BASIC_AUDIT_TRAIL',
  'EMERGENCY_ROLLBACK',
  'BASIC_DEPLOYMENT',
  'AUTHENTICATION',
]);

/** Check if a capability ID is a CORE capability (never paywalled). */
export function isCoreCapability(capabilityId: string): boolean {
  return CORE_CAPABILITY_IDS.has(capabilityId);
}
