module.exports = {
  rootDir: '.',
  roots: ['<rootDir>/apps/api/test'],
  testEnvironment: 'node',
  maxWorkers: 1,
  testMatch: ['**/*.integration-spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  clearMocks: true,
  // Font shaping makes frequent Math calls; keep them inside the test VM instead
  // of paying the cross-context proxy cost on every glyph. Assertions are unchanged.
  sandboxInjectedGlobals: ['Math'],
  restoreMocks: true,
};
