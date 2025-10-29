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
  const playheadPosition = isDragging ? dragPosition : position * pxPerSecond;

  // Mouse move handler - uses ref to avoid stale closure issues
  const handleMouseMove = (e) => {
    if (!isDraggingRef.current || !playheadRef.current) {
      return;
    }
    
    // Debug: Mouse move during drag
    
    const timelineContainer = playheadRef.current.closest('.timeline-track-container');
    if (!timelineContainer) return;
    
    const rect = timelineContainer.getBoundingClientRect();
    const currentMouseX = e.clientX - rect.left;
    const clampedX = Math.max(0, Math.min(currentMouseX, rect.width));
    const timeAtClick = clampedX / pxPerSecond;
    
    // Debug: Position update during drag
    
    // Update visual position immediately
    setDragPosition(clampedX);
    
    // Also update the actual timeline position
    onSeekToTime(timeAtClick);
  };

  // Mouse up handler
  const handleMouseUp = () => {
    // Debug: Mouse up - ending drag
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
    // Debug: Mouse down - starting drag
    
    // Initialize drag position
    const timelineContainer = playheadRef.current?.closest('.timeline-track-container');
    if (timelineContainer) {
      const rect = timelineContainer.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
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
    const rect = e.currentTarget.parentElement.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const timeAtClick = clickX / pxPerSecond;
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