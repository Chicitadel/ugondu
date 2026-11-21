module.exports = {
  projects: [
    '<rootDir>/server/engine-core',
    // We can add other workspaces here if needed
  ],
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { isolatedModules: true }],
  },
  transformIgnorePatterns: ['node_modules/(?!canonicalize)/'],
};
