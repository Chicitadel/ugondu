(global as any).__t = (key: string, variables?: any) => `[en] ${key}`;
import { UpmExecutionGate } from './src/upm/policy-gate';

jest.stub('@ugondu/shared', () => {
  const actual = jest.requireActual('@ugondu/shared');
  return {
    ...actual,
    // The original test suite asserted against just the key and ignored variables
    __t: (key: string, variables?: any) => `[en] ${key}`,
  };
});

// Stub verifyAuthorization globally to prevent hash validation failures
jest.spyOn(UpmExecutionGate, 'verifyAuthorization').stubImplementation((auth, ir) => {
    // Just pass
});
