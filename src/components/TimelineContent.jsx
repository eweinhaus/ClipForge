import React, { useRef, useEffect, useState } from 'react';
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
  
  const contentRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const updateWidth = () => {
      if (contentRef.current) {
        // Get the width of the timeline-content container minus the label width (120px)
        const width = contentRef.current.offsetWidth - 120;
        setContainerWidth(width);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Ensure timeline extends to at least the container width
  const effectiveTimelineWidth = Math.max(timelineWidth, containerWidth);

  return (
    <div className="timeline-content" ref={contentRef}>
      <div className="timeline-scroll-container">
        <div className="timeline-with-labels">
          <div className="timeline-ruler-row">
            <div className="timeline-label-spacer"></div>
            <div 
              className="timeline-track-container"
              style={{ width: effectiveTimelineWidth }}
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
                  <div className="track-content" style={{ width: effectiveTimelineWidth }}>
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
