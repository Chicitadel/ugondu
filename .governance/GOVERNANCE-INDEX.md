# Air Roofers Enterprise Governance Framework

**Governance Status:** FROZEN
**Version:** 1.0.0

This index serves as the central map to the Enterprise Operating Model.

## Architecture Governance (AG)
*Constitutional layer defining structural boundaries.*
- [ADR Template](./architecture/adr/ADR-TEMPLATE.md)
- [Platform Topology](./architecture/policies/PLATFORM-TOPOLOGY.md)
- [Platform Ownership](./architecture/policies/PLATFORM-OWNERSHIP.md)
- [Platform Interactions](./architecture/policies/PLATFORM-INTERACTIONS.md)
- [Event Validation Standards](./platform/standards/EVENT-VALIDATION.md)
- [CSEP Orchestration](./architecture/policies/CSEP-ORCHESTRATION.md)
- [Platform Orchestration](./architecture/policies/PLATFORM-ORCHESTRATION.md)
- [Execution Planning Standard](./architecture/policies/EXECUTION-PLANNING.md)
- [Universal PEP Taxonomy](./architecture/policies/UNIVERSAL-PEP-TAXONOMY.md)

### Architectural Layers
1. **Infrastructure**: `operations`, `telemetry`, `edge`, `platform-core` (Shared technical foundation)
2. **Core Services**: `identity`, `products`, `license`, `billing` (Reusable business capabilities)
3. **Experience**: `portal`, `hub` (Customer and staff interfaces)
4. **Products**: `consunexia`, `mediadna`, `civiscore`, `dirstruct` (The actual products the company sells)

*Rule: Architecture documents are immutable after an Architecture Baseline release unless an approved ADR supersedes them.*

## Platform Governance (PG)
*Rules for platform interoperability.*
- [Platform APIs](./platform/contracts/PLATFORM-APIS.md)
- [Event Contracts](./platform/contracts/EVENT-CONTRACTS.md)
- [Error Model](./platform/policies/ERROR-MODEL.md)
- [Products Platform](./platform/policies/PRODUCTS-PLATFORM.md)
- [Certification Checklist](./platform/certification/CERTIFICATION-CHECKLIST.md)

## Release Governance (RG)
*The software delivery lifecycle.*
- [Release Lifecycle](./release/policies/RELEASE-LIFECYCLE.md)
- [Branch Protection Policy](./policies/BRANCH_PROTECTION_POLICY.md)

## Security Governance (SG)
*Centralized security requirements.*
- [Security Profiles](./security/policies/SECURITY-PROFILES.md)

## Operational Governance (OG)
*Operating the platform post-release.*
- [Operational Readiness](./operations/policies/OPERATIONAL-READINESS.md)
- [Observability Standard](./operations/policies/OBSERVABILITY-STANDARD.md)

## Data Governance (DG)
*Data ownership, retention, and semantics.*
- [Canonical Models](./data/contracts/CANONICAL-MODELS.md)
- [Data Lifecycle](./data/policies/DATA-LIFECYCLE.md)

---

## Platform Maturity Levels
As platforms traverse the ecosystem, they are assessed by the following maturity model:
- **Level 0**: Concept
- **Level 1**: Governed
- **Level 2**: Contract Certified
- **Level 3**: Reference Implementation
- **Level 4**: Production Validated (Successfully deployed, telemetry healthy, operational readiness passed)
- **Level 5**: Enterprise Proven (Reserved exclusively for the platform ecosystem as a whole)
