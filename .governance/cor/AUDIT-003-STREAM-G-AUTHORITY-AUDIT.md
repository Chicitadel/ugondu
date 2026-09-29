# AUDIT-003 Stream G — Repository Authority Audit
# Generated: 2026-09-13
# Baseline: 0df4bed82540d622e2a0204df894e80ff1743d34

## G-03: process.cwd() Authority Scan
- WorkspaceResolver and serverRuntimeRoot usages: LEGITIMATE (EAORCS internal control root)
- final_cor_gate.js L239+: targetRoot via process.cwd() — scoped to local-only execution mode
- No process.cwd() used as authoritative subject identity in certification path

## G-04: EAORCS_ALLOW_SELF_CERTIFY
- Present in: tests only (bypass_regression_adversarial, final_cor_gate_physical, subject_identity_adversarial, promotion_lineage_isolation)
- Production write: REMOVED by Stream D (CertificationDryRun.js)
- Verdict: CLEAN after Stream D

## G-05: Bypass strings
- All BYPASS strings found are FAIL_CLOSED guards (REPORT_AUTHORITY_BYPASS, LIVE_HEAD_CHECK_BYPASS_FORBIDDEN, etc.)
- CACHE_BYPASS: operational cache miss, not a certification bypass
- No unguarded bypass paths found

## G-07: Synthetic digest fallbacks
- ReportModelBuilder.js: REMOVED by Stream E
- certify.js L248: evidence cache sourceTreeHash fallback chain — operational cache read, not certification authority
- No remaining certification-authority fallbacks

## G-09: PASS string synthesis
- evaluator.js, policy-api.js, bin/run_cor.js: gate reads result.status === 'PASS' (correct consumer pattern)
- ci/CiOrchestrator.js: exitCode 0 -> 'PASS' (legitimate CI result mapping)
- certify.js L480-486: stream status aggregation (consumer, not synthesizer)
- No unauthorized PASS synthesis found

## G-11 F-H01-R2: testInventory count vs set equality
- L190: ciProof.testInventory.length === 0 check (ACCEPTABLE — empty guard)
- L197-198: ciProof.testInventory.length !== expectedTotalTests (DEFECT — count only, not set equality)
- Conclusion: DEFECT CONFIRMED — count check does not detect test substitution attacks
- Recommendation: Replace with Set equality check. Requires Stream I classification of final_cor_gate.js

## G-12 F-H01-R3: REMOTE_CI_PROOF_HASH env authority
- L153: process.env.REMOTE_CI_PROOF_HASH || snapshot.remoteCiProofHash
- Conclusion: DEFECT CONFIRMED — env var overrides snapshot-bound authority
- Recommendation: Remove env var; use snapshot.remoteCiProofHash only. Requires Stream I.

## G-13 F-H01-R4: finality:'SEALED' semantic conflict
- L239: Object.freeze({ decision:'COR-PASS', status:'PASS', finality:'SEALED' })
- SEALED is the governance transaction terminal state (Stream R exclusive)
- Gate uses it as gate-level finality token — creates semantic ambiguity
- Conclusion: DEFECT CONFIRMED — should be finality:'GATE_PASS'
- No external contract requires 'SEALED' at this position (checked: no consumer parses finality:'SEALED' as a hard dependency)
- Recommendation: Change to finality:'GATE_PASS'. Requires Stream I.

## G-10: Dead code confirmed safe for removal
- bin/ga_readiness_certification.js: 1-line comment "Unused legacy entry point removed (Stream BF)"
- bin/rc1_release_certification.js: 1-line comment "Unused legacy entry point removed (Stream BF)"
- Both already removed per Stream BF — no action needed

## G-GATE Activation Recommendation
STATUS: PENDING Stream I
- Stream I must classify C-F-H01-R2, C-F-H01-R3, C-F-H01-R4 as authorized modifications
- Only then may G-Gate modify the frozen final_cor_gate.js
- All three F-H01 candidate defects are physically confirmed at baseline
- The frozen file is intact (SHA256 verified by W0-11)
