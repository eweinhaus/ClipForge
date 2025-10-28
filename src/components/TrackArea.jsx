import React from 'react';
import ClipBlock from './ClipBlock';
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
          const trimmedDuration = (clip.trimEnd || clip.duration || 0) - (clip.trimStart || 0);
          const clipWidth = trimmedDuration * pxPerSecond;
          const clipPosition = currentPosition + (clip.trimStart || 0) * pxPerSecond;
          currentPosition += clip.duration * pxPerSecond; // Use full duration for spacing

          return (
            <ClipBlock
              key={clip.id}
              clip={clip}
              isSelected={clip.id === selectedClipId}
              onSelect={() => onSelectClip(clip.id)}
              onDelete={() => onDeleteClip(clip.id)}
              width={clipWidth}
              position={clipPosition}
              zoomLevel={zoomLevel}
              snapToGrid={snapToGrid}
              onTrimChange={onTrimChange}
            />
          );
        })}
      </div>
    </div>
  );
}
