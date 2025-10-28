import React from 'react';
import { Trash2 } from 'lucide-react';
import { formatDuration } from '../utils/formatters';
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
  position 
}) {
  const handleClick = (e) => {
    e.stopPropagation();
    onSelect();
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete();
  };

  return (
    <div
      className={`clip-block ${isSelected ? 'selected' : ''}`}
      style={{
        width: `${width}px`,
        left: `${position}px`,
        minWidth: '20px' // Ensure minimum visibility
      }}
      onClick={handleClick}
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
          {formatDuration(clip.duration)}
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
  );
}
