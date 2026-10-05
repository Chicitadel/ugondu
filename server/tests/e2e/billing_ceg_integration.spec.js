'use strict';
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Tests
 * File           : billing_ceg_integration.spec.ts
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventPayloadSchema = exports.CapabilityStateSchema = void 0;
const zod_1 = require("zod");
const crypto = __importStar(require("crypto"));
// --- Domain Models & Schemas ---
exports.CapabilityStateSchema = zod_1.z.enum(["LOCKED", "ACTIVE", "SUSPENDED"]);
exports.EventPayloadSchema = zod_1.z.object({
    eventId: zod_1.z.string().uuid(),
    timestamp: zod_1.z.number(),
    aggregateId: zod_1.z.string(),
    eventType: zod_1.z.string(),
    payload: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
});
/**
 * Event Bus interface for publishing and subscribing to domain events.
 */
class EventBus {
    constructor() {
        this.handlers = new Map();
    }
    subscribe(eventType, handler) {
        const existing = this.handlers.get(eventType) || [];
        existing.push(handler);
        this.handlers.set(eventType, existing);
    }
    async publish(event) {
        const validated = exports.EventPayloadSchema.parse(event);
        const eventHandlers = this.handlers.get(validated.eventType) || [];
        for (const handler of eventHandlers) {
            await handler(validated);
        }
    }
}
/**
 * Capability Entitlement Graph (CEG)
 * Manages the state of capabilities for users/organizations.
 */
class CapabilityEntitlementGraph {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.capabilities = new Map();
        this.eventBus.subscribe("SubscriptionUpgraded", async (event) => {
            await this.handleSubscriptionUpgraded(event);
        });
    }
    getCapabilityState(aggregateId) {
        return this.capabilities.get(aggregateId) || "LOCKED";
    }
    setCapabilityState(aggregateId, state) {
        this.capabilities.set(aggregateId, exports.CapabilityStateSchema.parse(state));
    }
    async handleSubscriptionUpgraded(event) {
        const { aggregateId, payload } = event;
        const tier = payload["tier"];
        if (tier === "PREMIUM" || tier === "ENTERPRISE") {
            this.setCapabilityState(aggregateId, "ACTIVE");
        }
    }
}
/**
 * Billing Gateway
 * Emits billing-related events into the Event Bus.
 */
class BillingGateway {
    constructor(eventBus) {
        this.eventBus = eventBus;
    }
    async upgradeSubscription(aggregateId, tier) {
        const event = {
            eventId: crypto.randomUUID(),
            timestamp: Date.now(),
            aggregateId,
            eventType: "SubscriptionUpgraded",
            payload: { tier },
        };
        await this.eventBus.publish(event);
    }
}
// --- E2E Integration Test Suite ---
describe("Billing & Capability Entitlement Graph (CEG) Integration", () => {
    let eventBus;
    let ceg;
    let billingGateway;
    beforeEach(() => {
        eventBus = new EventBus();
        ceg = new CapabilityEntitlementGraph(eventBus);
        billingGateway = new BillingGateway(eventBus);
    });
    it(__t('should_transition_capability_f'), async () => {
        // 1. Setup: Define a target aggregate ID representing a customer subscription.
        const customerId = "cust_5f8a91b2c3d4";
        // 2. Initial State Assertion: Ensure the capability is initially LOCKED.
        ceg.setCapabilityState(customerId, "LOCKED");
        expect(ceg.getCapabilityState(customerId)).toBe("LOCKED");
        // 3. Action: Billing Gateway processes an upgrade and emits the event.
        await billingGateway.upgradeSubscription(customerId, "ENTERPRISE");
        // 4. Verification: CEG should have processed the event and activated the capability.
        const newState = ceg.getCapabilityState(customerId);
        expect(newState).toBe("ACTIVE");
    });
    it(__t('should_not_activate_capability'), async () => {
        const customerId = "cust_7e6b5c4d3a2";
        ceg.setCapabilityState(customerId, "LOCKED");
        expect(ceg.getCapabilityState(customerId)).toBe("LOCKED");
        await billingGateway.upgradeSubscription(customerId, "BASIC");
        const newState = ceg.getCapabilityState(customerId);
        expect(newState).toBe("LOCKED"); // Remains locked as tier is basic
    });
});
