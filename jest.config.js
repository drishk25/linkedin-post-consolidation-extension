module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  transform: {
    '^.+\\.(js|jsx)$': ['babel-jest', { configFile: './.babelrc' }]
  },
  transformIgnorePatterns: [],
  collectCoverageFrom: [
    '**/*.js',
    '!tests/**',
    '!node_modules/**',
    '!assets/**',
    '!jest.config.js'
  ],
  coverageDirectory: 'tests/coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  rootDir: '.',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/e2e/'
  ]
};