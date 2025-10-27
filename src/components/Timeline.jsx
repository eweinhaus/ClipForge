import React from 'react';
import { formatDuration, formatResolution } from '../utils/formatters';
import './Timeline.css';

/**
 * Timeline Component
 * Displays list of imported clips with thumbnails
 */
export default function Timeline({ clips, selectedClipId, onSelectClip, onDeleteClip }) {
  if (clips.length === 0) {
    return (
      <div className="timeline-empty">
        <div className="empty-icon">🎬</div>
        <p>No clips yet</p>
        <p className="empty-hint">Import videos to get started!</p>
      </div>
    );
  }

  return (
    <div className="timeline">
      <div className="timeline-header">
        <h3>Timeline</h3>
        <span className="clip-count">{clips.length} clip{clips.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="clip-list">
        {clips.map(clip => (
          <ClipItem
            key={clip.id}
            clip={clip}
            isSelected={clip.id === selectedClipId}
            onSelect={() => onSelectClip(clip.id)}
            onDelete={() => onDeleteClip(clip.id)}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * ClipItem Component
 * Individual clip in the timeline
 */
const ClipItem = React.memo(({ clip, isSelected, onSelect, onDelete }) => {
  return (
    <div
      className={`clip-item ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <img
        src={clip.thumbnail}
        alt={clip.fileName}
        className="clip-thumbnail"
        loading="lazy"
      />
      <div className="clip-info">
        <div className="clip-name" title={clip.fileName}>
          {clip.fileName}
        </div>
        <div className="clip-meta">
          <span className="clip-duration">{formatDuration(clip.duration)}</span>
          <span className="clip-separator">•</span>
          <span className="clip-resolution">{formatResolution(clip.width, clip.height)}</span>
        </div>
      </div>
      <button
        className="clip-delete"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        title="Delete clip"
        aria-label={`Delete ${clip.fileName}`}
      >
        ×
      </button>
    </div>
  );
});

ClipItem.displayName = 'ClipItem';
