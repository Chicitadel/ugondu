# CANONICAL GOVERNANCE MODEL

**Governance Status:** FROZEN
**Version:** 1.0.0
**Classification:** Enterprise Standard

## The Versioned Governance Domain (v1.0)
The Canonical Governance Model is an explicit, versioned domain contract. It is the sole data source for the Governance API, completely decoupling the Operations Platform from raw file-system artifacts (Markdown/YAML).

### 1. `MaturityState`
Represents the exact lifecycle phase of a capability.
- `CapabilityName`
- `CurrentStage` (IC, IC2, RC, PV, GA)
- `PromotedAt`
- `ValidationHash`

### 2. `Baseline`
Represents a frozen architectural state.
- `BaselineId`
- `Version`
- `FrozenContracts`
- `Status`

### 3. `Evidence`
Represents operational and integration verification data.
- `EvidenceId`
- `TargetPhase` (RC, PV)
- `TestMatrixStatus`

### 4. `ADR_Record`
Represents an Architectural Decision Record.
- `ADR_ID`
- `Status` (Proposed, Approved)
- `Impacts`

### 5. `ASI_Score`
Represents the real-time Architecture Stability Index.
- `CapabilityId`
- `Score` (0-100)
- `Violations`

### 6. `Compliance`
Represents adherence to enterprise standards (ISO 27001, SOC 2).
- `FrameworkId`
- `Status` (Compliant, Non-Compliant)

### 7. `Policies`
Represents enforced automation rules (e.g., Read-Oriented API rules).
- `PolicyId`
- `RuleSet`

### 8. `Release`
Represents a promoted deployment candidate.
- `ReleaseVersion`
- `TargetEnvironment`
