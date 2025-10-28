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
  pxPerSecond 
}) {
  let currentPosition = 0;

  return (
    <div className="track-area">
      <div className="track">
        {clips.map((clip) => {
          const clipWidth = (clip.duration || 0) * pxPerSecond;
          const clipPosition = currentPosition;
          currentPosition += clipWidth;

          return (
            <ClipBlock
              key={clip.id}
              clip={clip}
              isSelected={clip.id === selectedClipId}
              onSelect={() => onSelectClip(clip.id)}
              onDelete={() => onDeleteClip(clip.id)}
              width={clipWidth}
              position={clipPosition}
            />
          );
        })}
      </div>
    </div>
  );
}
