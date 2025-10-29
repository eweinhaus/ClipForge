module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.js'],
  testMatch: [
    '<rootDir>/src/__tests__/**/*.test.js',
    '<rootDir>/src/__tests__/**/*.test.jsx'
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.test.{js,jsx}',
    '!src/__tests__/**',
    '!src/index.js',
    '!src/main.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(fluent-ffmpeg|ffprobe-static)/)'
  ],
  testTimeout: 60000, // 60 seconds for FFmpeg operations
  verbose: true
};