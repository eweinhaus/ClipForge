import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { TRACK_CONFIG } from '../utils/constants';
import './TimelineHeader.css';

/**
 * TimelineHeader Component
 * Header section with track labels and controls
 */
export default function TimelineHeader({ hiddenTracks = [], onToggleTrackVisibility }) {
  return (
    <div className="timeline-header">
      {TRACK_CONFIG.map((track) => (
        <div 
          key={track.id} 
          className="track-label"
          style={{ height: `${track.height}px` }}
        >
          <span className="track-name">{track.label}</span>
          {onToggleTrackVisibility && (
            <button
              className="track-visibility-toggle"
              onClick={() => onToggleTrackVisibility(track.id)}
              title={hiddenTracks.includes(track.id) ? 'Show track' : 'Hide track'}
              aria-label={hiddenTracks.includes(track.id) ? `Show ${track.label}` : `Hide ${track.label}`}
            >
              {hiddenTracks.includes(track.id) ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
