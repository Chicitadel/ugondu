# CSEP Orchestration Principle

**Governance Status:** FROZEN
**Version:** 1.0.0
**Target Area:** `portal.airroofers.eu` (Customer Success & Experience Platform)

## 1. Core Principle
The **Customer Success & Experience Platform (CSEP)** is an **Orchestrator**, not a System of Record. 

**Rule: CSEP orchestrates; it does not own core business domains.**

## 2. Orchestration Model
CSEP is responsible for composing the unified customer experience across the Air Roofers platform. It must dynamically fetch data and trigger actions by strictly relying on the underlying Platform Layer. 

It MUST NOT duplicate any underlying business logic.

### Example Flow: Customer Viewing Subscriptions
When a customer views their subscriptions within the CSEP portal, the orchestrator triggers the following flow sequentially or via aggregation:

1. **Identity (`identity.airroofers.eu`)**: Verifies the session and asserts authorization.
2. **Products (`products.airroofers.eu`)**: Resolves the product metadata, display details, and feature capabilities.
3. **License (`license.airroofers.eu`)**: Validates the active cryptographic entitlement.
4. **Billing (`billing.airroofers.eu`)**: Retrieves the subscription plan, invoices, and billing lifecycle state.
5. **Downloads (`downloads.airroofers.eu`)**: Fetches authorized installer links based on the entitlements.
6. **Support (`support/hub`)**: Links to entitled SLA capabilities or tickets.
7. **Operations (`operations.airroofers.eu`)**: Fetches platform status and health metrics for the specific product.

## 3. Strict Prohibitions
- CSEP MUST NOT maintain its own product mapping or pricing logic.
- CSEP MUST NOT maintain its own local database for licenses, invoices, or identity records (it may cache temporarily, but the source of truth remains the platform APIs).
- CSEP MUST NOT implement billing state machines or cryptographic licensing validations directly. It must delegate to AeroBill and Mandatag respectively.
