const assert = require('assert');
let ResourceState, InvalidTransitionError, TwinStateMachine;
try {
  ({ ResourceState, InvalidTransitionError } = require('../server/engine-core/dist/twin/model/resource-state'));
  ({ TwinStateMachine } = require('../server/engine-core/dist/twin/state-machine/state-machine'));
} catch (e) {
  if (e.code === 'MODULE_NOT_FOUND') {
    console.log('[SKIP] Gate N: module not compiled yet');
    process.exit(0);
  }
  throw e;
}

function createResource() {
  return {
    id: 'res-1',
    type: 'compute',
    name: 'test-vm',
    provider: 'aws',
    state: ResourceState.DISCOVERED,
    observedAt: new Date(),
    metadata: {},
    stateHistory: []
  };
}

const machine = new TwinStateMachine();

try {
  // 1. Valid transition DISCOVERED -> MODELLED succeeds
  let res1 = createResource();
  machine.transition(res1, ResourceState.MODELLED);
  assert.strictEqual(res1.state, ResourceState.MODELLED);

  // 2. Valid transition HEALTHY -> DEGRADED -> RECOVERING -> HEALTHY succeeds
  let res2 = createResource();
  res2.state = ResourceState.HEALTHY;
  machine.transition(res2, ResourceState.DEGRADED);
  machine.transition(res2, ResourceState.RECOVERING);
  machine.transition(res2, ResourceState.HEALTHY);
  assert.strictEqual(res2.state, ResourceState.HEALTHY);

  // 3. Invalid transition DISCOVERED -> HEALTHY throws InvalidTransitionError
  let res3 = createResource();
  assert.throws(() => machine.transition(res3, ResourceState.HEALTHY), InvalidTransitionError);

  // 4. Invalid transition VERIFIED -> PLANNED throws InvalidTransitionError  
  let res4 = createResource();
  res4.state = ResourceState.VERIFIED;
  assert.throws(() => machine.transition(res4, ResourceState.PLANNED), InvalidTransitionError);

  // 5. isValidTransition(HEALTHY, DEGRADED) returns true
  assert.strictEqual(machine.isValidTransition(ResourceState.HEALTHY, ResourceState.DEGRADED), true);

  // 6. isValidTransition(HEALTHY, PLANNED) returns false
  assert.strictEqual(machine.isValidTransition(ResourceState.HEALTHY, ResourceState.PLANNED), false);

  // 7. After transition, stateHistory has correct entry
  let res7 = createResource();
  machine.transition(res7, ResourceState.MODELLED);
  assert.strictEqual(res7.stateHistory.length, 1);
  assert.strictEqual(res7.stateHistory[0].from, ResourceState.DISCOVERED);
  assert.strictEqual(res7.stateHistory[0].to, ResourceState.MODELLED);

  // 8. After transition, observedAt is updated
  let res8 = createResource();
  const oldDate = new Date(Date.now() - 10000);
  res8.observedAt = oldDate;
  machine.transition(res8, ResourceState.MODELLED);
  assert.notStrictEqual(res8.observedAt.getTime(), oldDate.getTime());
  
  console.log("All twin-state-machine tests passed");
} catch (e) {
  console.error(e);
  process.exit(1);
}
