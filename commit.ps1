git add server/engine-core/src/urre/model/
git commit -m "feat(urre/model): implement formal model and architectural invariants"

git add server/engine-core/src/urre/journal/
git commit -m "feat(urre/journal): implement durable execution journal and sqlite adapter"

git add server/engine-core/src/urre/execution/lease.ts server/engine-core/src/urre/execution/fencing.ts server/engine-core/src/urre/execution/identity.ts
git commit -m "feat(urre/execution): implement durable identity and fencing tokens"

git add server/engine-core/src/urre/execution/kernel.ts server/engine-core/src/urre/execution/checkpoint.ts server/engine-core/src/urre/execution/retry.ts server/engine-core/src/urre/execution/idempotency.ts
git commit -m "feat(urre/execution): implement execution kernel and deterministic state machine"

git add server/engine-core/src/urre/reconciliation/
git commit -m "feat(urre/reconciliation): implement UNKNOWN state handling and drift detection"

git add server/engine-core/src/urre/recovery/
git commit -m "feat(urre/recovery): implement two-phase rollback and verified recovery points"

git add server/engine-core/src/urre/admission/preflight.ts server/engine-core/src/urre/admission/disk-pressure.ts server/engine-core/src/urre/admission/safety-contract.ts
git commit -m "feat(urre/admission): implement full preflight safety controller and circuit breakers"

git add server/engine-core/src/urre/emergency/
git commit -m "feat(urre/emergency): implement non-AI emergency overrides"

git add server/engine-core/src/urre/execution/atomic-data.ts
git commit -m "feat(urre/execution): implement atomic data mutation protocol"

git add server/engine-core/src/urre/providers/ server/engine-core/src/urre/admission/capability-check.ts
git commit -m "feat(urre/providers): implement provider recovery abstraction"

git add tests/urre-failure.test.js tests/urre-restart.test.js tests/urre-distributed.test.js scripts/run-cor-gates.js
git commit -m "test(urre): implement real fault-injection and restart qualification matrices"
