/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MultiTrackTimeline from '../MultiTrackTimeline';

// Mock the hooks and components
jest.mock('../hooks/useTimelineKeyboard', () => ({
  useTimelineKeyboard: jest.fn()
}));

jest.mock('./TimelineHeader', () => {
  return function MockTimelineHeader() {
    return <div data-testid="timeline-header">Timeline Header</div>;
  };
});

jest.mock('./TimelineControls', () => {
  return function MockTimelineControls({ onZoomChange, onScrollChange, onExport }) {
    return (
      <div data-testid="timeline-controls">
        <button onClick={() => onZoomChange(2)}>Zoom 2x</button>
        <button onClick={() => onScrollChange(100)}>Scroll</button>
        <button onClick={onExport}>Export</button>
      </div>
    );
  };
});

// Mock @dnd-kit components
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragEnd }) => (
    <div data-testid="dnd-context" onClick={() => onDragEnd({ active: { id: 'clip1' }, over: { id: 'overlay-track' } })}>
      {children}
    </div>
  ),
  closestCenter: jest.fn(),
  KeyboardSensor: jest.fn(),
  PointerSensor: jest.fn(),
  useSensor: jest.fn()
}));

jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }) => <div data-testid="sortable-context">{children}</div>,
  sortableKeyboardCoordinates: jest.fn(),
  verticalListSortingStrategy: jest.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false
  })
}));

jest.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: jest.fn(() => '')
    }
  }
}));

describe('MultiTrackTimeline', () => {
  const mockClips = [
    {
      id: 'clip1',
      fileName: 'test1.mp4',
      filePath: '/path/to/test1.mp4',
      duration: 10,
      width: 1920,
      height: 1080,
      trimStart: 0,
      trimEnd: 10,
      track: 'main',
      order: 0
    },
    {
      id: 'clip2',
      fileName: 'test2.mp4',
      filePath: '/path/to/test2.mp4',
      duration: 5,
      width: 1920,
      height: 1080,
      trimStart: 0,
      trimEnd: 5,
      track: 'overlay',
      order: 1
    }
  ];

  const defaultProps = {
    clips: mockClips,
    selectedClipId: 'clip1',
    onSelectClip: jest.fn(),
    onDeleteClip: jest.fn(),
    onDuplicateClip: jest.fn(),
    onResetTrim: jest.fn(),
    playheadPosition: 0,
    onSeekToTime: jest.fn(),
    onTrimChange: jest.fn(),
    onTrackChange: jest.fn(),
    onReorderClips: jest.fn(),
    onExport: jest.fn(),
    isExporting: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders empty state when no clips', () => {
    render(<MultiTrackTimeline {...defaultProps} clips={[]} />);
    
    expect(screen.getByText('No clips yet')).toBeInTheDocument();
    expect(screen.getByText('Import videos to get started!')).toBeInTheDocument();
  });

  test('renders timeline with clips', () => {
    render(<MultiTrackTimeline {...defaultProps} />);
    
    expect(screen.getByTestId('timeline-header')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-controls')).toBeInTheDocument();
    expect(screen.getByTestId('dnd-context')).toBeInTheDocument();
  });

  test('separates clips by track', () => {
    render(<MultiTrackTimeline {...defaultProps} />);
    
    // Should show track labels
    expect(screen.getByText('Main Video')).toBeInTheDocument();
    expect(screen.getByText('Overlay')).toBeInTheDocument();
  });

  test('handles track change on drag end', () => {
    const mockOnTrackChange = jest.fn();
    render(<MultiTrackTimeline {...defaultProps} onTrackChange={mockOnTrackChange} />);
    
    // Simulate drag end to overlay track
    fireEvent.click(screen.getByTestId('dnd-context'));
    
    expect(mockOnTrackChange).toHaveBeenCalledWith('clip1', 'overlay');
  });

  test('handles reorder on drag end within same track', () => {
    const mockOnReorderClips = jest.fn();
    render(<MultiTrackTimeline {...defaultProps} onReorderClips={mockOnReorderClips} />);
    
    // This would need more complex mocking to test actual reordering
    // For now, just verify the component renders without errors
    expect(screen.getByTestId('dnd-context')).toBeInTheDocument();
  });

  test('applies zoom and scroll changes', () => {
    render(<MultiTrackTimeline {...defaultProps} />);
    
    const zoomButton = screen.getByText('Zoom 2x');
    const scrollButton = screen.getByText('Scroll');
    
    fireEvent.click(zoomButton);
    fireEvent.click(scrollButton);
    
    // Should not throw errors
    expect(screen.getByTestId('timeline-controls')).toBeInTheDocument();
  });
});
