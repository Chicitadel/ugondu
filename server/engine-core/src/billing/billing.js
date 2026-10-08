"use strict";
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
  * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Copyright (c) 2026 Air Roofers
 * All Rights Reserved.
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
exports.BillingGateway = exports.CapabilityEntitlementGraph = exports.EventBus = exports.EventPayloadSchema = exports.CapabilityStateSchema = void 0;
const zod_1 = require("zod");
const crypto = __importStar(require("crypto"));
exports.CapabilityStateSchema = zod_1.z.enum(["LOCKED", "ACTIVE", "SUSPENDED"]);
exports.EventPayloadSchema = zod_1.z.object({
    eventId: zod_1.z.string().uuid(),
    timestamp: zod_1.z.number(),
    aggregateId: zod_1.z.string(),
    eventType: zod_1.z.string(),
    payload: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
});
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
exports.EventBus = EventBus;
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
        if (tier === "PREMIUM" || tier === "SOVEREIGN") {
            this.setCapabilityState(aggregateId, "ACTIVE");
        }
    }
}
exports.CapabilityEntitlementGraph = CapabilityEntitlementGraph;
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
exports.BillingGateway = BillingGateway;
