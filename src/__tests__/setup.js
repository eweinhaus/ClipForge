/**
 * Jest setup file
 * Configures test environment and mocks
 */

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock Electron APIs
global.window = {
  ...global.window,
  electronAPI: {
    testScreenPermissions: jest.fn(),
    getSources: jest.fn(),
    writeRecordingFile: jest.fn(),
    getHomeDir: jest.fn(),
    exportTimeline: jest.fn(),
    onExportProgress: jest.fn()
  }
};

// Mock MediaRecorder
global.MediaRecorder = jest.fn().mockImplementation(() => ({
  start: jest.fn(),
  stop: jest.fn(),
  state: 'inactive',
  onstop: null,
  ondataavailable: null,
  onerror: null,
  mimeType: 'video/webm'
}));

// Mock navigator.mediaDevices
global.navigator = {
  ...global.navigator,
  mediaDevices: {
    getUserMedia: jest.fn(),
    getDisplayMedia: jest.fn()
  }
};

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = localStorageMock;

// Mock timers
jest.useFakeTimers();
