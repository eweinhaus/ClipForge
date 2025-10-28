import React from 'react';
import './TimelineHeader.css';

/**
 * TimelineHeader Component
 * Header section with track labels and controls
 */
export default function TimelineHeader() {
  return (
    <div className="timeline-header">
      <div className="track-label">
        <span className="track-name">Video 1</span>
      </div>
    </div>
  );
}
