require('@testing-library/jest-dom');

// Mock Electron APIs
global.electronAPI = {
  openFileDialog: jest.fn(),
  getVideoMetadata: jest.fn(),
  exportTimeline: jest.fn(),
  getSources: jest.fn(),
  startScreenRecord: jest.fn(),
  stopScreenRecord: jest.fn(),
  startWebcamRecord: jest.fn(),
  stopWebcamRecord: jest.fn(),
  startCompositeRecord: jest.fn(),
  stopCompositeRecord: jest.fn(),
  writeRecordingFile: jest.fn(),
  getHomeDir: jest.fn(),
  onExportProgress: jest.fn(),
  removeExportProgressListener: jest.fn()
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn(id => clearTimeout(id));
