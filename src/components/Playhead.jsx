import React, { useState, useRef, useEffect } from 'react';
import './Playhead.css';

/**
 * Playhead Component
 * Red vertical line indicating current playback position
 */
export default function Playhead({ position, pxPerSecond, onSeekToTime }) {
  const [isDragging, setIsDragging] = useState(false);
  const playheadRef = useRef(null);
  const playheadPosition = position * pxPerSecond;

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
    setIsDragging(true);
    
    // Add global mouse event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !playheadRef.current) return;
    
    const timelineContainer = playheadRef.current.closest('.timeline-track-container');
    if (!timelineContainer) return;
    
    const rect = timelineContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const timeAtClick = Math.max(0, clickX / pxPerSecond);
    onSeekToTime(timeAtClick);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    
    // Remove global mouse event listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
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