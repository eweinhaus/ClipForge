/**
 * Integration tests for ClipBlock component
 * Tests drag-to-trim functionality and snap-to-grid behavior
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import ClipBlock from '../../components/ClipBlock';

// Mock clip data
const mockClip = {
  id: 'test-clip-1',
  fileName: 'test-video.mp4',
  filePath: '/path/to/test-video.mp4',
  duration: 10,
  width: 1920,
  height: 1080,
  thumbnail: 'data:image/jpeg;base64,test',
  trimStart: 0,
  trimEnd: 10,
  order: 0,
  track: 'main'
};

const defaultProps = {
  clip: mockClip,
  isSelected: false,
  onSelect: jest.fn(),
  onDelete: jest.fn(),
  width: 500,
  position: 0,
  zoomLevel: 1,
  snapToGrid: true,
  onTrimChange: jest.fn()
};

describe('ClipBlock Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders clip block with correct information', () => {
    render(<ClipBlock {...defaultProps} />);
    
    expect(screen.getByText('test-video.mp4')).toBeInTheDocument();
    expect(screen.getByText('0:10')).toBeInTheDocument();
  });

  test('shows trim handles on hover', () => {
    render(<ClipBlock {...defaultProps} />);
    
    const clipBlock = screen.getByRole('button');
    fireEvent.mouseEnter(clipBlock);
    
    const leftHandle = screen.getByTitle('Drag to trim start');
    const rightHandle = screen.getByTitle('Drag to trim end');
    
    expect(leftHandle).toHaveClass('visible');
    expect(rightHandle).toHaveClass('visible');
  });

  test('calls onSelect when clicked', () => {
    render(<ClipBlock {...defaultProps} />);
    
    const clipBlock = screen.getByRole('button');
    fireEvent.click(clipBlock);
    
    expect(defaultProps.onSelect).toHaveBeenCalledTimes(1);
  });

  test('calls onDelete when delete button clicked', () => {
    render(<ClipBlock {...defaultProps} />);
    
    const clipBlock = screen.getByRole('button');
    fireEvent.mouseEnter(clipBlock);
    
    const deleteButton = screen.getByTitle('Delete clip');
    fireEvent.click(deleteButton);
    
    expect(defaultProps.onDelete).toHaveBeenCalledTimes(1);
  });

  test('handles left edge drag with snap-to-grid', () => {
    render(<ClipBlock {...defaultProps} />);
    
    const clipBlock = screen.getByRole('button');
    fireEvent.mouseEnter(clipBlock);
    
    const leftHandle = screen.getByTitle('Drag to trim start');
    
    // Start drag
    fireEvent.mouseDown(leftHandle, { clientX: 0 });
    
    // Simulate drag movement (50px = 1 second at 1x zoom)
    fireEvent.mouseMove(document, { clientX: 50 });
    
    // End drag
    fireEvent.mouseUp(document);
    
    // Should snap to 1 second
    expect(defaultProps.onTrimChange).toHaveBeenCalledWith('test-clip-1', 1, 10);
  });

  test('handles right edge drag with snap-to-grid', () => {
    render(<ClipBlock {...defaultProps} />);
    
    const clipBlock = screen.getByRole('button');
    fireEvent.mouseEnter(clipBlock);
    
    const rightHandle = screen.getByTitle('Drag to trim end');
    
    // Start drag
    fireEvent.mouseDown(rightHandle, { clientX: 500 });
    
    // Simulate drag movement (50px = 1 second at 1x zoom)
    fireEvent.mouseMove(document, { clientX: 450 });
    
    // End drag
    fireEvent.mouseUp(document);
    
    // Should snap to 9 seconds
    expect(defaultProps.onTrimChange).toHaveBeenCalledWith('test-clip-1', 0, 9);
  });

  test('does not snap when snap-to-grid is disabled', () => {
    const propsWithoutSnap = { ...defaultProps, snapToGrid: false };
    render(<ClipBlock {...propsWithoutSnap} />);
    
    const clipBlock = screen.getByRole('button');
    fireEvent.mouseEnter(clipBlock);
    
    const leftHandle = screen.getByTitle('Drag to trim start');
    
    // Start drag
    fireEvent.mouseDown(leftHandle, { clientX: 0 });
    
    // Simulate drag movement (25px = 0.5 second at 1x zoom)
    fireEvent.mouseMove(document, { clientX: 25 });
    
    // End drag
    fireEvent.mouseUp(document);
    
    // Should not snap, exact 0.5 second
    expect(propsWithoutSnap.onTrimChange).toHaveBeenCalledWith('test-clip-1', 0.5, 10);
  });

  test('prevents invalid trim ranges', () => {
    render(<ClipBlock {...defaultProps} />);
    
    const clipBlock = screen.getByRole('button');
    fireEvent.mouseEnter(clipBlock);
    
    const rightHandle = screen.getByTitle('Drag to trim end');
    
    // Start drag
    fireEvent.mouseDown(rightHandle, { clientX: 500 });
    
    // Simulate drag movement that would make trim end <= trim start
    fireEvent.mouseMove(document, { clientX: 0 });
    
    // End drag
    fireEvent.mouseUp(document);
    
    // Should not call onTrimChange for invalid range
    expect(defaultProps.onTrimChange).not.toHaveBeenCalled();
  });

  test('shows tooltip during drag operation', () => {
    render(<ClipBlock {...defaultProps} />);
    
    const clipBlock = screen.getByRole('button');
    fireEvent.mouseEnter(clipBlock);
    
    const leftHandle = screen.getByTitle('Drag to trim start');
    
    // Start drag
    fireEvent.mouseDown(leftHandle, { clientX: 0 });
    
    // Check if tooltip appears
    expect(screen.getByText(/Dragging left edge/)).toBeInTheDocument();
    
    // End drag
    fireEvent.mouseUp(document);
  });

  test('updates duration display when trimmed', () => {
    const trimmedClip = { ...mockClip, trimStart: 1, trimEnd: 9 };
    const propsWithTrimmedClip = { ...defaultProps, clip: trimmedClip };
    
    render(<ClipBlock {...propsWithTrimmedClip} />);
    
    // Should show trimmed duration (8 seconds)
    expect(screen.getByText('0:08')).toBeInTheDocument();
  });
});
