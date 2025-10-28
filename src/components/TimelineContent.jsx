import React from 'react';
import TimeRuler from './TimeRuler';
import TrackArea from './TrackArea';
import Playhead from './Playhead';
import './TimelineContent.css';

/**
 * TimelineContent Component
 * Main content area with time ruler, track area, and playhead
 */
export default function TimelineContent({
  clips,
  selectedClipId,
  onSelectClip,
  onDeleteClip,
  playheadPosition,
  onSeekToTime,
  zoomLevel,
  scrollPosition,
  onScrollChange
}) {
  const pxPerSecond = 50 * zoomLevel; // Base 50px per second at 1x zoom
  const totalDuration = clips.reduce((sum, clip) => sum + (clip.duration || 0), 0);
  const timelineWidth = totalDuration * pxPerSecond;

  return (
    <div className="timeline-content">
      <div className="timeline-scroll-container">
        <div 
          className="timeline-track-container"
          style={{ width: Math.max(timelineWidth, 800) }}
        >
          <TimeRuler 
            duration={totalDuration}
            pxPerSecond={pxPerSecond}
            scrollPosition={scrollPosition}
          />
          <div className="track-area-wrapper">
            <TrackArea
              clips={clips}
              selectedClipId={selectedClipId}
              onSelectClip={onSelectClip}
              onDeleteClip={onDeleteClip}
              pxPerSecond={pxPerSecond}
            />
            <Playhead
              position={playheadPosition}
              pxPerSecond={pxPerSecond}
              onSeekToTime={onSeekToTime}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
