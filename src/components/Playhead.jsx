import React, { useState, useRef, useEffect } from 'react';
import './Playhead.css';

/**
 * Playhead Component
 * Red vertical line indicating current playback position
 */
export default function Playhead({ position, pxPerSecond, onSeekToTime }) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState(0);
  const playheadRef = useRef(null);
  const isDraggingRef = useRef(false);
  const LABEL_WIDTH = 120; // Width of track labels
  const playheadPosition = isDragging ? dragPosition : position * pxPerSecond;

  // Mouse move handler - uses ref to avoid stale closure issues
  const handleMouseMove = (e) => {
    if (!isDraggingRef.current || !playheadRef.current) {
      return;
    }
    
    const timelineWithLabels = playheadRef.current.closest('.timeline-with-labels');
    if (!timelineWithLabels) return;
    
    const rect = timelineWithLabels.getBoundingClientRect();
    const currentMouseX = e.clientX - rect.left - LABEL_WIDTH; // Account for label width
    const clampedX = Math.max(0, currentMouseX);
    const timeAtClick = clampedX / pxPerSecond;
    
    // Update visual position immediately
    setDragPosition(clampedX);
    
    // Also update the actual timeline position
    onSeekToTime(timeAtClick);
  };

  // Mouse up handler
  const handleMouseUp = () => {
    isDraggingRef.current = false;
    setIsDragging(false);
    setDragPosition(0);
    
    // Remove global mouse event listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // Cleanup event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Initialize drag position
    const timelineWithLabels = playheadRef.current?.closest('.timeline-with-labels');
    if (timelineWithLabels) {
      const rect = timelineWithLabels.getBoundingClientRect();
      const clickX = e.clientX - rect.left - LABEL_WIDTH; // Account for label width
      setDragPosition(clickX);
    }
    
    // Set dragging state
    isDraggingRef.current = true;
    setIsDragging(true);
    
    // Add global mouse event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleClick = (e) => {
    e.stopPropagation();
    const timelineWithLabels = e.currentTarget.closest('.timeline-with-labels');
    if (!timelineWithLabels) return;
    
    const rect = timelineWithLabels.getBoundingClientRect();
    const clickX = e.clientX - rect.left - LABEL_WIDTH; // Account for label width
    const timeAtClick = Math.max(0, clickX) / pxPerSecond;
    onSeekToTime(timeAtClick);
  };

  return (
    <div
      ref={playheadRef}
      className={`playhead ${isDragging ? 'dragging' : ''}`}
      style={{ left: `${playheadPosition}px` }}
      onClick={handleClick}
    >
      <div className="playhead-line"></div>
      <div 
        className="playhead-handle"
        onMouseDown={handleMouseDown}
      ></div>
    </div>
  );
}