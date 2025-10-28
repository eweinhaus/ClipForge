import React, { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import TimelineHeader from './TimelineHeader';
import TimelineContent from './TimelineContent';
import TimelineControls from './TimelineControls';
import './TimelineContainer.css';

/**
 * TimelineContainer Component
 * Bottom-docked resizable horizontal timeline container
 */
export default function TimelineContainer({ 
  clips, 
  selectedClipId, 
  onSelectClip, 
  onDeleteClip, 
  playheadPosition,
  onSeekToTime 
}) {
  const [timelineHeight, setTimelineHeight] = useState(200);
  const [isResizing, setIsResizing] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [scrollPosition, setScrollPosition] = useState(0);
  const containerRef = useRef(null);
  const resizeRef = useRef(null);

  // Handle resize functionality
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const newHeight = window.innerHeight - e.clientY;
      const clampedHeight = Math.max(150, Math.min(300, newHeight));
      setTimelineHeight(clampedHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleResizeStart = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleZoomChange = (newZoom) => {
    setZoomLevel(newZoom);
  };

  const handleScrollChange = (newScroll) => {
    setScrollPosition(newScroll);
  };

  if (clips.length === 0) {
    return (
      <div className="timeline-container timeline-empty" style={{ height: timelineHeight }}>
        <div className="empty-state">
          <p>No clips yet</p>
          <p className="empty-hint">Import videos to get started!</p>
        </div>
        <div 
          className="resize-handle"
          onMouseDown={handleResizeStart}
          ref={resizeRef}
        >
          <ChevronUp size={16} />
        </div>
      </div>
    );
  }

  return (
    <div 
      className="timeline-container"
      ref={containerRef}
      style={{ height: timelineHeight }}
    >
      <TimelineHeader />
      <TimelineContent
        clips={clips}
        selectedClipId={selectedClipId}
        onSelectClip={onSelectClip}
        onDeleteClip={onDeleteClip}
        playheadPosition={playheadPosition}
        onSeekToTime={onSeekToTime}
        zoomLevel={zoomLevel}
        scrollPosition={scrollPosition}
        onScrollChange={handleScrollChange}
      />
      <TimelineControls
        zoomLevel={zoomLevel}
        onZoomChange={handleZoomChange}
        scrollPosition={scrollPosition}
        onScrollChange={handleScrollChange}
      />
      <div 
        className="resize-handle"
        onMouseDown={handleResizeStart}
        ref={resizeRef}
      >
        <ChevronUp size={16} />
      </div>
    </div>
  );
}
