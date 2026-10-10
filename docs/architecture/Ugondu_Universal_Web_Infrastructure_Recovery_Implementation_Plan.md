# Ugondu Universal Web-Origin Failure Recovery
## Full Universal Implementation Plan

**Status:** Proposed implementation baseline  
**Capability:** Universal Web Infrastructure Recovery  
**Initial conformance incident:** Jemaquille HTTP 500 / Apache internal redirect recursion  
**Objective:** Detect, diagnose, repair, verify, rollback and certify web-origin configuration failures across supported hosting panels, web servers, reverse proxies, CDNs and managed hosting environments.

---

## 1. Executive Decision

Ugondu should implement this as a **provider-neutral Web Infrastructure Recovery subsystem**, not as a DirectAdmin feature.

The core invariant is:

> Diagnose the actual serving path, identify the authoritative configuration layer responsible for the observed failure, compute the smallest safe reversible mutation, execute only through typed provider capabilities, independently verify the externally observable result, and produce cryptographically attributable evidence.

The Jemaquille incident is the first concrete conformance case. The current evidence shows a static file failure and repeated Apache `AH00124` internal redirect recursion, while DirectAdmin Force Redirect and Force SSL are disabled. The exact offending configuration still must be discovered before mutation.

Ugondu must therefore generalize the **failure class**, not hard-code a "remove redirect" fix.

---

# 2. Scope

### Hosting panels
- DirectAdmin
- cPanel / WHM
- Plesk
- Generic documented panel/API adapters
- Future panel adapters through the same canonical interface

### Web servers
- Apache HTTP Server
- nginx
- LiteSpeed Enterprise
- OpenLiteSpeed
- Microsoft IIS
- Future supported servers

### Edge/proxy layers
- Cloudflare
- AWS CloudFront
- AWS Application Load Balancer
- Generic reverse proxies/CDNs

### Hosting models
- Shared hosting
- VPS
- Dedicated servers
- Cloud instances
- Containers
- Kubernetes ingress/origin deployments
- Managed hosting
- Multi-layer proxy → web server → application stacks

### Failure classes
- HTTP redirect loops
- internal rewrite recursion
- HTTP/HTTPS mismatch
- www/non-www cycles
- proxy/origin protocol mismatch
- Host-header mismatch
- canonical-host mismatch
- duplicate/conflicting redirect policies
- panel/application redirect conflicts
- CDN/origin redirect conflicts
- broken virtual-host selection
- wrong document root
- wrong subdomain document root
- domain-pointer/alias cycles
- stale/generated configuration
- malformed Apache/nginx/LiteSpeed/IIS rules
- SSL virtual-host mismatch
- certificate/hostname mismatch
- HSTS-related failures
- error-document recursion
- application-generated redirect loops
- framework base-URL mismatch
- reverse-proxy trust/proto-header mismatch
- configuration drift
- edge/origin inconsistency

---

# 3. Non-Goals

Ugondu must never blindly:
- delete `.htaccess`;
- disable HTTPS;
- disable redirects;
- change DNS/nameservers;
- chmod files to 777;
- change ownership;
- change PHP versions;
- restart all services;
- rebuild unrelated hosting configuration;
- execute arbitrary shell commands supplied by AI;
- assume HTTP 500 is application-code failure;
- assume `.htaccess` is responsible;
- patch generated configuration when an authoritative source exists;
- mutate when root cause, ownership, scope, rollback or verification is unknown;
- report PASS merely because a command completed.

---

# 4. Canonical Architecture

```text
Observed Failure
      ↓
Environment Twin / Reality Refresh
      ↓
Serving-Path Reconstruction
      ↓
Failure Classification
      ↓
Root-Cause Analysis
      ↓
Candidate Remediation
      ↓
Policy + Blast-Radius Gate
      ↓
Recovery Contract
      ↓
Immutable Pre-Change Snapshot
      ↓
Resource Lock
      ↓
Typed Provider Mutation
      ↓
Configuration Validation
      ↓
Regeneration / Reload
      ↓
Independent External Verification
      ↓
Drift Reconciliation
      ↓
Rollback if verification fails
      ↓
Evidence
      ↓
Recovery Certificate / Delivery Passport
```

AI may assist with evidence interpretation and hypothesis generation, but it must submit intents through the same deterministic execution pipeline.

---

### **Universal Authority Integration**

Every WebInfrastructureRecovery operation MUST declare:
- capability
- provider
- operation
- target scope
- required authority
- authority acquisition method
- minimum privilege
- resource boundaries
- mutation risk
- rollback authority
- verification authority
- credential lifetime
- approval requirement
- evidence requirements

The universal recovery engine MUST NEVER contain provider-specific credentials or provider-specific permission semantics.
Provider adapters MUST translate canonical typed actions into provider-native authority requirements.
Authority calculators MUST generate one bounded authority bundle for the complete execution plan rather than escalating individual permissions reactively during execution.

# 5. Capability Family

Create:

```text
WebInfrastructureRecovery
```

with:

```text
WebOriginDiscovery
WebServingPathDiscovery
WebConfigurationInspection
WebRedirectAnalysis
WebRewriteAnalysis
WebVirtualHostAnalysis
WebSSLAnalysis
WebDocumentRootAnalysis
WebProxyAnalysis
WebConfigurationRepair
WebConfigurationRegeneration
WebServiceReload
WebExternalVerification
WebRecoveryRollback
WebRecoveryCertification
```

---

# 6. Provider Adapter Contract

Core logic must not depend directly on any vendor.

Conceptual interface:

```typescript
interface WebInfrastructureAdapter {
  identifyTarget(): Promise<TargetIdentity>;
  discoverDomain(domain: DomainRef): Promise<DomainState>;
  discoverServingPath(domain: DomainRef): Promise<ServingPath>;
  getRedirectConfiguration(domain: DomainRef): Promise<RedirectState>;
  getRewriteConfiguration(domain: DomainRef): Promise<RewriteState>;
  getVirtualHostConfiguration(domain: DomainRef): Promise<VirtualHostState>;
  getSslConfiguration(domain: DomainRef): Promise<SslState>;
  getDocumentRoot(domain: DomainRef): Promise<DocumentRootState>;
  getProxyConfiguration(domain: DomainRef): Promise<ProxyState>;
  getRelevantLogs(domain: DomainRef): Promise<LogEvidence>;
  validateConfiguration(mutation: ConfigurationMutation): Promise<ValidationResult>;
  snapshot(scope: RecoveryScope): Promise<RecoverySnapshot>;
  apply(mutation: ConfigurationMutation): Promise<MutationReceipt>;
  regenerateConfiguration(scope: RecoveryScope): Promise<RegenerationReceipt>;
  reload(scope: RecoveryScope): Promise<ReloadReceipt>;
  rollback(snapshot: RecoverySnapshot): Promise<RollbackReceipt>;
  verify(plan: VerificationPlan): Promise<VerificationResult>;
}
```

---

# 7. DirectAdmin Adapter

First concrete panel adapter.

Inspect:
- domain existence/state;
- document root;
- SSL;
- Force Redirect;
- Force SSL;
- redirects;
- pointers/aliases;
- subdomains;
- custom HTTPD configuration;
- generated VirtualHost configuration where permitted;
- web-server type;
- relevant logs.

Canonical actions:

```text
DirectAdmin.GetDomain
DirectAdmin.GetDomainSettings
DirectAdmin.GetDomainRedirects
DirectAdmin.GetDomainPointers
DirectAdmin.GetSubdomains
DirectAdmin.GetSslSettings
DirectAdmin.GetWebServerType
DirectAdmin.GetCustomHttpdConfig
DirectAdmin.GetGeneratedHttpdConfig
DirectAdmin.GetDocumentRoot
DirectAdmin.ValidateDomainConfiguration
DirectAdmin.RewriteDomainConfiguration
DirectAdmin.ReloadWebService
DirectAdmin.GetDomainLogs
```

Prefer documented API operations over browser automation.

DirectAdmin documents both per-domain custom HTTPD configuration and generated VirtualHost configuration, so the adapter must distinguish panel-declared state from effective web-server state. citeturn0search1turn0search3

---

# 8. cPanel / WHM Adapter

Canonical actions:

```text
Cpanel.GetDomain
Cpanel.GetRedirects
Cpanel.GetAliases
Cpanel.GetSubdomains
Cpanel.GetDocumentRoot
Cpanel.GetSslState
Cpanel.GetWebServerState
Cpanel.GetHtaccess
Cpanel.GetApacheConfiguration
Cpanel.ValidateConfiguration
Cpanel.ApplyRedirectMutation
Cpanel.RebuildConfiguration
Cpanel.ReloadWebService
Cpanel.GetLogs
```

The adapter must distinguish panel redirects from `.htaccess`, generated Apache configuration and application redirects. cPanel documents that its Redirects interface can materialize redirect rules into `.htaccess`. citeturn0search9

---

# 9. Plesk Adapter

Canonical actions:

```text
Plesk.GetDomain
Plesk.GetHostingSettings
Plesk.GetPreferredDomain
Plesk.GetForwarding
Plesk.GetApacheSettings
Plesk.GetNginxSettings
Plesk.GetSslRedirect
Plesk.GetDocumentRoot
Plesk.GetVirtualHostConfiguration
Plesk.GetRewriteConfiguration
Plesk.ValidateConfiguration
Plesk.ApplyConfiguration
Plesk.ReloadConfiguration
Plesk.GetLogs
```

The adapter must discover whether the domain is served by:
- nginx + Apache;
- nginx only;
- Apache only.

Plesk exposes domain-level Apache/nginx settings and generated configuration under the domain's system configuration. citeturn0search0turn0search8

---

# 10. Generic Apache Adapter

Support environments without a panel.

Inspect:
- `apachectl -S`;
- `apachectl -t`;
- effective VirtualHosts;
- rewrite configuration;
- `.htaccess`;
- SSL VirtualHosts;
- document roots;
- error/access logs;
- proxy headers.

The adapter must not assume Apache is the frontmost layer.

---

# 11. Generic nginx Adapter

Inspect:
- `nginx -t`;
- effective configuration;
- server blocks;
- locations;
- rewrite/return directives;
- proxy_pass;
- proxy headers;
- `X-Forwarded-Proto`;
- `X-Forwarded-Host`;
- Host;
- TLS configuration;
- document roots;
- error documents;
- include graph.

---

# 12. LiteSpeed / OpenLiteSpeed Adapter

Inspect:
- listeners;
- virtual hosts;
- contexts;
- rewrite engine;
- rewrite rules;
- SSL;
- document root;
- proxy configuration;
- generated panel configuration;
- logs.

Do not assume byte-for-byte Apache equivalence. LiteSpeed documents differences in rewrite processing semantics. citeturn0search4

---

# 13. IIS Adapter

Support:
- `web.config`;
- URL Rewrite;
- bindings;
- host headers;
- HTTPS bindings;
- redirect modules;
- application pools;
- site root;
- reverse proxy/ARR;
- IIS logs.

---

# 14. Edge / CDN Adapters

Inspect:
- DNS;
- proxy status;
- SSL mode;
- redirect rules;
- origin rules;
- workers/functions;
- cache behavior;
- origin hostname;
- host-header behavior.

The canonical path may be:

```text
Client
 ↓
CDN
 ↓
Load Balancer
 ↓
Reverse Proxy
 ↓
Web Server
 ↓
Application
 ↓
Filesystem
```

The failure may occur at any edge.

---

# 15. Serving-Path Graph

Build an evidence-backed graph:

```text
https://domain/
      ↓
CDN/proxy
      ↓
origin IP
      ↓
listener
      ↓
VirtualHost/server block
      ↓
document root
      ↓
requested file/application
```

Every edge must contain evidence.

---

# 16. Redirect and Rewrite Graphs

Normalize redirects/rewrite rules into graph edges:

```text
source
target
scheme
hostname
port
path
query
layer
mechanism
status
rule_id
evidence
```

Detect cycles such as:

```text
http://example.com
  ↓ 301
https://example.com
  ↓ 301
https://www.example.com
  ↓ 301
https://example.com
```

Also detect internal rewrite cycles:

```text
/request
 ↓
/internal/request
 ↓
/request
 ↓
...
```

---

# 17. Failure Classification Registry

Initial registry:

```text
WEB-REDIRECT-001  HTTP redirect cycle
WEB-REDIRECT-002  HTTPS/proxy protocol cycle
WEB-REDIRECT-003  www/non-www cycle
WEB-REDIRECT-004  alias/pointer cycle
WEB-REDIRECT-005  panel/application conflict

WEB-REWRITE-001   internal recursion
WEB-REWRITE-002   self-rewrite
WEB-REWRITE-003   rewrite re-enters source rule

WEB-VHOST-001     incorrect VirtualHost
WEB-VHOST-002     hostname/SNI mismatch

WEB-DOCROOT-001   incorrect document root

WEB-SSL-001       certificate hostname mismatch
WEB-SSL-002       HTTP/HTTPS policy conflict

WEB-PROXY-001     forwarded-protocol mismatch
WEB-PROXY-002     host-header mismatch

WEB-CONFIG-001    generated configuration drift
WEB-CONFIG-002    invalid effective configuration

WEB-APP-001       application redirect loop

WEB-UNKNOWN-001   insufficient evidence
```

The registry must be extensible without changing the core orchestrator.

---

# 18. Root-Cause Confidence

Every diagnosis must include:

```json
{
  "diagnosis": "...",
  "confidence": "UNKNOWN|LOW|MEDIUM|HIGH|PROVEN",
  "evidence": [],
  "contradictoryEvidence": [],
  "unknowns": [],
  "candidateCauses": [],
  "recommendedMutation": null
}
```

`PROVEN` requires evidence connecting configuration to observed behavior.

---

# 19. Jemaquille Conformance Case

Current evidence establishes:
- trivial static content fails;
- `/index.html` fails;
- `/test.html` fails;
- no `.htaccess`;
- DirectAdmin Force Redirect is disabled;
- DirectAdmin Force SSL redirect is disabled;
- Apache repeatedly reports `AH00124` internal redirect recursion.

Therefore the infrastructure/configuration layer is the primary suspect, but the exact authoritative rule is still unknown.

Ugondu must not mutate merely because `AH00124` exists.

Conformance flow:

```text
doctor
 ↓
discover serving path
 ↓
inspect DirectAdmin state
 ↓
inspect effective Apache state
 ↓
construct redirect/rewrite graph
 ↓
prove offending edge/rule
 ↓
snapshot
 ↓
repair
 ↓
validate
 ↓
reload/regenerate if needed
 ↓
external verification
 ↓
log verification
 ↓
certificate
```

---

# 20. Universal Diagnostic Order

1. External HTTP observation.
2. DNS and CDN detection.
3. Edge configuration.
4. Load balancer.
5. Reverse proxy.
6. Web server.
7. Hosting panel.
8. Filesystem/configuration files.
9. Application.

At every stage compare:

```text
DECLARED STATE
EFFECTIVE STATE
OBSERVED STATE
```

---

# 21. Drift Model

Example:

```text
Expected:
Force SSL = false

Declared:
Force SSL = false

Effective:
redirect rule exists

Observed:
HTTPS recursion
```

This is configuration drift.

Repair the authoritative source rather than merely patching generated output.

---

# 22. Recovery Contract

Every mutation must include:

```yaml
repair_id:
root_cause:
scope:
preconditions:
mutation:
expected_effect:
blast_radius:
risk:
rollback:
verification:
timeout:
owner:
provider:
```

Example:

```yaml
repair_id: WEB-REDIRECT-004-R01
root_cause: domain_pointer_cycle
scope:
  domain: example.com
preserve:
  dns: true
  mail: true
  ssl: true
  document_root: true
  unrelated_domains: true
rollback:
  required: true
```

---

# 23. Minimum Mutation Principle

Change the smallest authoritative configuration element capable of fixing the proven cause.

Never:
- rebuild everything when one rule is wrong;
- disable HTTPS when proxy normalization is wrong;
- delete `.htaccess` when one rewrite is responsible;
- change DNS for an origin configuration problem.

---

# 24. Snapshot

Before mutation create an immutable snapshot containing:

```text
target identity
provider/account/tenant
domain
configuration hashes
relevant configuration
panel state
web-server state
DNS state
SSL state
document root
filesystem metadata
relevant logs
external probes
Environment Twin hash
```

No secrets in evidence.

---

# 25. Execution Lease / Concurrency Protection

Introduce:

```text
ExecutionLeaseManager
```

with:
- acquire;
- renew;
- inspect;
- release;
- expire;
- conflict;
- wait.

Two mutating executions may coexist only when their resource scopes are disjoint.

Example:

```text
Hosting account
 └── domain
     └── subdomain
         └── configuration
```

and:

```text
AWS account
 └── region
     └── stack
         └── service
             └── resource
```

If:

```text
scope(A) ∩ scope(B) != ∅
```

then the second mutation waits.

Read-only diagnostics may proceed.

---

# 26. Execution State Machine

```text
DISCOVER
  ↓
SNAPSHOT
  ↓
DIAGNOSE
  ↓
PLAN
  ↓
POLICY_CHECK
  ↓
LOCK
  ↓
AUTHORIZE
  ↓
VALIDATE
  ↓
APPLY
  ↓
REGENERATE
  ↓
RELOAD
  ↓
VERIFY
  ↓
DRIFT_CHECK
  ↓
CERTIFY
  ↓
RELEASE_LOCK
```

Failure path:

```text
FAILED
 ↓
ROLLBACK
 ↓
VERIFY_ROLLBACK
 ↓
RECOVERED or ESCALATED
```

---

# 27. Dry Run

Required:

```bash
ugondu web repair <target> --dry-run
```

Must show:
- diagnosis;
- evidence;
- planned mutation;
- affected resources;
- expected result;
- risk;
- rollback;
- verification plan.

No mutation.

---

# 28. Guarded Repair

```bash
ugondu web repair <target> --mode=guarded
```

Requirements:
- high/proven confidence;
- bounded scope;
- reversible mutation;
- valid snapshot;
- lock;
- policy approval;
- independent verification.

---

# 29. Autonomous Repair

Autonomous mode is allowed only for registered conformance-proven repair classes.

Unknown root causes must produce:

```text
AUTONOMOUS_REPAIR_DENIED
UNKNOWN / ESCALATE
```

Never guess.

---

# 30. Validation

Before reload:

Apache:
```bash
apachectl -t
```

nginx:
```bash
nginx -t
```

and provider-native validation for Plesk, DirectAdmin, cPanel, LiteSpeed and IIS.

No reload after failed validation.

---

# 31. Verification

Verification must be independent from the mutation mechanism.

Minimum:
```text
/
 /index.html
 /test.html
```

Capture:
- status;
- Location;
- headers;
- redirect chain;
- final URL;
- TLS;
- body fingerprint;
- response time.

A panel API reporting "redirect removed" is not proof that the website works.

---

# 32. Post-Repair Log Verification

After generating fresh verification requests:
- inspect the new error-log window;
- correlate logs to the verification requests;
- ensure recursion signatures such as `AH00124` do not recur.

Old logs alone must never be treated as proof of continuing failure or success.

---

# 33. Regression Verification

Confirm:
- intended web URL works;
- static files work;
- TLS remains valid;
- intended www/non-www behavior remains;
- DNS is unchanged unless DNS was explicitly the repair scope;
- mail records are unchanged;
- document root is preserved unless it was the proven cause;
- unrelated domains are untouched.

---

# 34. Rollback

If verification fails:

```text
freeze mutation
 ↓
restore snapshot
 ↓
validate
 ↓
reload/regenerate
 ↓
verify rollback
 ↓
issue failure/escalation certificate
```

Do not claim rollback success without verification.

---

# 35. Security

Mandatory controls:
- tenant binding;
- target allowlisting;
- capability-scoped credentials;
- SafePath;
- SSRF protection;
- schema validation;
- typed actions;
- signed execution envelopes;
- immutable evidence;
- least privilege;
- resource ownership checks;
- execution leases;
- fail-closed policy;
- independent verification;
- AI prompt-injection resistance.

Credentials are referenced, never stored in logs or certificates.

---

# 36. Typed Action Registry

No arbitrary `SHELL_EXEC`.

Examples:

```text
WEB_GET_DOMAIN
WEB_GET_REDIRECTS
WEB_GET_REWRITES
WEB_GET_VHOST
WEB_GET_SSL
WEB_GET_DOCUMENT_ROOT
WEB_GET_LOGS
WEB_GET_PROXY_STATE

WEB_SNAPSHOT
WEB_SET_REDIRECT
WEB_REMOVE_REDIRECT
WEB_SET_REWRITE
WEB_REMOVE_REWRITE
WEB_SET_DOCUMENT_ROOT
WEB_SET_SSL_POLICY
WEB_REGENERATE
WEB_VALIDATE
WEB_RELOAD

WEB_EXTERNAL_PROBE
WEB_VERIFY
WEB_ROLLBACK
```

Every action declares:
- risk;
- scope;
- idempotency;
- rollbackability;
- required capability;
- provider compatibility;
- verification requirement.

---

# 37. Idempotency

A mutation repeated against an already-correct state must become a safe NO-OP rather than damage configuration.

---

# 38. Provider Capability Discovery

Before planning:

```json
{
  "provider": "directadmin",
  "capabilities": [
    "domain.read",
    "redirect.read",
    "httpd.custom.read",
    "httpd.custom.write",
    "config.regenerate",
    "web.reload"
  ]
}
```

The planner generates only operations actually supported by the target.

---

# 39. Generic Fallback Adapter

Where a provider-specific adapter does not exist, a generic adapter may perform read-only:
- DNS inspection;
- TLS inspection;
- HTTP probing;
- redirect graph construction;
- response/header analysis.

It may diagnose but must not mutate.

This makes the capability globally useful before every provider has a full adapter.

---

# 40. CLI

Proposed command family:

```bash
ugondu web doctor <domain>
ugondu web diagnose <domain>
ugondu web plan-repair <domain>
ugondu web repair <domain> --dry-run
ugondu web repair <domain> --mode=guarded
ugondu web repair <domain> --mode=autonomous
ugondu web verify <domain>
ugondu web snapshot <domain>
ugondu web rollback <execution-id>
ugondu web certificate <execution-id>
ugondu web explain <execution-id>
```

Optional provider selectors:

```text
--provider=directadmin
--provider=cpanel
--provider=plesk
--provider=apache
--provider=nginx
--provider=litespeed
--provider=iis
```

---

# 41. Conformance Matrix

Minimum:

| ID | Platform | Failure | Expected |
|---|---|---|---|
| W001 | DirectAdmin + Apache | internal rewrite loop | repair |
| W002 | cPanel + Apache | `.htaccess` redirect loop | repair |
| W003 | Plesk + nginx | HTTPS loop | repair |
| W004 | Plesk + nginx/Apache | proxy loop | repair |
| W005 | LiteSpeed | rewrite recursion | repair |
| W006 | OpenLiteSpeed | rewrite recursion | repair |
| W007 | IIS | URL Rewrite loop | repair |
| W008 | Cloudflare + Apache | SSL mode loop | repair |
| W009 | Cloudflare + nginx | origin protocol loop | repair |
| W010 | AWS ALB + origin | listener redirect loop | repair |
| W011 | wrong document root | static failure | repair |
| W012 | wrong VirtualHost | wrong site served | repair |
| W013 | certificate mismatch | guarded repair |
| W014 | unknown rule | refuse |
| W015 | cross-tenant configuration | refuse |

---

# 42. Negative Safety Tests

Ugondu must refuse mutation when:
- root cause is unknown;
- scope is unknown;
- ownership is unknown;
- credentials are insufficient;
- snapshot cannot be created;
- rollback is unavailable for a risky action;
- independent verification is unavailable;
- multiple competing root causes remain;
- mutation exceeds policy;
- another execution owns the resource;
- provider returns inconsistent state.

Expected result:

```text
SAFE REFUSAL
```

---

# 43. Codebase Boundaries

Recommended conceptual modules:

```text
src/web-recovery/
  domain/
  diagnosis/
  planning/
  execution/
  adapters/
    directadmin/
    cpanel/
    plesk/
    apache/
    nginx/
    litespeed/
    openlitespeed/
    iis/
    cloudflare/
    aws/
  verification/
  evidence/
  policy/
```

Before creating these, inspect the repository and reuse existing Ugondu abstractions for:
- Environment Twin;
- Recovery Contract;
- URRE;
- execution state;
- policy;
- governance;
- adapters;
- evidence;
- Delivery Passport.

Do not create duplicate frameworks.

---

# 44. Implementation Phases

## Phase 0 — Freeze current COR work
Wait for the active AWS COR stabilization/publishing execution to finish. Do not mutate the same working tree concurrently.

## Phase 1 — Canonical domain model
Implement web target, serving path, redirect/rewrite graph, configuration, snapshot, recovery contract and verification plan.

## Phase 2 — External diagnostics
Implement HTTP/TLS/DNS/redirect/header diagnostics.

## Phase 3 — Apache diagnosis
Implement VirtualHost, rewrite graph, recursion and SSL analysis.

## Phase 4 — DirectAdmin read-only adapter
No mutation initially.

## Phase 5 — cPanel read-only adapter

## Phase 6 — Plesk read-only adapter

## Phase 7 — nginx/LiteSpeed/IIS adapters

## Phase 8 — Cloudflare/AWS/edge adapters

## Phase 9 — Recovery planner
Generate deterministic recovery contracts.

## Phase 10 — Snapshot/rollback

## Phase 11 — Execution leases
Concurrency protection must exist before autonomous mutation.

## Phase 12 — Guarded mutation

## Phase 13 — Independent external verification

## Phase 14 — Recovery Certificates / Delivery Passport

## Phase 15 — Autonomous Repair Registry

## Phase 16 — Additional providers and conformance environments

---

# 45. Definition of Done

The subsystem is complete only when:

```text
CAUSE PROVEN
+
SNAPSHOT CREATED
+
POLICY PASSED
+
LOCK ACQUIRED
+
MUTATION EXECUTED
+
CONFIGURATION VALIDATED
+
SERVICE RELOADED IF REQUIRED
+
EXTERNAL REQUEST SUCCEEDS
+
REDIRECT GRAPH VALID
+
NEW LOGS CLEAN
+
DRIFT RECONCILED
+
UNRELATED RESOURCES PRESERVED
+
EVIDENCE SEALED
+
RECOVERY CERTIFICATE ISSUED
```

---

# 46. Jemaquille Success Criteria

For the first conformance case:

```text
https://jemaquille.com/
    → expected HTTP success

https://jemaquille.com/index.html
    → expected HTTP success

https://jemaquille.com/test.html
    → expected HTTP success

No redirect cycle
No internal redirect recursion
No new AH00124 entries caused by verification
Document root unchanged unless proven responsible
SSL preserved
DNS preserved
Mail records preserved
Unrelated domains untouched
Authoritative configuration corrected
Recovery Certificate produced
```

---

# 47. Parallel-Execution Rule for the Current COR Work

Because the AWS COR stabilization/publishing execution is active now:

**Do not implement or deploy this capability into the same working tree while that execution is mutating COR-critical code.**

After it finishes:

1. inspect Git status;
2. inspect branch;
3. inspect uncommitted changes;
4. inspect execution artifacts;
5. run the existing tests;
6. record the resulting commit;
7. create an isolated worktree/branch for Web Recovery;
8. implement and test there;
9. integrate only after the COR state is verified.

Recommended isolated worktree:

```text
D:\ujomor-platform\products\ugondu-web-recovery
```

Recommended branch:

```text
feature/universal-web-recovery
```

Adapt names to the repository's canonical conventions.

---

# 48. Implementation-Agent Prompt

Use this after the current COR execution finishes:

> Implement the Universal Web Infrastructure Recovery capability described by this plan.
>
> First inspect the existing Ugondu architecture and identify canonical Environment Twin, Recovery Contract, URRE, governance, policy, adapter, execution-state, evidence and Delivery Passport abstractions.
>
> Reuse them. Do not create duplicate orchestration or governance systems.
>
> Implement the subsystem provider-neutrally. DirectAdmin is the first concrete adapter, not the architectural dependency.
>
> Implement read-only discovery and diagnosis before mutation.
>
> Never guess a root cause.
>
> Never use arbitrary shell execution as a repair primitive.
>
> Every mutation must be typed, scoped, idempotent, auditable, reversible where possible and independently verified.
>
> Implement immutable snapshots and resource execution leases before autonomous mutation.
>
> Autonomous repair is permitted only for registered, conformance-proven repair classes.
>
> Unknown or ambiguous cases must fail closed and escalate.
>
> Preserve all existing COR functionality.
>
> Run the complete existing test suite before and after implementation.
>
> Add conformance and negative safety tests.
>
> Produce a report listing files changed, abstractions reused, new abstractions, adapters, typed actions, policies, tests, security controls, rollback behavior, evidence behavior, limitations and exact test results.
>
> Do not claim production readiness until the full Definition of Done is satisfied.

---

# 49. Final Architectural Principle

The objective is not:

```text
"Ugondu can fix Jemaquille."
```

It is:

```text
"Ugondu understands web-serving infrastructure as a
deterministic, provider-neutral, recoverable system."
```

The same pipeline must therefore handle:

```text
DirectAdmin + Apache
Plesk + nginx + Apache
cPanel + LiteSpeed
Cloudflare + AWS ALB + nginx
IIS
generic VPS
containerized origins
```

through:

```text
OBSERVE
  ↓
MODEL
  ↓
DIAGNOSE
  ↓
PLAN
  ↓
POLICY
  ↓
SNAPSHOT
  ↓
LOCK
  ↓
REPAIR
  ↓
VERIFY
  ↓
ROLLBACK IF NECESSARY
  ↓
CERTIFY
```

The strongest promise Ugondu should make is not that every web failure will be automatically repaired.

It should be:

> **Every supported failure is either repaired deterministically under bounded authority, or Ugondu proves why autonomous repair is unsafe and stops without making the situation worse.**

