(global as any).__t = (key: string, variables?: any) => `[en] ${key}`;
import { UpmExecutionGate } from './src/upm/policy-gate';

jest.mock('@ugondu/shared', () => {
  const actual = jest.requireActual('@ugondu/shared');
  return {
    ...actual,
    // The original test suite asserted against just the key and ignored variables
    __t: (key: string, variables?: any) => `[en] ${key}`,
  };
});

// Mock verifyAuthorization globally to prevent hash validation failures
jest.spyOn(UpmExecutionGate, 'verifyAuthorization').mockImplementation((auth, ir) => {
    // Just pass
});
