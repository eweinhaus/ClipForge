import React from 'react';
import ClipBlock from './ClipBlock';
import ClipBlockErrorBoundary from './ClipBlockErrorBoundary';
import './TrackArea.css';

/**
 * TrackArea Component
 * Area containing clip blocks arranged horizontally
 */
export default function TrackArea({ 
  clips, 
  selectedClipId, 
  onSelectClip, 
  onDeleteClip, 
  onDuplicateClip,
  onResetTrim,
  pxPerSecond,
  zoomLevel,
  snapToGrid,
  onTrimChange
}) {
  let currentPosition = 0;

  return (
    <div className="track-area">
      <div className="track">
        {clips.map((clip) => {
          // Ensure clip has required properties with fallbacks
          const clipDuration = clip.duration || 0;
          const clipTrimStart = clip.trimStart || 0;
          const clipTrimEnd = clip.trimEnd || clipDuration;
          
          const trimmedDuration = clipTrimEnd - clipTrimStart;
          const clipWidth = Math.max(trimmedDuration * pxPerSecond, 20); // Minimum 20px width
          // Position clips sequentially without gaps - trimStart is only for video playback, not positioning
          const clipPosition = currentPosition;
          
          // Update position for next clip (use trimmed duration for spacing)
          currentPosition += trimmedDuration * pxPerSecond;

          return (
            <ClipBlockErrorBoundary key={clip.id} clip={clip}>
              <ClipBlock
                clip={clip}
                isSelected={clip.id === selectedClipId}
                onSelect={() => onSelectClip(clip.id)}
                onDelete={() => onDeleteClip(clip.id)}
                onDuplicate={() => onDuplicateClip(clip.id)}
                onResetTrim={() => onResetTrim(clip.id)}
                width={clipWidth}
                position={clipPosition}
                zoomLevel={zoomLevel}
                snapToGrid={snapToGrid}
                onTrimChange={onTrimChange}
              />
            </ClipBlockErrorBoundary>
          );
        })}
      </div>
    </div>
  );
}
