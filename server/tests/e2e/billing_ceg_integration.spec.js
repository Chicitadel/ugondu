__t('use_strict');
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
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
const shared_1 = require("@ugondu/shared");
// --- Domain Models & Schemas ---
// --- Mocks & Core System Representations ---
const billing_1 = require("../../engine-core/src/billing/billing");
// --- E2E Integration Test Suite ---
describe("Billing & Capability Entitlement Graph (CEG) Integration", () => {
    let eventBus;
    let ceg;
    let billingGateway;
    beforeEach(() => {
        eventBus = new billing_1.EventBus();
        ceg = new billing_1.CapabilityEntitlementGraph(eventBus);
        billingGateway = new billing_1.BillingGateway(eventBus);
    });
    it((0, shared_1.__t)('should_transition_capability_f'), async () => {
        // 1. Setup: Define a target aggregate ID representing a customer subscription.
        const customerId = "cust_5f8a91b2c3d4";
        // 2. Initial State Assertion: Ensure the capability is initially LOCKED.
        ceg.setCapabilityState(customerId, "LOCKED");
        expect(ceg.getCapabilityState(customerId)).toBe("LOCKED");
        // 3. Action: Billing Gateway processes an upgrade and emits the event.
        await billingGateway.upgradeSubscription(customerId, "SOVEREIGN");
        // 4. Verification: CEG should have processed the event and activated the capability.
        const newState = ceg.getCapabilityState(customerId);
        expect(newState).toBe("ACTIVE");
    });
    it((0, shared_1.__t)('should_not_activate_capability'), async () => {
        const customerId = "cust_7e6b5c4d3a2";
        ceg.setCapabilityState(customerId, "LOCKED");
        expect(ceg.getCapabilityState(customerId)).toBe("LOCKED");
        await billingGateway.upgradeSubscription(customerId, "BASIC");
        const newState = ceg.getCapabilityState(customerId);
        expect(newState).toBe("LOCKED"); // Remains locked as tier is basic
    });
});
