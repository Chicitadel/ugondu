/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Billing Gateway — Entitlement Event Processor
 * File           : EntitlementEventProcessor.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-02
 * Last Modified  : 2026-10-18
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { __t } from '@ugondu/shared';
import { tokenStore, LicenseStatus } from '../db';
import { MandatagClient, defaultMandatagClient } from '../mandatag-client';
import { verifyMandatagEntitlementToken } from '../mandatag-verifier';

export interface PaymentSyncResult {
  synced: boolean;
  deduplicated?: boolean;
  tenantId: string;
  invoiceId: string;
  edition?: string;
  entitlementToken?: string;
}

export interface CommercialLifecycleInput {
  eventId: string;
  eventType:
    | 'payment.failed'
    | 'invoice.payment_failed'
    | 'subscription.canceled'
    | 'charge.refunded'
    | 'subscription.expired';
  tenantId: string;
  invoiceId?: string;
  subscriptionId?: string;
  reason?: string;
  correlationId?: string;
}

export const tenantLifecycleOverrides = new Map<string, { status: LicenseStatus; reason?: string; updatedAt: string }>();

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

export interface EntitlementEvent {
  eventId: string;
  eventType: EntitlementEventType;
  tenantId: string;
  subjectId: string;
  entitlementVersion: number;
  sequence: number;
  effectiveAt: string;
  issuedAt: string;
  payload: Record<string, unknown>;
  signature: string;
  signatureKeyId: string;
}

const VALID_EVENT_TYPES = new Set<string>([
  'SUBSCRIPTION_CHANGED',
  'ENTITLEMENT_SUSPENDED',
  'ENTITLEMENT_RESTORED',
  'CAPABILITY_ACTIVATED',
  'CAPABILITY_DEACTIVATED',
  'EDITION_UPGRADED',
  'EDITION_DOWNGRADED',
  'ENTITLEMENT_EXPIRED',
  'ENTITLEMENT_REVOKED',
  'PLUGIN_ACTIVATED',
  'PLUGIN_DEACTIVATED',
]);

function validateEntitlementEvent(raw: unknown): { success: true; data: EntitlementEvent } | { success: false } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { success: false };
  const r = raw as Record<string, unknown>;
  if (typeof r.eventId !== 'string' || r.eventId.length === 0) return { success: false };
  if (typeof r.eventType !== 'string' || !VALID_EVENT_TYPES.has(r.eventType)) return { success: false };
  if (typeof r.tenantId !== 'string' || r.tenantId.length === 0) return { success: false };
  if (typeof r.subjectId !== 'string') return { success: false };
  if (typeof r.entitlementVersion !== 'number' || !Number.isInteger(r.entitlementVersion) || r.entitlementVersion <= 0) {
    return { success: false };
  }
  if (typeof r.sequence !== 'number' || !Number.isInteger(r.sequence) || r.sequence < 0) {
    return { success: false };
  }
  if (typeof r.effectiveAt !== 'string' || Number.isNaN(Date.parse(r.effectiveAt))) return { success: false };
  if (typeof r.issuedAt !== 'string' || Number.isNaN(Date.parse(r.issuedAt))) return { success: false };
  if (!r.payload || typeof r.payload !== 'object' || Array.isArray(r.payload)) return { success: false };
  if (typeof r.signature !== 'string' || r.signature.length === 0) return { success: false };
  if (typeof r.signatureKeyId !== 'string' || r.signatureKeyId.length === 0) return { success: false };
  return { success: true, data: r as unknown as EntitlementEvent };
}

export function isNewerThanCurrentVersion(
  event: EntitlementEvent,
  currentVersion: number,
  currentSeq: number
): boolean {
  if (event.entitlementVersion > currentVersion) return true;
  if (event.entitlementVersion === currentVersion && event.sequence > currentSeq) return true;
  return false;
}

export class EntitlementEventProcessor {
  private readonly processedEvents = new Set<string>();
  private readonly processedPayments = new Map<string, PaymentSyncResult>();
  private readonly tenantVersions = new Map<string, { version: number; seq: number }>();

  constructor(
    private readonly verifySignature: (event: EntitlementEvent) => boolean,
    private readonly onCapabilityActivated: (tenantId: string, capabilityId: string) => void,
    private readonly onCapabilityDeactivated: (tenantId: string, capabilityId: string) => void,
    private readonly onEditionChanged: (tenantId: string, from: string, to: string) => void,
    private readonly onSecurityAlert: (reason: string, eventId: string) => void,
    private readonly mandatagClient: MandatagClient = defaultMandatagClient
  ) {}

  process(raw: unknown): boolean {
    const parseResult = validateEntitlementEvent(raw);
    if (!parseResult.success) {
      this.onSecurityAlert(__t('messages.error.entitlement_event_failed_schema'), String(raw));
      return false;
    }
    const event = parseResult.data;

    if (this.processedEvents.has(event.eventId)) {
      return false;
    }

    if (!this.verifySignature(event)) {
      this.onSecurityAlert(__t('messages.error.entitlement_signature_failed'), event.eventId);
      return false;
    }

    const current = this.tenantVersions.get(event.tenantId);
    if (current && !isNewerThanCurrentVersion(event, current.version, current.seq)) {
      return false;
    }

    this.processedEvents.add(event.eventId);
    this.tenantVersions.set(event.tenantId, {
      version: event.entitlementVersion,
      seq: event.sequence,
    });

    this.route(event);
    return true;
  }

  async onAeroBillPaymentConfirmed(
    tenantId: string,
    invoiceId: string,
    options?: { subscriptionId?: string; edition?: string; correlationId?: string }
  ): Promise<PaymentSyncResult> {
    const normalizedTenant = (tenantId || '').trim();
    const normalizedInvoice = (invoiceId || '').trim();
    if (!normalizedTenant || !normalizedInvoice) {
      throw new Error('PAYMENT_SYNC_MISSING_IDENTIFIERS');
    }

    const dedupKey = `${normalizedTenant}:${normalizedInvoice}`;
    const existing = this.processedPayments.get(dedupKey);
    if (existing) {
      return { ...existing, deduplicated: true };
    }

    const manifest = await this.mandatagClient.refreshEntitlementManifest({
      tenantId: normalizedTenant,
      invoiceId: normalizedInvoice,
      subscriptionId: options?.subscriptionId,
      edition: options?.edition,
      triggerEvent: 'AEROBILL_PAYMENT_CONFIRMED',
      correlationId: options?.correlationId,
    });

    let resolvedEdition = typeof manifest?.edition === 'string' ? manifest.edition : options?.edition;
    const signedToken = typeof manifest?.token === 'string' ? manifest.token.trim() : undefined;

    if (signedToken && signedToken.split('.').length === 3) {
      const verified = verifyMandatagEntitlementToken(signedToken);
      if (!verified.valid || !verified.record) {
        this.onSecurityAlert(__t('messages.error.entitlement_signature_failed'), normalizedInvoice);
        throw new Error('MANDATAG_ENTITLEMENT_TOKEN_INVALID');
      }
      resolvedEdition = verified.record.edition;
      if (tokenStore.isReady()) {
        tokenStore.registerToken(signedToken, verified.record.tenant_id, verified.record.edition, {
          status: verified.record.status,
          expiresAt: verified.record.expires_at,
          entitlements: verified.record.entitlements,
          organizationId: verified.record.organization_id,
          organizationClass: verified.record.organization_class,
        });
      }
    } else if (signedToken && resolvedEdition && tokenStore.isReady()) {
      tokenStore.registerToken(signedToken, normalizedTenant, resolvedEdition, {
        status: 'active',
        expiresAt: typeof manifest?.expiresAt === 'string' ? manifest.expiresAt : undefined,
      });
    }

    tenantLifecycleOverrides.delete(normalizedTenant);
    if (tokenStore.isReady()) {
      tokenStore.updateTenantStatus(normalizedTenant, 'active');
    }

    const result: PaymentSyncResult = {
      synced: true,
      tenantId: normalizedTenant,
      invoiceId: normalizedInvoice,
      edition: resolvedEdition,
      ...(signedToken ? { entitlementToken: signedToken } : {}),
    };
    this.processedPayments.set(dedupKey, result);
    return result;
  }

  async onAeroBillCommercialLifecycleEvent(
    input: CommercialLifecycleInput
  ): Promise<{ processed: boolean; status: LicenseStatus; deduplicated?: boolean }> {
    const lifecycleKey = `${input.eventType}:${input.eventId}`;
    if (this.processedEvents.has(lifecycleKey)) {
      const current = tenantLifecycleOverrides.get(input.tenantId)?.status ?? 'suspended';
      return { processed: true, status: current, deduplicated: true };
    }

    const nextStatus: LicenseStatus =
      input.eventType === 'subscription.canceled' || input.eventType === 'charge.refunded'
        ? 'revoked'
        : input.eventType === 'subscription.expired'
          ? 'expired'
          : 'suspended';

    const reason = input.reason || input.eventType;
    if (nextStatus === 'revoked' || nextStatus === 'expired') {
      await this.mandatagClient.revokeEntitlement({
        tenantId: input.tenantId,
        reason,
        invoiceId: input.invoiceId,
        subscriptionId: input.subscriptionId,
        correlationId: input.correlationId,
      });
    } else {
      await this.mandatagClient.refreshEntitlementManifest({
        tenantId: input.tenantId,
        invoiceId: input.invoiceId,
        subscriptionId: input.subscriptionId,
        triggerEvent: input.eventType.toUpperCase(),
        correlationId: input.correlationId,
      });
    }

    this.processedEvents.add(lifecycleKey);
    tenantLifecycleOverrides.set(input.tenantId, {
      status: nextStatus,
      reason,
      updatedAt: new Date().toISOString(),
    });
    if (tokenStore.isReady()) {
      tokenStore.updateTenantStatus(input.tenantId, nextStatus, reason);
    }
    return { processed: true, status: nextStatus };
  }

  private route(event: EntitlementEvent): void {
    const p = event.payload as Record<string, unknown>;
    switch (event.eventType) {
      case 'CAPABILITY_ACTIVATED':
        this.onCapabilityActivated(event.tenantId, String(p['capabilityId'] ?? ''));
        break;
      case 'CAPABILITY_DEACTIVATED':
        this.onCapabilityDeactivated(event.tenantId, String(p['capabilityId'] ?? ''));
        break;
      case 'EDITION_UPGRADED':
      case 'EDITION_DOWNGRADED':
        this.onEditionChanged(
          event.tenantId,
          String(p['previousEdition'] ?? ''),
          String(p['newEdition'] ?? '')
        );
        break;
      case 'ENTITLEMENT_REVOKED':
        tenantLifecycleOverrides.set(event.tenantId, {
          status: 'revoked',
          reason: String(p['reason'] ?? 'entitlement_revoked'),
          updatedAt: new Date().toISOString(),
        });
        if (tokenStore.isReady()) tokenStore.updateTenantStatus(event.tenantId, 'revoked');
        break;
      case 'ENTITLEMENT_SUSPENDED':
        tenantLifecycleOverrides.set(event.tenantId, {
          status: 'suspended',
          reason: String(p['reason'] ?? 'entitlement_suspended'),
          updatedAt: new Date().toISOString(),
        });
        if (tokenStore.isReady()) tokenStore.updateTenantStatus(event.tenantId, 'suspended', String(p['reason'] ?? 'entitlement_suspended'));
        break;
      case 'ENTITLEMENT_EXPIRED':
        tenantLifecycleOverrides.set(event.tenantId, {
          status: 'expired',
          updatedAt: new Date().toISOString(),
        });
        if (tokenStore.isReady()) tokenStore.updateTenantStatus(event.tenantId, 'expired');
        break;
      case 'ENTITLEMENT_RESTORED':
        tenantLifecycleOverrides.delete(event.tenantId);
        if (tokenStore.isReady()) tokenStore.updateTenantStatus(event.tenantId, 'active');
        break;
      default:
        break;
    }
  }
}
