/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.spec.ts', '**/*.test.ts', '**/*.spec.ts'],
  testTimeout: 10000,
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  transformIgnorePatterns: ['node_modules/(?!(canonicalize)/)'],
  moduleNameMapper: {
    '^canonicalize$': '<rootDir>/tests/canonicalize-mock.js'
  }
};
