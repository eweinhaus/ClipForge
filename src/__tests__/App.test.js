/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';

// Mock all the components and utilities
jest.mock('../components/FileImporter', () => {
  return function MockFileImporter() {
    return <div data-testid="file-importer">File Importer</div>;
  };
});

jest.mock('../components/MultiTrackTimeline', () => {
  return function MockMultiTrackTimeline({ onTrackChange, onReorderClips }) {
    return (
      <div data-testid="multi-track-timeline">
        <button onClick={() => onTrackChange('clip1', 'overlay')}>Move to Overlay</button>
        <button onClick={() => onReorderClips([{id: 'clip1', order: 0}, {id: 'clip2', order: 1}])}>Reorder</button>
      </div>
    );
  };
});

jest.mock('../components/MultiTrackVideoPreview', () => {
  return function MockMultiTrackVideoPreview(props) {
    return <div data-testid="video-preview">Video Preview</div>;
  };
});

jest.mock('../components/ClipEditor', () => {
  return function MockClipEditor() {
    return <div data-testid="clip-editor">Clip Editor</div>;
  };
});

jest.mock('../components/ExportDialog', () => {
  return function MockExportDialog() {
    return <div data-testid="export-dialog">Export Dialog</div>;
  };
});

jest.mock('../components/HelpDialog', () => {
  return function MockHelpDialog() {
    return <div data-testid="help-dialog">Help Dialog</div>;
  };
});

jest.mock('../components/Notifications', () => {
  return function MockNotifications() {
    return <div data-testid="notifications">Notifications</div>;
  };
});

jest.mock('../components/RecordingPanel', () => {
  return function MockRecordingPanel() {
    return <div data-testid="recording-panel">Recording Panel</div>;
  };
});

jest.mock('../components/TimelineErrorBoundary', () => {
  return function MockTimelineErrorBoundary({ children }) {
    return <div data-testid="timeline-error-boundary">{children}</div>;
  };
});

jest.mock('../utils/toastContext', () => ({
  ToastProvider: ({ children }) => children,
  useToast: () => ({
    showToast: jest.fn()
  })
}));

jest.mock('../utils/rendererCaptureService', () => ({
  startScreenRecord: jest.fn(),
  startWebcamRecord: jest.fn(),
  startCompositeRecord: jest.fn(),
  setupRecorderDataCollection: jest.fn(),
  stopRecording: jest.fn(),
  requestScreenPermission: jest.fn()
}));

// Mock electron API
global.window.electronAPI = {
  readMetadata: jest.fn(),
  exportTimeline: jest.fn(),
  onExportProgress: jest.fn(),
  removeAllListeners: jest.fn(),
  selectFile: jest.fn(),
  selectSaveLocation: jest.fn(),
  getSources: jest.fn(),
  startScreenRecord: jest.fn(),
  stopScreenRecord: jest.fn(),
  startWebcamRecord: jest.fn(),
  stopWebcamRecord: jest.fn(),
  startCompositeRecord: jest.fn(),
  stopCompositeRecord: jest.fn(),
  writeRecordingFile: jest.fn(),
  getHomeDir: jest.fn()
};

describe('App Multi-Track Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('handles track change correctly', () => {
    const { container } = render(<App />);
    
    // Find the track change button and click it
    const moveToOverlayButton = screen.getByText('Move to Overlay');
    fireEvent.click(moveToOverlayButton);
    
    // Should not throw errors
    expect(container).toBeInTheDocument();
  });

  test('handles clip reordering correctly', () => {
    const { container } = render(<App />);
    
    // Find the reorder button and click it
    const reorderButton = screen.getByText('Reorder');
    fireEvent.click(reorderButton);
    
    // Should not throw errors
    expect(container).toBeInTheDocument();
  });

  test('renders all components without errors', () => {
    render(<App />);
    
    expect(screen.getByTestId('file-importer')).toBeInTheDocument();
    expect(screen.getByTestId('multi-track-timeline')).toBeInTheDocument();
    expect(screen.getByTestId('video-preview')).toBeInTheDocument();
    expect(screen.getByTestId('clip-editor')).toBeInTheDocument();
    expect(screen.getByTestId('export-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('help-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('notifications')).toBeInTheDocument();
    expect(screen.getByTestId('recording-panel')).toBeInTheDocument();
  });
});
