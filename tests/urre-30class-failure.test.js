const assert = require('assert');
const { FailureClass } = require('./server/engine-core/src/urre/model/failure');
const { FAILURE_SIGNATURES } = require('./server/engine-core/src/urre/model/failure-signature');
const { FailureDetector } = require('./server/engine-core/src/urre/detection/failure-detector');

function testGate(n, name, fn) {
  try {
    fn();
    // console.log([PASS] : );
  } catch (e) {
    console.error([FAIL] : );
    console.error(e);
    process.exit(1);
  }
}

const detector = new FailureDetector();
let testCounter = 1;

FAILURE_SIGNATURES.forEach((sig) => {
  const fClass = sig.failureClass;

  // Test by message pattern
  if (sig.messagePatterns.length > 0) {
    testGate(testCounter++, ${fClass} classified correctly by message, () => {
      const context = { errorMessage: Error:  occurred, signals: {}, operation: 'test' };
      const result = detector.classify(context);
      assert.strictEqual(result, fClass);
    });
  }

  // Test by signal
  if (sig.contextSignals.length > 0) {
    testGate(testCounter++, ${fClass} classified correctly by signal, () => {
      const signals = {};
      signals[sig.contextSignals[0]] = true;
      const context = { errorMessage: 'some random error', signals, operation: 'test' };
      const result = detector.classify(context);
      assert.strictEqual(result, fClass);
    });
  }
});

// Unknown failure test
testGate(testCounter++, UNKNOWN_FAILURE classified correctly, () => {
  const context = { errorMessage: 'a totally weird and unrecognised error', signals: { strange: true }, operation: 'test' };
  const result = detector.classify(context);
  assert.strictEqual(result, FailureClass.UNKNOWN_FAILURE);
});

console.log("All URRE failure detection tests passed");
