import React, { useState, useRef, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { formatDuration } from '../utils/formatters';
import { timeToPx, pxToTime, snap, validateTrimRange } from '../utils/timelineUtils';
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
  
  const blockRef = useRef(null);
  const startXRef = useRef(0);
  const originalTrimStartRef = useRef(0);
  const originalTrimEndRef = useRef(0);
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

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (!isDraggingEdge) {
      setTooltip({ visible: false, x: 0, y: 0, timeSeconds: 0, message: '' });
    }
  };

  // Calculate current width based on draft trim values
  const currentWidth = timeToPx(draftTrimEnd - draftTrimStart, zoomLevel);
  const currentPosition = position + timeToPx(draftTrimStart, zoomLevel);

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
        role="button"
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

        <div className="clip-thumbnail">
          <img
            src={clip.thumbnail}
            alt={clip.fileName}
            loading="lazy"
          />
        </div>
        <div className="clip-info">
          <div className="clip-name" title={clip.fileName}>
            {clip.fileName.length > 20 ? `${clip.fileName.substring(0, 20)}...` : clip.fileName}
          </div>
          <div className="clip-duration">
            {formatDuration(draftTrimEnd - draftTrimStart)}
          </div>
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
      
      {/* Tooltip */}
      <Tooltip {...tooltip} />
    </>
  );
}
