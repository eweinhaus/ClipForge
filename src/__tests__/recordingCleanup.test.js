/**
 * Test recording interval cleanup on component unmount
 * Validates that setInterval is properly cleared when component unmounts
 */

import React from 'react';
import { render, unmount } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import AppContent from '../App';

// Mock the recording functions
jest.mock('../utils/rendererCaptureService', () => ({
  startScreenRecord: jest.fn(),
  startWebcamRecord: jest.fn(),
  startCompositeRecord: jest.fn(),
  setupRecorderDataCollection: jest.fn(),
  stopRecording: jest.fn(),
  requestScreenPermission: jest.fn()
}));

// Mock electron API
const mockElectronAPI = {
  testScreenPermissions: jest.fn(),
  getSources: jest.fn(),
  writeRecordingFile: jest.fn(),
  getHomeDir: jest.fn()
};

// Mock window.electronAPI
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
});

describe('Recording Cleanup', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    
    // Reset mock implementations
    mockElectronAPI.testScreenPermissions.mockResolvedValue({ success: true, data: true });
    mockElectronAPI.getSources.mockResolvedValue({
      success: true,
      data: [{ id: 'test-source', name: 'Test Screen' }]
    });
    mockElectronAPI.writeRecordingFile.mockResolvedValue({ success: true });
    mockElectronAPI.getHomeDir.mockResolvedValue({ success: true, data: '/Users/test' });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('clears recording interval on unmount', async () => {
    const { unmount: unmountComponent } = render(<AppContent />);
    
    // Mock successful recording start
    const { startScreenRecord, setupRecorderDataCollection } = require('../utils/rendererCaptureService');
    const mockRecorder = {
      start: jest.fn(),
      state: 'recording',
      onstop: null
    };
    const mockStream = {
      getTracks: () => []
    };
    
    startScreenRecord.mockResolvedValue({
      stream: mockStream,
      recorder: mockRecorder,
      sourceId: 'test-source',
      mimeType: 'video/webm'
    });
    setupRecorderDataCollection.mockReturnValue([]);

    // Start recording
    await act(async () => {
      // Simulate clicking record screen button
      const recordButton = document.querySelector('[data-testid="record-screen"]');
      if (recordButton) {
        recordButton.click();
      }
    });

    // Verify interval was created
    expect(setInterval).toHaveBeenCalled();
    const intervalCount = setInterval.mock.calls.length;

    // Unmount component
    act(() => {
      unmountComponent();
    });

    // Run any pending timers
    act(() => {
      jest.runOnlyPendingTimers();
    });

    // Verify interval was cleared
    expect(clearInterval).toHaveBeenCalledTimes(intervalCount);
  });

  test('clears interval when recording fails', async () => {
    const { unmount: unmountComponent } = render(<AppContent />);
    
    // Mock recording failure
    const { startScreenRecord } = require('../utils/rendererCaptureService');
    startScreenRecord.mockRejectedValue(new Error('Recording failed'));

    // Attempt to start recording
    await act(async () => {
      const recordButton = document.querySelector('[data-testid="record-screen"]');
      if (recordButton) {
        recordButton.click();
      }
    });

    // Unmount component
    act(() => {
      unmountComponent();
    });

    // Run any pending timers
    act(() => {
      jest.runOnlyPendingTimers();
    });

    // Should not have any intervals running
    expect(setInterval).not.toHaveBeenCalled();
  });

  test('handles multiple recording attempts', async () => {
    const { unmount: unmountComponent } = render(<AppContent />);
    
    const { startScreenRecord, setupRecorderDataCollection } = require('../utils/rendererCaptureService');
    const mockRecorder = {
      start: jest.fn(),
      state: 'recording',
      onstop: null
    };
    const mockStream = {
      getTracks: () => []
    };
    
    startScreenRecord.mockResolvedValue({
      stream: mockStream,
      recorder: mockRecorder,
      sourceId: 'test-source',
      mimeType: 'video/webm'
    });
    setupRecorderDataCollection.mockReturnValue([]);

    // Start recording multiple times
    await act(async () => {
      const recordButton = document.querySelector('[data-testid="record-screen"]');
      if (recordButton) {
        recordButton.click();
        recordButton.click(); // Second attempt
      }
    });

    const intervalCount = setInterval.mock.calls.length;

    // Unmount component
    act(() => {
      unmountComponent();
    });

    // Run any pending timers
    act(() => {
      jest.runOnlyPendingTimers();
    });

    // All intervals should be cleared
    expect(clearInterval).toHaveBeenCalledTimes(intervalCount);
  });
});
