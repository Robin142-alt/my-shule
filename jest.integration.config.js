module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  maxWorkers: 1,
  testMatch: ['<rootDir>/apps/api/test/**/*.integration-spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  clearMocks: true,
  restoreMocks: true,
};
