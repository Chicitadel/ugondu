(global as any).__t = (key: string, variables?: any) => `[en] ${key}`;

jest.mock('@ugondu/shared', () => {
  const actual = jest.requireActual('@ugondu/shared');
  return {
    ...actual,
    __t: (key: string, variables?: any) => `[en] ${key}`,
  };
});

import { GlobalCapabilityRegistry } from './src/deise/engine/recovery/capability-registry';
import { PathRepositoryReconstruction } from '../plugins/recovery-dependencies/src/path-repository-reconstruction';

GlobalCapabilityRegistry.registerCapability(
    new PathRepositoryReconstruction()
);
