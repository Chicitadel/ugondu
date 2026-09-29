# CORP Change Control Process

**Version**: 1.0.0 | **Owner**: Platform Engineering Authority | **Status**: ACTIVE

## Principles

1. **No stream scope change** without a registered Decision Record (DECISION_REGISTER.md).
2. **No new top-level stream** without an Architecture Review Record (ARR) approved by the Freeze Governance Board.
3. **No Phase gate advance** without documented exit criteria verification.
4. **All technical debt** must be registered before it is resolved.

## Change Types

| Type | Process | Authority |
|------|---------|-----------|
| Bug fix within existing stream | PR + review | Stream Owner |
| Stream scope extension | Decision Record + ADR | Architecture Authority |
| New stream proposal | ARR submission | Freeze Governance Board |
| Phase gate advancement | Exit criteria evidence package | Platform Engineering Authority |
| Constitutional change | ARR + extraordinary justification + board vote | Governance Authority |

## Change Flow

```
Change Identified
      │
      ▼
Register in DECISION_REGISTER.md or TECHNICAL_DEBT_REGISTER.md
      │
      ▼
Implement in correct stream
      │
      ▼
Automated verification passes
      │
      ▼
Phase gate evidence package updated
      │
      ▼
Governance Authority sign-off
```

*Copyright (c) 2026 Ujomor Systems & Enterprise Governance. All Rights Reserved.*
