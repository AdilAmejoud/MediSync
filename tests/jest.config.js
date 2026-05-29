export default {
  rootDir: '..',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
  moduleDirectories: ['node_modules', '<rootDir>/backend/node_modules'],
  moduleFileExtensions: ['js', 'mjs', 'cjs'],
  moduleNameMapper: {
    '^@noble/hashes/sha3$': '<rootDir>/node_modules/@noble/hashes/sha3.js',
    '^@noble/hashes/(.+)\\.js$': '<rootDir>/node_modules/@noble/hashes/$1.js',
    '^@noble/hashes/(.+)$': '<rootDir>/node_modules/@noble/hashes/$1.js',
  },
  setupFiles: ['<rootDir>/tests/helpers/setup.js'],
  globalTeardown: '<rootDir>/tests/helpers/teardown.js',
  testEnvironment: 'node',
  verbose: true,
  collectCoverageFrom: [
    '<rootDir>/backend/**/*.js',
    '!<rootDir>/backend/node_modules/**',
    '!<rootDir>/backend/server.js',
    '!<rootDir>/backend/seed.js',
  ],
  coverageDirectory: '<rootDir>/tests/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};
