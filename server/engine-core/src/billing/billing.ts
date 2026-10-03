/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Billing and Capability Entitlement Graph
 * File           : billing.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
 * Classification : ENTERPRISE
 *
 * Governance:
 * - AI Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Copyright (c) 2026 Air Roofers
 * All Rights Reserved.
 ******************************************************************************/

import { z } from 'zod';
import * as crypto from 'crypto';

export const CapabilityStateSchema = z.enum(["LOCKED", "ACTIVE", "SUSPENDED"]);
export type CapabilityState = z.infer<typeof CapabilityStateSchema>;

export const EventPayloadSchema = z.object({
  eventId: z.string().uuid(),
  timestamp: z.number(),
  aggregateId: z.string(),
  eventType: z.string(),
  payload: z.record(z.string(), z.any()),
});
export type EventPayload = z.infer<typeof EventPayloadSchema>;

export class EventBus {
  private handlers: Map<string, Array<(event: EventPayload) => Promise<void>>> = new Map();

  public subscribe(eventType: string, handler: (event: EventPayload) => Promise<void>): void {
    const existing = this.handlers.get(eventType) || [];
    existing.push(handler);
    this.handlers.set(eventType, existing);
  }

  public async publish(event: EventPayload): Promise<void> {
    const validated = EventPayloadSchema.parse(event);
    const eventHandlers = this.handlers.get(validated.eventType) || [];
    for (const handler of eventHandlers) {
      await handler(validated);
    }
  }
}

export class CapabilityEntitlementGraph {
  private capabilities: Map<string, CapabilityState> = new Map();

  constructor(private eventBus: EventBus) {
    this.eventBus.subscribe("SubscriptionUpgraded", async (event: EventPayload) => {
      await this.handleSubscriptionUpgraded(event);
    });
  }

  public getCapabilityState(aggregateId: string): CapabilityState {
    return this.capabilities.get(aggregateId) || "LOCKED";
  }

  public setCapabilityState(aggregateId: string, state: CapabilityState): void {
    this.capabilities.set(aggregateId, CapabilityStateSchema.parse(state));
  }

  private async handleSubscriptionUpgraded(event: EventPayload): Promise<void> {
    const { aggregateId, payload } = event;
    const tier = payload["tier"] as string;
    
    if (tier === "PREMIUM" || tier === "ENTERPRISE") {
      this.setCapabilityState(aggregateId, "ACTIVE");
    }
  }
}

export class BillingGateway {
  constructor(private eventBus: EventBus) {}

  public async upgradeSubscription(aggregateId: string, tier: string): Promise<void> {
    const event: EventPayload = {
      eventId: crypto.randomUUID(),
      timestamp: Date.now(),
      aggregateId,
      eventType: "SubscriptionUpgraded",
      payload: { tier },
    };

    await this.eventBus.publish(event);
  }
}
