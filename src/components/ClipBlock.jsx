import React, { useState, useRef, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { formatDuration, ellipsize, formatTrimmedDuration } from '../utils/formatters';
import { timeToPx, pxToTime, snap, validateTrimRange } from '../utils/timelineUtils';
import { useThumbnailPreload } from '../hooks/useThumbnailPreload';
import Tooltip from './Tooltip';
import './ClipBlock.css';

/**
 * ClipBlock Component
 * Individual clip block in the horizontal timeline
 */
export default function ClipBlock({ 
  clip, 
  isSelected, 
  onSelect, 
  onDelete, 
  width, 
  position,
  zoomLevel,
  snapToGrid,
  onTrimChange
}) {
  const [isDraggingEdge, setIsDraggingEdge] = useState(false);
  const [draggingEdge, setDraggingEdge] = useState(null); // 'left' or 'right'
  const [draftTrimStart, setDraftTrimStart] = useState(clip.trimStart);
  const [draftTrimEnd, setDraftTrimEnd] = useState(clip.trimEnd);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, timeSeconds: 0, message: '' });
  const [isHovered, setIsHovered] = useState(false);
  const [hoverCard, setHoverCard] = useState({ visible: false, x: 0, y: 0 });
  
  const blockRef = useRef(null);
  const startXRef = useRef(0);
  const originalTrimStartRef = useRef(0);
  const originalTrimEndRef = useRef(0);
  
  // Use thumbnail preloading hook
  const { elementRef, isLoaded, hasError, cachedSrc } = useThumbnailPreload(clip.id, clip.thumbnail);
  // Update draft values when clip changes
  useEffect(() => {
    setDraftTrimStart(clip.trimStart);
    setDraftTrimEnd(clip.trimEnd);
  }, [clip.trimStart, clip.trimEnd]);

  // Handle edge drag start
  const handleEdgeMouseDown = (e, edge) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDraggingEdge(true);
    setDraggingEdge(edge);
    startXRef.current = e.clientX;
    originalTrimStartRef.current = clip.trimStart;
    originalTrimEndRef.current = clip.trimEnd;
    
    // Show tooltip
    const rect = blockRef.current.getBoundingClientRect();
    setTooltip({
      visible: true,
      x: e.clientX,
      y: rect.top,
      timeSeconds: edge === 'left' ? clip.trimStart : clip.trimEnd,
      message: `Dragging ${edge} edge`
    });
  };

  // Handle mouse move during edge drag
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingEdge || !draggingEdge) return;

      const deltaX = e.clientX - startXRef.current;
      const deltaTime = pxToTime(deltaX, zoomLevel);
      
      let newTrimStart = originalTrimStartRef.current;
      let newTrimEnd = originalTrimEndRef.current;
      
      if (draggingEdge === 'left') {
        newTrimStart = Math.max(0, originalTrimStartRef.current + deltaTime);
        newTrimStart = snap(newTrimStart, snapToGrid);
      } else if (draggingEdge === 'right') {
        newTrimEnd = Math.min(clip.duration, originalTrimEndRef.current + deltaTime);
        newTrimEnd = snap(newTrimEnd, snapToGrid);
      }
      
      // Validate trim range
      const validation = validateTrimRange(newTrimStart, newTrimEnd, clip.duration);
      
      if (validation.isValid) {
        setDraftTrimStart(newTrimStart);
        setDraftTrimEnd(newTrimEnd);
        
        // Update tooltip
        setTooltip(prev => ({
          ...prev,
          x: e.clientX,
          timeSeconds: draggingEdge === 'left' ? newTrimStart : newTrimEnd,
          message: validation.message
        }));
      } else {
        // Show invalid state
        setTooltip(prev => ({
          ...prev,
          x: e.clientX,
          message: validation.message
        }));
      }
    };

    const handleMouseUp = () => {
      if (!isDraggingEdge) return;
      
      // Validate final trim range
      const validation = validateTrimRange(draftTrimStart, draftTrimEnd, clip.duration);
      
      if (validation.isValid && onTrimChange) {
        onTrimChange(clip.id, draftTrimStart, draftTrimEnd);
      }
      
      // Reset state
      setIsDraggingEdge(false);
      setDraggingEdge(null);
      setTooltip({ visible: false, x: 0, y: 0, timeSeconds: 0, message: '' });
    };

    if (isDraggingEdge) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingEdge, draggingEdge, draftTrimStart, draftTrimEnd, clip.id, clip.duration, zoomLevel, snapToGrid, onTrimChange]);

  const handleClick = (e) => {
    e.stopPropagation();
    onSelect();
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete();
  };

  const handleMouseEnter = (e) => {
    setIsHovered(true);
    
    // Show hover card with full filename and original duration
    if (!isDraggingEdge) {
      const rect = blockRef.current.getBoundingClientRect();
      setHoverCard({
        visible: true,
        x: rect.left + rect.width / 2,
        y: rect.top - 10
      });
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setHoverCard({ visible: false, x: 0, y: 0 });
    if (!isDraggingEdge) {
      setTooltip({ visible: false, x: 0, y: 0, timeSeconds: 0, message: '' });
    }
  };

  // Calculate current width based on draft trim values
  const currentWidth = timeToPx(draftTrimEnd - draftTrimStart, zoomLevel);
  const currentPosition = position; // TrackArea handles trimStart positioning

  return (
    <>
      <div
        ref={blockRef}
        className={`clip-block ${isSelected ? 'selected' : ''} ${isDraggingEdge ? 'dragging' : ''} ${isHovered ? 'hovered' : ''}`}
        style={{
          width: `${currentWidth}px`,
          left: `${currentPosition}px`,
          minWidth: '20px' // Ensure minimum visibility
        }}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        role="listitem"
        tabIndex={0}
        onKeyPress={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect();
          }
        }}
        aria-label={`Clip: ${clip.fileName}, Duration: ${formatDuration(clip.duration)}`}
      >
        {/* Left trim handle */}
        <div 
          className={`trim-handle left ${isHovered || isDraggingEdge ? 'visible' : ''}`}
          onMouseDown={(e) => handleEdgeMouseDown(e, 'left')}
          title="Drag to trim start"
        />
        
        {/* Right trim handle */}
        <div 
          className={`trim-handle right ${isHovered || isDraggingEdge ? 'visible' : ''}`}
          onMouseDown={(e) => handleEdgeMouseDown(e, 'right')}
          title="Drag to trim end"
        />

        {/* Enhanced thumbnail with lazy loading */}
        <div className="clip-thumbnail" ref={elementRef}>
          {isLoaded && cachedSrc ? (
            <img
              src={cachedSrc}
              alt={clip.fileName}
              className="thumbnail-image"
            />
          ) : hasError ? (
            <div className="thumbnail-placeholder error">
              <span>📹</span>
            </div>
          ) : (
            <div className="thumbnail-placeholder loading">
              <span>⏳</span>
            </div>
          )}
        </div>

        {/* Filename overlay */}
        <div className="clip-filename-overlay">
          {ellipsize(clip.fileName, 15)}
        </div>

        {/* Trimmed duration overlay */}
        <div className="clip-duration-overlay">
          {formatTrimmedDuration(draftTrimStart, draftTrimEnd)}
        </div>

        <button
          className="clip-delete"
          onClick={handleDelete}
          title="Delete clip"
          aria-label={`Delete ${clip.fileName}`}
        >
          <Trash2 size={12} />
        </button>
      </div>
      
      {/* Tooltip for drag operations */}
      <Tooltip {...tooltip} />
      
      {/* Hover card for clip information */}
      {hoverCard.visible && !isDraggingEdge && (
        <div 
          className="clip-hover-card"
          style={{
            left: `${hoverCard.x}px`,
            top: `${hoverCard.y}px`,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="hover-card-content">
            <div className="hover-card-filename">{clip.fileName}</div>
            <div className="hover-card-duration">
              Original: {formatDuration(clip.duration)}
            </div>
            <div className="hover-card-trimmed">
              Trimmed: {formatTrimmedDuration(draftTrimStart, draftTrimEnd)}
            </div>
          </div>
          <div className="hover-card-arrow"></div>
        </div>
      )}
    </>
  );
}
