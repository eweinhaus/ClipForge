import React from 'react';
import TimeRuler from './TimeRuler';
import TrackArea from './TrackArea';
import Playhead from './Playhead';
import { TRACK_CONFIG } from '../utils/constants';
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
  onDuplicateClip,
  onResetTrim,
  playheadPosition,
  onSeekToTime,
  zoomLevel,
  scrollPosition,
  onScrollChange,
  snapToGrid,
  onTrimChange,
  hiddenTracks = []
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
            {TRACK_CONFIG.map((trackConfig) => {
              // Filter clips for this track
              const trackClips = clips.filter(clip => 
                (clip.track || 'main') === trackConfig.id
              );

              // Skip hidden tracks
              if (hiddenTracks.includes(trackConfig.id)) {
                return null;
              }

              return (
                <TrackArea
                  key={trackConfig.id}
                  trackId={trackConfig.id}
                  trackConfig={trackConfig}
                  clips={trackClips}
                  selectedClipId={selectedClipId}
                  onSelectClip={onSelectClip}
                  onDeleteClip={onDeleteClip}
                  onDuplicateClip={onDuplicateClip}
                  onResetTrim={onResetTrim}
                  pxPerSecond={pxPerSecond}
                  zoomLevel={zoomLevel}
                  snapToGrid={snapToGrid}
                  onTrimChange={onTrimChange}
                />
              );
            })}
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
