import React from 'react';
import { formatTimecode } from '../utils/timelineUtils';
import './Tooltip.css';

/**
 * Tooltip Component
 * Real-time timecode display during drag operations
 */
export default function Tooltip({ 
  visible, 
  x, 
  y, 
  timeSeconds,
  message 
}) {
  if (!visible) return null;

  return (
    <div 
      className="timeline-tooltip"
      style={{
        left: `${x}px`,
        top: `${y - 40}px`,
        transform: 'translateX(-50%)'
      }}
    >
      <div className="tooltip-content">
        {timeSeconds !== undefined && (
          <div className="tooltip-timecode">
            {formatTimecode(timeSeconds)}
          </div>
        )}
        {message && (
          <div className="tooltip-message">
            {message}
          </div>
        )}
      </div>
      <div className="tooltip-arrow"></div>
    </div>
  );
}
