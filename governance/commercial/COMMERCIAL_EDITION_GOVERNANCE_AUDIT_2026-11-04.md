# Commercial Edition, Subscriber Eligibility, Entitlement and Unit-Economics Audit

**Project:** Ugondu  
**Repository:** `Chicitadel/ugondu`  
**Audit baseline:** `main` at the time of inspection  
**Audit branch:** `audit/commercial-edition-governance-2026-11-04`  
**Date:** 2026-11-04  
**Status:** Repository evidence review and authoritative implementation blueprint; physical code changes and CI execution are not claimed by this document.

## 1. Executive decision

Preserve and reconcile the edition matrix already present in the repository. Do not create a second edition catalogue, duplicate capability registry, or product-local pricing authority.

The commercial model must distinguish:

1. **Subscriber identity and verified organisation class** — who the subscriber legally is.
2. **Purchased edition** — the commercial package selected.
3. **Entitlements** — the exact capabilities and limits granted by that edition and any approved add-ons.
4. **Pricing offer** — amount, currency, billing interval, regional terms and effective dates.
5. **Usage and cost controls** — measured consumption, quotas, limits and cost-to-serve.

A government or regulated customer may purchase a lower edition when its required operations are fully covered. It must not be forced into a more expensive edition merely because of its organisation type. However, it may not claim capabilities, certifications, deployment guarantees or sovereign controls that are absent from the purchased edition.

## 2. Repository evidence and discrepancies

### 2.1 Edition vocabulary is inconsistent

Verified source evidence:

| Source | Edition vocabulary / behaviour | Finding |
|---|---|---|
| `docs/EDITIONS.md` | Community Edition, Professional Edition, Enterprise Edition | Human-facing commercial guide defines three editions. |
| `docs/strategy/product-market-optimization.md` | Community, Professional, Business, Enterprise/Sovereign | Strategy describes a broader four-level progression, with Enterprise/Sovereign combined. |
| `server/shared/schemas/envelope.v1.json` | `community`, `professional`, `business`, `enterprise`, `sovereign` | Execution contract accepts five edition identifiers. |
| `server/billing-gateway/src/index.ts` | COMMUNITY, PROFESSIONAL, ENTERPRISE | Runtime billing gateway defines only three edition constants and derives a small hard-coded capability object. |
| `server/billing-gateway/src/db.ts` | Token, tenant ID, edition, creation timestamp | Local cache does not model verified organisation class, offer, subscription, entitlement version, expiry, revocation or usage plan. |

**Finding UG-COM-001 — Critical catalogue drift:** the schema, strategy, user-facing edition guide and runtime gateway do not share one canonical edition/capability source. The gateway cannot currently resolve all edition identifiers accepted by the execution envelope.

**Required action:** reconcile these sources against the repository's authoritative Product Registry contract. Keep the existing canonical names where already approved. Treat `docs/EDITIONS.md` as descriptive documentation, not a second runtime authority.

### 2.2 Runtime billing gateway is not a complete entitlement authority

In `server/billing-gateway/src/index.ts`:

- edition names are declared locally;
- capability values are calculated by nested conditionals;
- Professional and Enterprise are differentiated through plugin count, rollback, atomic deployment and telemetry booleans;
- Identity Authority response field `subscriptionTier` is consumed;
- a successful response with a missing tier can fall back to Community;
- no verified subscriber-group / legal-entity binding is visible in the returned authorization contract.

**Finding UG-COM-002 — Incomplete commercial policy resolution:** edition capability decisions are duplicated in service code instead of being resolved from a versioned registry and entitlement authority.

**Finding UG-COM-003 — Missing edition resolution must not silently become Community:** an absent, unknown, stale or malformed subscription tier is an authorization-data integrity failure. It must be denied or routed to a formally defined free/no-subscription state only when that state is explicitly verified by the authority.

### 2.3 Local token cache requires lifecycle hardening

`server/billing-gateway/src/db.ts` persists token records in a JSON file. The inspected record shape contains a raw token, tenant ID, edition and creation time.

Required controls:

- never persist raw bearer tokens where a token hash / opaque reference is sufficient;
- bind cache entries to subscription ID, tenant ID, verified organisation ID, edition ID, entitlement version and validity window;
- support revocation, suspension, cancellation, expiry and replay-safe refresh;
- use atomic persistence, file permissions and corruption detection if a local cache remains necessary;
- keep cache strictly subordinate to Mandatag / Identity Authority;
- never allow cache contents to grant a higher edition or broader capability than the current signed authority response.

### 2.4 Existing tests do not qualify the whole matrix

`tests/billing-gateway.test.js` checks missing token, Community, Professional and Enterprise. The Community test accepts either HTTP 200 or 402. Professional and Enterprise tests treat authority unavailability as a successful skip.

**Finding UG-COM-004 — Insufficient commercial qualification:** Business and Sovereign are not covered; group eligibility, edition hierarchy, expiry, revocation, downgrade, tenant isolation, stale cache and fail-closed authority outage are not asserted. A skipped integration test must be reported as UNVERIFIED, not PASS.

### 2.5 Existing federation architecture is the correct boundary

The repository's Product Platform governance states that Product Registry owns edition definitions and feature flags, while Billing consumes registry pricing structures and License consumes edition constraints. Existing platform interaction and handover records also establish AeroBill as the pricing/billing authority and Mandatag as the entitlement/licensing authority.

**Decision:** do not move billing, pricing, group verification or licensing rules into Ugondu's deployment engine. Ugondu should consume signed, scoped entitlements and enforce them at the server execution boundary.

## 3. Target commercial and eligibility model

### 3.1 Two-key authorisation

A capability is available only when both conditions are true:

`ALLOW = ACTIVE_SUBSCRIPTION ∧ EDITION_HAS_CAPABILITY ∧ VERIFIED_GROUP_ELIGIBLE ∧ POLICY_PERMITS`

The verified group is not inferred from a user-selected dropdown, email suffix, UI role, workspace label or request-body field.

Subscriber classes may include, where supported by the canonical registry:

- individual developer;
- agency / software delivery provider;
- business / enterprise software operator;
- managed service provider;
- public authority / government;
- regulated or sovereign operator.

The group classification controls eligibility for restricted commercial capabilities and contractual claims. It must not force a verified organisation to buy the most expensive edition if the lower edition meets its requirements.

### 3.2 Organisation proof and anti-impersonation controls

Mandatag / the trusted identity authority must bind the entitlement to:

- immutable organisation / legal-entity identifier;
- verified legal name and jurisdiction;
- organisation class and verification status;
- tenant and workspace IDs;
- subscription and purchased edition;
- allowed product and capability identifiers;
- validity, renewal and revocation state;
- entitlement version and issuer;
- any deployment / data-residency restrictions.

Evidence may include authoritative company or public-body registration, validated domain control as supporting evidence, procurement/contract references, approved issuer attestations and human review for high-impact public-sector claims. Domain possession alone is not proof that an organisation is a ministry or sovereign authority.

A user may administer an organisation only through a verified membership / delegated-authority relationship. A subscriber cannot change its own organisation class or entitlement by editing a client payload.

### 3.3 Edition hierarchy and unique value

Preserve existing canonical edition IDs and matrix rows. Reconcile their hierarchy to the following semantics without inventing duplicate editions:

- Entry / Community: safe baseline functionality and bounded personal or project use.
- Professional: production deployment capabilities for individuals and small delivery teams.
- Business: multi-project / multi-workspace operations, collaboration and team governance, if already present in the canonical matrix.
- Enterprise: organisation-wide governance, advanced controls, audit and contracted support.
- Sovereign: strictest deployment, data-control, private/isolated operation, advanced key custody and sovereign operational controls, where the existing matrix defines them.

Higher editions inherit lower-edition capabilities additively, unless a legal, technical or security policy explicitly excludes a capability. Each vertical / customer-specific pack must retain exclusive capabilities; do not scatter Education-, Government-, or other vertical-only capabilities across every edition merely to make the comparison table look generous.

For Ugondu, the unique capability differentiators should remain grounded in its actual product: deployment targets, atomic strategy, rollback depth, plugin limits and isolation, workspaces, policy/approval, audit evidence, SSO, private registry, air-gap and key custody. Do not add unrelated Dumcholu vertical capabilities to Ugondu.

### 3.4 Downgrade and upgrade semantics

- A verified government or enterprise customer may purchase any edition for which its intended use is eligible.
- Buying a lower edition does not confer Business, Enterprise or Sovereign-only features.
- A downgrade must not silently destroy data or delete historical deployment evidence.
- On downgrade, block new use of excluded capabilities, preserve export/read access where contract and security policy permit, and provide a clear migration/grace process.
- Sovereign deployment claims must be unavailable unless the actual deployment topology, data controls, key custody, support and contract meet the Sovereign profile.
- An add-on may extend a package only if the canonical registry explicitly permits that combination; add-ons must not bypass mandatory edition or organisation eligibility.

## 4. Pricing and sustainability guardrails

No final price should be committed until actual Ugondu usage and infrastructure costs are measured. The previous `$X/month` placeholder is not a price.

### 4.1 Cost model

For each edition and pricing region, calculate:

`FullyLoadedMonthlyCost = AllocatedFixedCost + VariableUsageCost + SupportCost + RiskReserve`

Variable usage must include, where applicable:

- compute and execution time;
- storage, artifact retention and backup;
- network egress and transfer;
- third-party APIs and provider charges;
- plugin sandbox resources;
- observability, audit retention and security services;
- payment processing, tax administration and reseller fees.

Allocated fixed cost must include baseline hosting, engineering and operations allocation, security maintenance, compliance, incident response and customer support.

### 4.2 Minimum viable price

`PriceFloor = FullyLoadedMonthlyCost / (1 - TargetGrossMargin)`

Set a target gross margin by segment and risk class. Model best/base/stress usage, not only average consumption. A plan must not be launched if a realistic high-usage customer can create unbounded loss.

Use included quotas, fair-use limits, overage pricing or usage-based add-ons for expensive resources. Provide hard tenant-level budgets, rate limits, concurrency limits and cost alerts. Do not silently degrade security or reliability when a quota is reached.

### 4.3 Commercial offer separation

AeroBill owns price offers:

- product ID and canonical edition ID;
- SKU / offer ID;
- currency and region;
- amount and billing interval;
- included quota and metered rates;
- tax treatment;
- effective dates and version;
- discount / promotion / reseller terms;
- contract and renewal rules.

Mandatag owns the signed entitlement resulting from the paid or approved contract. Ugondu consumes it. Prices and exchange rates must not be embedded in binaries or capability code.

## 5. Required implementation architecture

1. **Product Registry:** canonical product, edition, capability, hierarchy, vertical pack, group eligibility and edition version.
2. **Organisation / Identity Authority:** verified organisation identity, group classification, membership and delegated authority.
3. **AeroBill:** offer catalogue, checkout, subscriptions, invoices, tax, usage accounting and cost guardrails.
4. **Mandatag:** signed entitlement, capability claims, validity, revocation, group binding and offline policy.
5. **Ugondu billing gateway:** thin adapter / policy-enforcement client; no local edition catalogue or price calculations.
6. **Engine Core:** verify the authority-issued entitlement and enforce capabilities server-side before compiling a signed execution recipe.
7. **Thin client:** display available features and explain denials; never decide entitlement.

The signed execution envelope should bind at minimum: tenant, organisation, workspace, project, target, edition ID/version, capability set/hash, entitlement ID/version, policy version, issued/expiry timestamps, nonce, execution plan hash and signer key ID. The server must reject mismatched tenant, organisation, project or target context.

## 6. Required tests and COR acceptance criteria

- Canonical edition IDs in docs, Product Registry, entitlement authority, gateway, execution envelope and UI are identical.
- Every matrix capability has one stable capability ID, one owning domain and positive/negative tests.
- Business and Sovereign are not silently downgraded to Community or Enterprise.
- Verified organisation class cannot be forged by a client request.
- A government organisation may subscribe to a lower eligible edition without being misclassified as a commercial company.
- A lower edition cannot obtain a higher-tier capability by changing edition text, token prefix, tenant ID, workspace ID or API payload.
- Expired, revoked, suspended, unknown and malformed entitlements fail closed.
- Authority outage follows the approved offline policy; cached state cannot extend expiry or override revocation beyond a documented, signed bounded policy.
- Downgrade and cancellation preserve permitted records and block excluded new operations.
- Quota exhaustion, concurrent requests, retries and duplicate usage events are idempotent and cost-bounded.
- Price changes do not mutate existing contract terms.
- No price, exchange rate or plan amount is hardcoded in Ugondu binaries.
- Tests cover all editions, all restricted capability families, all organisation classes and negative impersonation cases.
- CI records PASS / FAIL / BLOCKED / UNVERIFIED honestly. Skipped tests do not pass.

## 7. Implementation sequence

**P0 — Reconcile truth:** diff `docs/EDITIONS.md`, strategy matrix, envelope enum, gateway, tests and Product Registry; approve one canonical edition/capability matrix.

**P1 — Authority contracts:** define versioned organisation classification, eligibility, edition and capability claims with Mandatag/Product Registry/AeroBill owners.

**P2 — Runtime enforcement:** remove local edition decisions and fail-open defaults; verify signed claims in Engine Core; bind claims to tenant/workspace/target.

**P3 — Cost protection:** meter actual resource usage, enforce tenant budgets and establish cost-based price floors in AeroBill.

**P4 — Qualification:** implement the positive/negative matrix and run all tests against the same commit.

**P5 — Publication:** generate customer-facing edition comparison and pricing pages from the canonical registries, never manually duplicated markdown tables.

## 8. Evidence reviewed

- `docs/EDITIONS.md`
- `docs/strategy/product-market-optimization.md`
- `server/shared/schemas/envelope.v1.json`
- `server/billing-gateway/src/index.ts`
- `server/billing-gateway/src/db.ts`
- `tests/billing-gateway.test.js`
- `.governance/platform/policies/PRODUCTS-PLATFORM.md`
- `.governance/platform/contracts/PLATFORM-APIS.md`
- `governance/handover/AIR_ROOFERS_DUAL_PRODUCT_COR_MASTER_HANDOVER_2026-10-31.md`

## 9. Completion statement

This commit is an audit/implementation blueprint only. It does not claim that runtime code, database migrations, CI tests, commercial prices or production entitlements have been implemented or certified. The physical implementation must follow the sequence above and attach test evidence to the exact implementation commit.
