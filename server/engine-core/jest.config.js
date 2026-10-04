/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transformIgnorePatterns: ['node_modules/(?!canonicalize)/'],
  testMatch: ['**/tests/**/*.spec.ts', '**/*.test.ts', '**/*.spec.ts'],
  testTimeout: 10000,
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
};
