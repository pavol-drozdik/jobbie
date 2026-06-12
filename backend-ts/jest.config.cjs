/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transformIgnorePatterns: [
    '/node_modules/(?!(isomorphic-dompurify|dompurify|@exodus)/)',
  ],
  moduleNameMapper: {
    '^isomorphic-dompurify$': '<rootDir>/src/test/mocks/isomorphic-dompurify.ts',
    '^exceljs$': '<rootDir>/src/test/mocks/exceljs.cjs',
  },
};
