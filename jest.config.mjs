export const preset = 'ts-jest';
export const testEnvironment = 'node';
export const transform = {
  '^.+\\.tsx?$': [
    'ts-jest',
    {
      tsconfig: './tsconfig.test.json',
    },
  ],
};
export const testMatch = ['**/test/**/*.test.ts'];
export const collectCoverageFrom = [
  'src/**/*.ts',
  '!src/index.ts', // barrel re-export only, no logic
];
export const moduleNameMapper = {
  '^(\\.{1,2}/.*)\\.js$': '$1',
};
export const coverageThreshold = {
  global: {
    branches: 90,
    functions: 100,
    lines: 95,
    statements: 95,
  },
};
