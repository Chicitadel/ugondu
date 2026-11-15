/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Passport Gatekeeper
 * File           : capability-validator.ts
 * Version        : 2026.3.2-LTS
 * Author         : Ignatus Chika Ujomor
 * Organization   : Air Roofers SASU / Ujomor Systems Engineering & Governance Authority
 * Created Date   : 2026-10-02
 * Last Modified  : 2026-11-05
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
 * - Architecture Authority : Ignatus Chika Ujomor
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

// @ts-ignore
import { __t } from '@ugondu/shared';

import { PassportStatus, type DeliveryPassport } from '../model/passport';
import { ExecutionContext } from '../../types/execution';

export type CommercialTier =
  | 'COMMUNITY'
  | 'PROFESSIONAL'
  | 'BUSINESS'
  | 'ENTERPRISE'
  | 'SOVEREIGN';

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
  BUSINESS: [
    'PROJECT.INIT',
    'TWIN.DISCOVER',
    'BUILD.LOCAL',
    'DEPLOY.SINGLE_TARGET',
    'DELIVERY.PREVIEW',
    'MOVE.MIGRATE',
    'DEPLOY.MULTI_ENV',
    'ROLLBACK.VERIFIED',
    'FLEET.COLLABORATION',
    'TELEMETRY.ADVANCED',
    'AI.STANDARD',
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
    'FLEET.COLLABORATION',
    'TELEMETRY.ADVANCED',
    'AI.STANDARD',
    'DR.ASSURANCE',
    'AUTOPILOT.GOVERNED',
    'COMPLIANCE.PASSPORT_V2',
    'MULTI_REGION.FABRIC',
  ],
  SOVEREIGN: [
    'PROJECT.INIT',
    'TWIN.DISCOVER',
    'BUILD.LOCAL',
    'DEPLOY.SINGLE_TARGET',
    'DELIVERY.PREVIEW',
    'MOVE.MIGRATE',
    'DEPLOY.MULTI_ENV',
    'ROLLBACK.VERIFIED',
    'FLEET.COLLABORATION',
    'TELEMETRY.ADVANCED',
    'AI.STANDARD',
    'DR.ASSURANCE',
    'AUTOPILOT.GOVERNED',
    'COMPLIANCE.PASSPORT_V2',
    'MULTI_REGION.FABRIC',
    'AIR_GAPPED.ISOLATION',
    'SOVEREIGN.CRYPTOGRAPHY',
    'CUSTOM.POLICIES',
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
    if (TIER_CAPABILITY_MATRIX.BUSINESS.includes(capability)) {
      return 'BUSINESS';
    }
    if (TIER_CAPABILITY_MATRIX.ENTERPRISE.includes(capability)) {
      return 'ENTERPRISE';
    }
    return 'SOVEREIGN';
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
    const clearanceLevel =
      currentTier === 'SOVEREIGN' ? 5 :
      currentTier === 'ENTERPRISE' ? 4 :
      currentTier === 'BUSINESS' ? 3 :
      currentTier === 'PROFESSIONAL' ? 2 : 1;

    const passport: DeliveryPassport = {
      id: `pass-${tenantId}-${now.getTime()}`,
      version: '2.0',
      status: PassportStatus.ISSUED,
      metadata: {
        issuerId: 'ugondu-control-plane',
        subjectId: tenantId,
        issuedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
        clearanceLevel,
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
