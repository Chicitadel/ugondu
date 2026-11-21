/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.spec.ts'],
  testTimeout: 10000,
  transformIgnorePatterns: ['node_modules/(?!(canonicalize)/)'],
  moduleNameMapper: {
    '^canonicalize$': '<rootDir>/tests/canonicalize-mock.js'
  }
};
