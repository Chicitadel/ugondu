# Data Governance

**Governance Status:** FROZEN
**Version:** 1.0.0

Data Governance (DG) establishes the rules for how data is classified, retained, and shared across the enterprise. It protects against data leaks and ensures compliance with privacy frameworks.

## 1. Canonical Models
All inter-platform communication must adhere strictly to the structures defined in `CANONICAL-MODELS.md`. Platforms may have custom internal database schemas, but their API outputs and event payloads must normalize to the canonical format.

## 2. Data Ownership
Data is strictly owned by its bounded context.
- **Identity Data** (Passwords, PII, Roles) belongs to Identity.
- **Financial Data** (Invoices, Credit Cards) belongs to Billing.
- **Cryptographic Data** (Keys, Activations) belongs to License.
*Direct database access across these boundaries is strictly prohibited.*

## 3. Data Classification
All data must be classified:
- **Public**: Safe for external unauthenticated access (e.g., product marketing copy).
- **Internal**: Safe for all employees (e.g., architecture docs).
- **Confidential**: Restricted to specific teams/roles (e.g., customer support tickets).
- **Restricted**: Highly sensitive, heavily audited, and encrypted at rest (e.g., PII, passwords, payment tokens).

## 4. Privacy & Retention Lifecycle
- **Soft Deletion**: Records should generally be soft-deleted to preserve referential integrity for audits, unless explicitly requested for GDPR/CCPA erasure.
- **Data Erasure (Right to be Forgotten)**: Must be orchestrated across all platforms via the Event Bus (`UserAnonymizationRequested` event).
- **Audit Log Retention**: Minimum 7 years in immutable cold storage.
