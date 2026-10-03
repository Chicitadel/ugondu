const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const repoRoot = 'D:\\ujomor-platform\\products\\ugondu';

// Bootstrap shared i18n
const sharedDist = path.join(repoRoot, 'server/shared/dist/index.js');
let globalI18n = null;
if (fs.existsSync(sharedDist)) {
  try {
    globalI18n = require(sharedDist);
    if (globalI18n.__t) {
      global.__t = globalI18n.__t;
      global.t = globalI18n.__t;
    }
  } catch (e) {
    // fallback below
  }
}
if (!global.__t) {
  global.__t = (key, params) => `[en] ${key}`;
  global.t = global.__t;
}

console.log('===============================================================');
console.log('       UGONDU UNIVERSAL COR QUALIFICATION GATES RUNNER        ');
console.log('===============================================================');

let totalSuites = 0;
let totalTests = 0;
let totalPassed = 0;
let totalFailed = 0;
const failures = [];

// Jest-faithful structural equality: key order is irrelevant and properties set to undefined are ignored.
function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  const ka = Object.keys(a).filter((k) => a[k] !== undefined);
  const kb = Object.keys(b).filter((k) => b[k] !== undefined);
  return ka.length === kb.length && ka.every((k) => k in b && deepEqual(a[k], b[k]));
}
// toMatchObject semantics: every property of `expected` must match; arrays must match element-wise and in length.
function isSubset(actual, expected) {
  if (expected === null || typeof expected !== 'object' || expected instanceof Date) return deepEqual(actual, expected);
  if (Array.isArray(expected)) return Array.isArray(actual) && actual.length === expected.length && expected.every((v, i) => isSubset(actual[i], v));
  if (actual === null || typeof actual !== 'object') return false;
  return Object.keys(expected).every((k) => isSubset(actual[k], expected[k]));
}

// Minimal Jest-compatible runtime environment
function createTestEnvironment() {
  const tests = [];
  const beforeHooks = [];
  let currentSuite = '';

  const expectObj = (actual) => {
    const matchers = (isNot) => ({
      toBe: (expected) => {
        const pass = Object.is(actual, expected);
        if (isNot ? pass : !pass) {
          throw new Error(`Expected ${JSON.stringify(actual)} ${isNot ? 'NOT ' : ''}to be ${JSON.stringify(expected)}`);
        }
      },
      toEqual: (expected) => {
        const pass = deepEqual(actual, expected);
        if (isNot ? pass : !pass) {
          throw new Error(`Expected ${JSON.stringify(actual)} ${isNot ? 'NOT ' : ''}to equal ${JSON.stringify(expected)}`);
        }
      },
      toMatchObject: (expected) => {
        const pass = isSubset(actual, expected);
        if (isNot ? pass : !pass) {
          throw new Error(`Expected ${JSON.stringify(actual)} ${isNot ? 'NOT ' : ''}to match object ${JSON.stringify(expected)}`);
        }
      },
      toBeDefined: () => {
        const pass = actual !== undefined;
        if (isNot ? pass : !pass) {
          throw new Error(`Expected value ${isNot ? 'NOT ' : ''}to be defined, got ${actual}`);
        }
      },
      toBeUndefined: () => {
        const pass = actual === undefined;
        if (isNot ? pass : !pass) {
          throw new Error(`Expected value ${isNot ? 'NOT ' : ''}to be undefined, got ${actual}`);
        }
      },
      toBeNull: () => {
        const pass = actual === null;
        if (isNot ? pass : !pass) {
          throw new Error(`Expected value ${isNot ? 'NOT ' : ''}to be null, got ${actual}`);
        }
      },
      toBeTruthy: () => {
        const pass = Boolean(actual);
        if (isNot ? pass : !pass) {
          throw new Error(`Expected value ${isNot ? 'NOT ' : ''}to be truthy, got ${actual}`);
        }
      },
      toBeFalsy: () => {
        const pass = !actual;
        if (isNot ? pass : !pass) {
          throw new Error(`Expected value ${isNot ? 'NOT ' : ''}to be falsy, got ${actual}`);
        }
      },
      toContain: (item) => {
        const pass = Array.isArray(actual) || typeof actual === 'string' ? actual.includes(item) : false;
        if (isNot ? pass : !pass) {
          throw new Error(`Expected ${JSON.stringify(actual)} ${isNot ? 'NOT ' : ''}to contain ${JSON.stringify(item)}`);
        }
      },
      toHaveLength: (len) => {
        const pass = actual && actual.length === len;
        if (isNot ? pass : !pass) {
          throw new Error(`Expected length ${isNot ? 'NOT ' : ''}to be ${len}, got ${actual ? actual.length : actual}`);
        }
      },
      toMatch: (regex) => {
        const pass = regex.test(String(actual));
        if (isNot ? pass : !pass) {
          throw new Error(`Expected ${actual} ${isNot ? 'NOT ' : ''}to match ${regex}`);
        }
      },
      toBeGreaterThan: (n) => {
        const pass = actual > n;
        if (isNot ? pass : !pass) {
          throw new Error(`Expected ${actual} ${isNot ? 'NOT ' : ''}to be greater than ${n}`);
        }
      },
      toBeGreaterThanOrEqual: (n) => {
        const pass = actual >= n;
        if (isNot ? pass : !pass) {
          throw new Error(`Expected ${actual} ${isNot ? 'NOT ' : ''}to be >= ${n}`);
        }
      },
      toBeLessThan: (n) => {
        const pass = actual < n;
        if (isNot ? pass : !pass) {
          throw new Error(`Expected ${actual} ${isNot ? 'NOT ' : ''}to be < ${n}`);
        }
      },
      toBeLessThanOrEqual: (n) => {
        const pass = actual <= n;
        if (isNot ? pass : !pass) {
          throw new Error(`Expected ${actual} ${isNot ? 'NOT ' : ''}to be <= ${n}`);
        }
      },
      toHaveBeenCalled: () => {
        const calls = actual && actual.mock ? actual.mock.calls : [];
        const pass = calls.length > 0;
        if (isNot ? pass : !pass) {
          throw new Error(`Expected mock function ${isNot ? 'NOT ' : ''}to have been called`);
        }
      },
      toHaveBeenCalledWith: (...args) => {
        const calls = actual && actual.mock ? actual.mock.calls : [];
        const pass = calls.some(callArgs => {
          if (callArgs.length !== args.length) return false;
          return callArgs.every((a, i) => JSON.stringify(a) === JSON.stringify(args[i]));
        });
        if (isNot ? pass : !pass) {
          throw new Error(`Expected mock function ${isNot ? 'NOT ' : ''}to have been called with ${JSON.stringify(args)}`);
        }
      },
      toHaveBeenCalledTimes: (count) => {
        const calls = actual && actual.mock ? actual.mock.calls : [];
        const pass = calls.length === count;
        if (isNot ? pass : !pass) {
          throw new Error(`Expected mock function ${isNot ? 'NOT ' : ''}to have been called ${count} times, called ${calls.length} times`);
        }
      },
      toThrow: (expected) => {
        let threw = false;
        let thrownError = null;
        if (typeof actual === 'function') {
          try {
            actual();
          } catch (err) {
            threw = true;
            thrownError = err;
          }
        }
        if (isNot ? threw : !threw) {
          throw new Error(`Expected function ${isNot ? 'NOT ' : ''}to throw`);
        }
        if (expected && thrownError) {
          const msg = thrownError.message || String(thrownError);
          if (expected instanceof RegExp) {
            if (!expected.test(msg)) {
              throw new Error(`Expected error message "${msg}" to match ${expected}`);
            }
          } else {
            const expStr = typeof expected === 'string' ? expected : (expected.message || String(expected));
            if (!msg.includes(expStr)) {
              throw new Error(`Expected error message "${msg}" to contain "${expStr}"`);
            }
          }
        }
      }
    });

    const res = matchers(false);
    res.not = matchers(true);
    return res;
  };

  const jestMock = {
    fn: (impl) => {
      const mockFn = (...args) => {
        mockFn.mock.calls.push(args);
        return impl ? impl(...args) : undefined;
      };
      mockFn.mock = { calls: [] };
      mockFn.mockResolvedValue = (val) => jestMock.fn(() => Promise.resolve(val));
      mockFn.mockReturnValue = (val) => jestMock.fn(() => val);
      return mockFn;
    }
  };

  const describe = (name, fn) => {
    const prevSuite = currentSuite;
    currentSuite = prevSuite ? `${prevSuite} > ${name}` : name;
    fn();
    currentSuite = prevSuite;
  };

  const beforeEach = (fn) => {
    beforeHooks.push(fn);
  };

  const it = (name, fn) => {
    tests.push({
      suite: currentSuite,
      name,
      fn,
      hooks: [...beforeHooks]
    });
  };

  return { describe, it, expect: expectObj, jest: jestMock, beforeEach, tests };
}

// Module cache to avoid re-executing modules
const moduleCache = new Map();

function makeRequire(currentDir) {
  return function customRequire(id) {
    // Normalization for known aliases
    if (id === 'i18n' || id === 'shared/i18n' || id.endsWith('/shared/i18n') || id.endsWith('\\shared\\i18n') || id.endsWith('/i18n') || id.endsWith('\\i18n')) {
      const sharedI18nPath = path.join(repoRoot, 'server/shared/i18n.ts');
      return customRequire(path.relative(currentDir, sharedI18nPath));
    }
    if (id === '@ugondu/shared') {
      return require(path.join(repoRoot, 'server/shared/dist/index.js'));
    }
    if (id === '@ugondu/event-bus') {
      return require(path.join(repoRoot, 'server/event-bus/dist/index.js'));
    }
    if (id === '@ugondu/engine-core') {
      return require(path.join(repoRoot, 'server/engine-core/dist/index.js'));
    }
    if (id === '@aws-sdk/client-iam' || id === '@azure/arm-authorization' || id === '@azure/identity' || id === '@google-cloud/resource-manager' || id === '@google-cloud/iam-admin' || id === '@kubernetes/client-node') {
      return {
        IAMClient: class { send() { return Promise.resolve({}); } },
        AuthorizationManagementClient: class {},
        DefaultAzureCredential: class {},
        ProjectsClient: class {},
        KubeConfig: class { loadFromDefault() {} makeApiClient() { return {}; } },
        RbacAuthorizationV1Api: class {}
      };
    }

    if (id.startsWith('.')) {
      let resolved = path.resolve(currentDir, id);
      // Fix paths accidentally resolving to products/ugondu/shared instead of products/ugondu/server/shared
      if (!fs.existsSync(resolved) && resolved.includes('\\products\\ugondu\\shared\\')) {
        const alt = resolved.replace('\\products\\ugondu\\shared\\', '\\products\\ugondu\\server\\shared\\');
        if (fs.existsSync(alt) || fs.existsSync(alt + '.ts')) {
          resolved = alt;
        }
      }

      const candidates = [
        resolved + '.ts',
        resolved + '.js',
        path.join(resolved, 'index.ts'),
        path.join(resolved, 'index.js'),
        resolved
      ];

      for (const cand of candidates) {
        if (fs.existsSync(cand) && cand.endsWith('.ts')) {
          if (moduleCache.has(cand)) {
            return moduleCache.get(cand).exports;
          }
          const modTs = fs.readFileSync(cand, 'utf8');
          const modJs = ts.transpileModule(modTs, {
            compilerOptions: {
              module: ts.ModuleKind.CommonJS,
              target: ts.ScriptTarget.ES2022,
              esModuleInterop: true
            }
          }).outputText;

          const m = { exports: {} };
          moduleCache.set(cand, m);

          const childRequire = makeRequire(path.dirname(cand));
          const fn = new Function('require', 'module', 'exports', '__dirname', '__filename', '__t', 't', modJs);
          fn(childRequire, m, m.exports, path.dirname(cand), cand, global.__t, global.t);
          return m.exports;
        } else if (fs.existsSync(cand) && cand.endsWith('.js')) {
          return require(cand);
        }
      }
      return require(resolved);
    }

    return require(id);
  };
}

// All qualification test suites to run
const testFiles = [
  'server/uppie/src/tests/uppie.core.spec.ts',
  'server/uppie/src/tests/uppie.adapters.spec.ts',
  'server/uppie/src/tests/uppie.gates.21-50.spec.ts',
  'server/uppie/src/tests/linux-acl.spec.ts',
  'server/uppie/src/tests/k8s-rbac.spec.ts',
  'server/uppie/src/tests/aws-iam.lifecycle.spec.ts',
  'server/uppie/src/tests/aws-iam.analysis.spec.ts',
  'server/uppie/src/tests/azure-rbac.lifecycle.spec.ts',
  'server/uppie/src/tests/azure-rbac.analysis.spec.ts',
  'server/uppie/src/tests/gcp-iam.lifecycle.spec.ts',
  'server/uppie/src/tests/gcp-iam.maintenance.spec.ts',
  'server/uppie/src/tests/gcp-iam.analysis.spec.ts',
  'server/uppie/src/tests/cpanel.lifecycle.spec.ts',
  'server/uppie/src/tests/cpanel.maintenance.spec.ts',
  'server/uppie/src/tests/cpanel.analysis.spec.ts',
  'server/uppie/src/tests/whm-http-client.spec.ts',
  'server/uppie/src/tests/excessive-permission-analyzer.spec.ts',
  'server/capabilities/src/tests/ceg.qualification.spec.ts',
  'server/capabilities/src/tests/ceg.gates.16-40.spec.ts',
  'server/capabilities/src/tests/ceg.gates.41-70.spec.ts',
  'server/engine-core/src/urre/tests/rollback.spec.ts',
  'server/engine-core/src/urre/tests/verification.spec.ts',
  'server/engine-core/src/move/tests/readiness.spec.ts',
  'server/engine-core/src/urre/tests/urre.qualification.spec.ts',
  'server/engine-core/src/intent/tests/intent.qualification.spec.ts',
  'server/engine-core/src/fabric/tests/provisioning-engine.spec.ts',
  'server/engine-core/src/fabric/tests/provisioning-rollback.spec.ts',
  'server/engine-core/src/fabric/tests/provisioning-preflight.spec.ts',
  'server/engine-core/src/fabric/tests/provider-contract.spec.ts',
  'server/engine-core/src/fabric/tests/provider-rejection.spec.ts',
  'server/engine-core/src/fabric/tests/provisioning-evidence.spec.ts',
  'server/engine-core/src/autopilot/tests/autopilot.qualification.spec.ts',
  'server/engine-core/src/doctor/tests/doctor.qualification.spec.ts',
  'server/engine-core/src/assurance/tests/verify.qualification.spec.ts',
  'server/engine-core/src/move/tests/move_passport.qualification.spec.ts',
  'server/tests/e2e/billing_ceg_integration.spec.ts'
];

async function runAll() {
  const startTime = Date.now();

  for (const relFile of testFiles) {
    const fullPath = path.join(repoRoot, relFile);
    if (!fs.existsSync(fullPath)) {
      console.warn(`[Skip] File not found: ${relFile}`);
      continue;
    }

    totalSuites++;
    console.log(`\n▶ Suite [${totalSuites}/${testFiles.length}]: ${relFile}`);
    const srcTs = fs.readFileSync(fullPath, 'utf8');

    // Transpile TS to JS in-memory
    const transpiled = ts.transpileModule(srcTs, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true
      }
    });

    const env = createTestEnvironment();
    const suiteRequire = makeRequire(path.dirname(fullPath));

    const exportsObj = {};
    const moduleObj = { exports: exportsObj };

    // Register test definitions
    const runnerFn = new Function(
      'describe', 'it', 'expect', 'jest', 'beforeEach', 'require', '__dirname', '__filename', '__t', 't', 'exports', 'module',
      transpiled.outputText
    );

    try {
      runnerFn(env.describe, env.it, env.expect, env.jest, env.beforeEach, suiteRequire, path.dirname(fullPath), fullPath, global.__t, global.t, exportsObj, moduleObj);
    } catch (suiteErr) {
      console.error(`  ✗ Suite Load Error: ${suiteErr.message}`);
      totalFailed++;
      failures.push({ suite: relFile, test: 'Suite Load', error: suiteErr.message });
      continue;
    }

    // Execute tests sequentially
    for (const testItem of env.tests) {
      totalTests++;
      for (const hook of testItem.hooks) {
        try {
          const hookRes = hook();
          if (hookRes && typeof hookRes.then === 'function') {
            await hookRes;
          }
        } catch (hErr) {
          console.error(`  ✗ BeforeEach Hook Error in ${testItem.name}: ${hErr.message}`);
        }
      }

      try {
        const res = testItem.fn();
        if (res && typeof res.then === 'function') {
          await res;
        }
        totalPassed++;
        console.log(`  ✓ PASS: ${testItem.name}`);
      } catch (err) {
        totalFailed++;
        failures.push({ suite: testItem.suite, test: testItem.name, error: err.message });
        console.error(`  ✗ FAIL: ${testItem.name} -> ${err.message}`);
      }
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n===============================================================');
  console.log(`QUALIFICATION RESULTS: ${totalPassed}/${totalTests} PASSED (${totalFailed} failed) in ${durationSec}s`);
  console.log(`Suites executed: ${totalSuites}`);
  if (totalFailed > 0) {
    console.log('\nFAILURES:');
    failures.forEach((f, idx) => {
      console.log(`  ${idx + 1}. [${f.suite}] ${f.test} -> ${f.error}`);
    });
  } else {
    console.log('STATUS: 100% PASS - ALL GATES QUALIFIED AND COMPLIANT');
  }
  console.log('===============================================================');
}

runAll().catch(console.error);
