/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Passport Gatekeeper
 * File           : capability-validator.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-02
 * Last Modified  : 2026-10-02
 * Classification : ENTERPRISE
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
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

// @ts-ignore
import { __t } from '@ugondu/shared';

import { PassportStatus, type DeliveryPassport } from '../model/passport';
import { ExecutionContext } from '../../types/execution';

export type CommercialTier = 'COMMUNITY' | 'PROFESSIONAL' | 'ENTERPRISE';

export const TIER_CAPABILITY_MATRIX: Record<CommercialTier, readonly string[]> = {
  COMMUNITY: [
    'PROJECT.INIT',
    'TWIN.DISCOVER',
    'BUILD.LOCAL',
    'DEPLOY.SINGLE_TARGET',
  ],
  PROFESSIONAL: [
    'PROJECT.INIT',
    'TWIN.DISCOVER',
    'BUILD.LOCAL',
    'DEPLOY.SINGLE_TARGET',
    'DELIVERY.PREVIEW',
    'MOVE.MIGRATE',
    'DEPLOY.MULTI_ENV',
    'ROLLBACK.VERIFIED',
  ],
  ENTERPRISE: [
    'PROJECT.INIT',
    'TWIN.DISCOVER',
    'BUILD.LOCAL',
    'DEPLOY.SINGLE_TARGET',
    'DELIVERY.PREVIEW',
    'MOVE.MIGRATE',
    'DEPLOY.MULTI_ENV',
    'ROLLBACK.VERIFIED',
    'DR.ASSURANCE',
    'AUTOPILOT.GOVERNED',
    'COMPLIANCE.PASSPORT_V2',
    'MULTI_REGION.FABRIC',
  ],
};

export interface SubscriptionLifecycleEvent {
  eventId: string;
  eventType:
    | 'SUBSCRIPTION_ACTIVATED'
    | 'TIER_CHANGED'
    | 'SUBSCRIPTION_PAST_DUE'
    | 'SUBSCRIPTION_CANCELED';
  tenantId: string;
  newTier: CommercialTier;
  timestamp: string;
}

export interface EntitlementAuthorizationResult {
  allowed: boolean;
  code: 'ENTITLEMENT_VERIFIED' | 'CAPABILITY_NOT_ENTITLED';
  capability: string;
  currentTier: CommercialTier;
  requiredTier: CommercialTier;
  upgradePath?: 'SUBSCRIPTION_UPGRADE';
  clientReinstallRequired: boolean;
  clientBinaryDigest: string;
  passport?: DeliveryPassport;
}

/**
 * @class ServerAuthoritativeEntitlementGate
 * @description Evaluates commercial capability entitlements on the server and processes
 * live subscription upgrades (e.g., Community -> Professional) without requiring any
 * client binary reinstallation or project migration.
 * @classification ENTERPRISE
 */
export class ServerAuthoritativeEntitlementGate {
  private readonly tenantTiers = new Map<string, CommercialTier>();
  private readonly tenantBinaryDigests = new Map<string, string>();
  private readonly eventLog: SubscriptionLifecycleEvent[] = [];

  public registerTenant(
    tenantId: string,
    initialTier: CommercialTier = 'COMMUNITY',
    clientBinaryDigest = 'sha256:ugondu-universal-cli-v1-immutable'
  ): void {
    this.tenantTiers.set(tenantId, initialTier);
    this.tenantBinaryDigests.set(tenantId, clientBinaryDigest);
  }

  public getTenantTier(tenantId: string): CommercialTier {
    return this.tenantTiers.get(tenantId) ?? 'COMMUNITY';
  }

  public resolveRequiredTier(capability: string): CommercialTier {
    if (TIER_CAPABILITY_MATRIX.COMMUNITY.includes(capability)) {
      return 'COMMUNITY';
    }
    if (TIER_CAPABILITY_MATRIX.PROFESSIONAL.includes(capability)) {
      return 'PROFESSIONAL';
    }
    return 'ENTERPRISE';
  }

  public authorizeCapability(
    tenantId: string,
    capability: string,
    clientBinaryDigest = 'sha256:ugondu-universal-cli-v1-immutable'
  ): EntitlementAuthorizationResult {
    const currentTier = this.getTenantTier(tenantId);
    const granted = TIER_CAPABILITY_MATRIX[currentTier] ?? TIER_CAPABILITY_MATRIX.COMMUNITY;
    const requiredTier = this.resolveRequiredTier(capability);
    const recordedBinaryDigest =
      this.tenantBinaryDigests.get(tenantId) ?? clientBinaryDigest;

    if (!granted.includes(capability)) {
      return {
        allowed: false,
        code: 'CAPABILITY_NOT_ENTITLED',
        capability,
        currentTier,
        requiredTier,
        upgradePath: 'SUBSCRIPTION_UPGRADE',
        clientReinstallRequired: false,
        clientBinaryDigest: recordedBinaryDigest,
      };
    }

    const now = new Date();
    const passport: DeliveryPassport = {
      id: `pass-${tenantId}-${now.getTime()}`,
      version: '2.0',
      status: PassportStatus.ISSUED,
      metadata: {
        issuerId: 'ugondu-control-plane',
        subjectId: tenantId,
        issuedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
        clearanceLevel: currentTier === 'ENTERPRISE' ? 3 : currentTier === 'PROFESSIONAL' ? 2 : 1,
        capabilities: [...granted],
      },
      evidence: [],
    };

    return {
      allowed: true,
      code: 'ENTITLEMENT_VERIFIED',
      capability,
      currentTier,
      requiredTier,
      clientReinstallRequired: false,
      clientBinaryDigest: recordedBinaryDigest,
      passport,
    };
  }

  public processSubscriptionEvent(event: SubscriptionLifecycleEvent): {
    tenantId: string;
    previousTier: CommercialTier;
    activeTier: CommercialTier;
    entitledCapabilities: readonly string[];
    clientReinstallRequired: boolean;
    clientBinaryDigest: string;
  } {
    const previousTier = this.getTenantTier(event.tenantId);
    let activeTier: CommercialTier = previousTier;

    if (
      event.eventType === 'SUBSCRIPTION_ACTIVATED' ||
      event.eventType === 'TIER_CHANGED'
    ) {
      activeTier = event.newTier;
    } else if (event.eventType === 'SUBSCRIPTION_CANCELED') {
      activeTier = 'COMMUNITY';
    }

    this.tenantTiers.set(event.tenantId, activeTier);
    this.eventLog.push(event);

    const clientBinaryDigest =
      this.tenantBinaryDigests.get(event.tenantId) ??
      'sha256:ugondu-universal-cli-v1-immutable';

    return {
      tenantId: event.tenantId,
      previousTier,
      activeTier,
      entitledCapabilities: TIER_CAPABILITY_MATRIX[activeTier],
      clientReinstallRequired: false,
      clientBinaryDigest,
    };
  }
}

/**
 * @class CapabilityValidator
 * @description Corporate Governed class implementation for CapabilityValidator
 * @classification ENTERPRISE
 */
export class CapabilityValidator {
    public async validate(passport: DeliveryPassport, context: ExecutionContext): Promise<void> {
        const requiredCapabilities = context.requiredCapabilities;
        const grantedCapabilities = passport.metadata.capabilities ?? [];

        for (const reqCap of requiredCapabilities) {
            if (!grantedCapabilities.includes(reqCap)) {
                throw new Error(__t('messages.error.capability_missing_passport_does_not_grant_re', { 'reqCap': reqCap }));
            }
        }
    }
}
