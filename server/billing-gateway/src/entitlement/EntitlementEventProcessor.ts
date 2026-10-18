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
  private readonly tenantVersions = new Map<string, { version: number; seq: number }>();

  constructor(
    private readonly verifySignature: (event: EntitlementEvent) => boolean,
    private readonly onCapabilityActivated: (tenantId: string, capabilityId: string) => void,
    private readonly onCapabilityDeactivated: (tenantId: string, capabilityId: string) => void,
    private readonly onEditionChanged: (tenantId: string, from: string, to: string) => void,
    private readonly onSecurityAlert: (reason: string, eventId: string) => void
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

  onAeroBillPaymentConfirmed(_tenantId: string, _invoiceId: string): void {
    // Payment confirmed — trigger Mandatag manifest refresh only.
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
      default:
        break;
    }
  }
}
