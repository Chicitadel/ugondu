/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/src/__tests__/**/*.spec.ts', '**/tests/**/*.spec.ts', '**/*.test.ts', '**/*.spec.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  moduleNameMapper: {
    '^canonicalize$': '<rootDir>/tests/canonicalize-mock.js',
    '^@ugondu/shared/(.*)$': '<rootDir>/../shared/dist/$1',
    '^@ugondu/shared$': '<rootDir>/../shared/dist/index.js',
  },
  testTimeout: 10000,
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/__tests__/**'],
};
