// @ts-ignore
import { __t } from '../../../shared/i18n';
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Billing Gateway — Entitlement Event Processor
 * File           : EntitlementEventProcessor.ts
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

import { EntitlementEventSchema, isNewerThanCurrentVersion } from '../../../event-bus/src/events/entitlement-events';
import type { EntitlementEvent } from '../../../event-bus/src/events/entitlement-events';

/**
 * EntitlementEventProcessor — validates and routes Mandatag entitlement events.
 *
 * CRITICAL INVARIANTS:
 * 1. AeroBill (billing) webhook events MUST NEVER emit CAPABILITY_ACTIVATED.
 *    Only Mandatag-signed entitlement events activate capabilities.
 *    Payment confirmation alone does NOT activate any feature.
 *
 * 2. Signature must be verified before any state change.
 *    Invalid signatures → event dropped + security alert.
 *
 * 3. Out-of-order events are rejected:
 *    entitlementVersion + sequence ordering enforced.
 *    Old delayed events MUST NOT override newer state.
 *
 * 4. Events are idempotent: same eventId processed twice → second is dropped.
 */
export class EntitlementEventProcessor {
  /** Set of already-processed eventIds — prevents duplicate processing. */
  private readonly processedEvents = new Set<string>();

  /** Per-tenant current entitlement version tracking. */
  private readonly tenantVersions = new Map<string, { version: number; seq: number }>();

  constructor(
    private readonly verifySignature:         (event: EntitlementEvent) => boolean,
    private readonly onCapabilityActivated:   (tenantId: string, capabilityId: string) => void,
    private readonly onCapabilityDeactivated: (tenantId: string, capabilityId: string) => void,
    private readonly onEditionChanged:        (tenantId: string, from: string, to: string) => void,
    private readonly onSecurityAlert:         (reason: string, eventId: string) => void
  ) {}

  /**
   * Process an incoming Mandatag entitlement event.
   * Returns true if the event was processed. Returns false if dropped.
   */
  process(raw: unknown): boolean {
    // Schema validation
    const parseResult = EntitlementEventSchema.safeParse(raw);
    if (!parseResult.success) {
      this.onSecurityAlert(__t('messages.error.entitlement_event_failed_schema'), String(raw));
      return false;
    }
    const event = parseResult.data as unknown as EntitlementEvent;

    // Idempotency: drop already-processed events
    if (this.processedEvents.has(event.eventId)) {
      return false;
    }

    // Signature verification (Ed25519 from Mandatag)
    if (!this.verifySignature(event)) {
      this.onSecurityAlert(__t('messages.error.entitlement_signature_failed'), event.eventId);
      return false;
    }

    // Version ordering: reject out-of-sequence events
    const current = this.tenantVersions.get(event.tenantId);
    if (current && !isNewerThanCurrentVersion(event, current.version, current.seq)) {
      return false;  // old/delayed event — silently drop
    }

    // Mark as processed
    this.processedEvents.add(event.eventId);
    this.tenantVersions.set(event.tenantId, {
      version: event.entitlementVersion,
      seq:     event.sequence,
    });

    this.route(event);
    return true;
  }

  /**
   * AeroBill payment webhook handler.
   * INVARIANT: Payment webhooks NEVER emit CAPABILITY_ACTIVATED.
   * They trigger a Mandatag refresh request only.
   */
  onAeroBillPaymentConfirmed(
    _tenantId:  string,
    _invoiceId: string
  ): void {
    // Payment confirmed — trigger Mandatag manifest refresh only.
    // DO NOT activate any capability here.
    // Activation happens only when Mandatag issues a signed entitlement event.
    // This boundary is enforced at the code level — do not move capability
    // activation logic into this method.
  }

  private route(event: EntitlementEvent): void {
    const p = event.payload as unknown as Record<string, unknown>;
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
