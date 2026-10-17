import base from './jest.config.mjs'

export default {
  ...base,
  testMatch: ['**/test/integration/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
  testTimeout: 30000,
  collectCoverage: false,
  coverageThreshold: undefined
}
