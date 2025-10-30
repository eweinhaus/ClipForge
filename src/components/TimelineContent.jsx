import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
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
  hiddenTracks = [],
  onToggleTrackVisibility
}) {
  const pxPerSecond = 50 * zoomLevel; // Base 50px per second at 1x zoom
  const totalDuration = clips.reduce((sum, clip) => sum + (clip.duration || 0), 0);
  const timelineWidth = totalDuration * pxPerSecond;

  return (
    <div className="timeline-content">
      <div className="timeline-scroll-container">
        <div className="timeline-with-labels">
          <div className="timeline-ruler-row">
            <div className="timeline-label-spacer"></div>
            <div 
              className="timeline-track-container"
              style={{ width: Math.max(timelineWidth, 800) }}
            >
              <TimeRuler 
                duration={totalDuration}
                pxPerSecond={pxPerSecond}
                scrollPosition={scrollPosition}
              />
            </div>
          </div>
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
                <div key={trackConfig.id} className="track-row">
                  <div className="track-label">
                    <span className="track-name">{trackConfig.label}</span>
                    {onToggleTrackVisibility && (
                      <button
                        className="track-visibility-toggle"
                        onClick={() => onToggleTrackVisibility(trackConfig.id)}
                        title={hiddenTracks.includes(trackConfig.id) ? 'Show track' : 'Hide track'}
                        aria-label={hiddenTracks.includes(trackConfig.id) ? `Show ${trackConfig.label}` : `Hide ${trackConfig.label}`}
                      >
                        {hiddenTracks.includes(trackConfig.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    )}
                  </div>
                  <TrackArea
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
                </div>
              );
            })}
          </div>
          <Playhead
            position={playheadPosition}
            pxPerSecond={pxPerSecond}
            onSeekToTime={onSeekToTime}
          />
        </div>
      </div>
    </div>
  );
}
