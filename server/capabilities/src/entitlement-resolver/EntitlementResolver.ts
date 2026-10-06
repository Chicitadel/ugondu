// @ts-ignore
import { __t } from '../../../shared/i18n';
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : CEG — Entitlement Resolver
 * File           : EntitlementResolver.ts
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

import { isEntitled, isManifestExpired } from './CapabilityManifest';
import type { CapabilityManifest } from './CapabilityManifest';
import { isCoreCapability } from '../capability-registry/CapabilityDefinition';

export type FeatureResolutionResult =
  | 'USABLE'
  | 'NOT_ENTITLED'
  | 'NOT_CONFIGURED'
  | 'UNAUTHORIZED'
  | 'SUSPENDED'
  | 'MANIFEST_EXPIRED'
  | 'CORE_ALWAYS_AVAILABLE';

/**
 * @interface FeatureResolution
 * @description Corporate Governed interface implementation for FeatureResolution
 * @classification ENTERPRISE
 */
export interface FeatureResolution {
  capabilityId: string;
  result:       FeatureResolutionResult;
  edition?:     string;    // required edition (when NOT_ENTITLED)
  detail:       string;
}

/**
 * EntitlementResolver — resolves feature access using the six-predicate model.
 *
 * A feature is truly usable only when ALL predicates pass:
 *   1. ENTITLED — server grants this capability for current edition
 *   2. SUPPORTED — provider/environment supports it
 *   3. CONFIGURED — necessary configuration is in place
 *   4. AUTHORIZED — Ugondu has permission to perform it
 *   5. ACTIVE — capability is not suspended or in grace state
 *
 * INVARIANT: CORE capabilities always pass predicate 1 — NEVER paywalled.
 *            All resolution decisions are server-authoritative.
 *            Expired manifests are rejected — fresh validation required.
 */
export class EntitlementResolver {

  constructor(
    private readonly manifest: CapabilityManifest
  ) {}

  /** Resolve whether a capability is usable for this tenant. */
  resolve(
    capabilityId: string,
    isSupported:  boolean,
    isConfigured: boolean,
    isAuthorized: boolean
  ): FeatureResolution {
    // CORE capabilities are always available — not subject to entitlement
    if (isCoreCapability(capabilityId)) {
      return {
        capabilityId,
        result: 'CORE_ALWAYS_AVAILABLE',
        detail: 'Core safety capability — always available regardless of edition.',
      };
    }

    // Manifest must not be expired
    if (isManifestExpired(this.manifest)) {
      return {
        capabilityId,
        result: 'MANIFEST_EXPIRED',
        detail: __t('entitlement_manifest_has_expir'),
      };
    }

    // Predicate 1: ENTITLED
    if (!isEntitled(this.manifest, capabilityId)) {
      return {
        capabilityId,
        result:  'NOT_ENTITLED',
        edition: this.manifest.edition,
        detail: __t('ui.responses.capability_not_included', { capabilityId, edition: this.manifest.edition }),
      };
    }

    // Predicate 5: ACTIVE (check feature state)
    const featureState = this.manifest.featureStates[capabilityId];
    if (featureState === 'SUSPENDED' || featureState === 'DEACTIVATED' || featureState === 'BLOCKED') {
      return {
        capabilityId,
        result: 'SUSPENDED',
        detail: __t('ui.responses.capability_currently_state', { capabilityId, featureState }),
      };
    }

    // Predicate 2: SUPPORTED
    if (!isSupported) {
      return {
        capabilityId,
        result: 'NOT_CONFIGURED',
        detail: __t('ui.responses.capability_not_supported', { capabilityId }),
      };
    }

    // Predicate 3: CONFIGURED
    if (!isConfigured) {
      return {
        capabilityId,
        result: 'NOT_CONFIGURED',
        detail: __t('ui.responses.capability_not_configured', { capabilityId }),
      };
    }

    // Predicate 4: AUTHORIZED
    if (!isAuthorized) {
      return {
        capabilityId,
        result: 'UNAUTHORIZED',
        detail: __t('ui.responses.capability_needs_permission', { capabilityId }),
      };
    }

    return {
      capabilityId,
      result: 'USABLE',
      detail: __t('ui.responses.capability_fully_available', { capabilityId }),
    };
  }
}
