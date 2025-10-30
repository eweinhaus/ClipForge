import React, { useState, useRef, useEffect } from 'react';
import TimelineHeader from './TimelineHeader';
import TimelineContent from './TimelineContent';
import TimelineControls from './TimelineControls';
import { useTimelineKeyboard } from '../hooks/useTimelineKeyboard';
import './TimelineContainer.css';

/**
 * TimelineContainer Component
 * Bottom-docked resizable horizontal timeline container
 */
export default function TimelineContainer({ 
  clips, 
  selectedClipId, 
  onSelectClip, 
  onDeleteClip, 
  onDuplicateClip,
  onResetTrim,
  playheadPosition,
  onSeekToTime,
  onTrimChange,
  onExport,
  isExporting,
  onSplitClip,
  canSplitClip
}) {
  const timelineHeight = 240; // Fixed height - increased for 3 tracks
  const [zoomLevel, setZoomLevel] = useState(() => {
    try {
      const saved = localStorage.getItem('clipforge.timelinePrefs');
      if (saved) {
        const prefs = JSON.parse(saved);
        return prefs.zoomLevel || 1;
      }
    } catch (e) {
      console.warn('Failed to load timeline preferences:', e);
    }
    return 1;
  });
  const [scrollPosition, setScrollPosition] = useState(() => {
    try {
      const saved = localStorage.getItem('clipforge.timelinePrefs');
      if (saved) {
        const prefs = JSON.parse(saved);
        return prefs.scrollPosition || 0;
      }
    } catch (e) {
      console.warn('Failed to load timeline preferences:', e);
    }
    return 0;
  });
  const [hiddenTracks, setHiddenTracks] = useState(() => {
    try {
      const saved = localStorage.getItem('clipforge.timelinePrefs');
      if (saved) {
        const prefs = JSON.parse(saved);
        return prefs.hiddenTracks || [];
      }
    } catch (e) {
      console.warn('Failed to load timeline preferences:', e);
    }
    return [];
  });
  const containerRef = useRef(null);

  // Save preferences to localStorage when they change
  useEffect(() => {
    try {
      const prefs = {
        zoomLevel,
        scrollPosition,
        hiddenTracks
      };
      localStorage.setItem('clipforge.timelinePrefs', JSON.stringify(prefs));
    } catch (e) {
      console.warn('Failed to save timeline preferences:', e);
    }
  }, [zoomLevel, scrollPosition, hiddenTracks]);

  // Keyboard navigation hook
  useTimelineKeyboard({
    clips,
    selectedClipId,
    onSelectClip,
    onSeekToTime,
    playheadPosition,
    zoomLevel,
    timelineRef: containerRef,
    onSplitClip,
    canSplitClip
  });


  const handleZoomChange = (newZoom) => {
    setZoomLevel(newZoom);
  };

  const handleScrollChange = (newScroll) => {
    setScrollPosition(newScroll);
  };

  const handleToggleTrackVisibility = (trackId) => {
    setHiddenTracks(prev => {
      if (prev.includes(trackId)) {
        return prev.filter(id => id !== trackId);
      } else {
        return [...prev, trackId];
      }
    });
  };

  if (clips.length === 0) {
    return (
      <div className="timeline-container timeline-empty" style={{ height: timelineHeight }}>
      </div>
    );
  }

  return (
    <div 
      className="timeline-container"
      ref={containerRef}
      style={{ height: timelineHeight }}
      tabIndex={0}
      onMouseEnter={() => {
        // Focus timeline when mouse enters for keyboard navigation
        if (containerRef.current) {
          containerRef.current.focus();
        }
      }}
    >
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <TimelineHeader 
          hiddenTracks={hiddenTracks}
          onToggleTrackVisibility={handleToggleTrackVisibility}
        />
        <TimelineContent
          clips={clips}
          selectedClipId={selectedClipId}
          onSelectClip={onSelectClip}
          onDeleteClip={onDeleteClip}
          onDuplicateClip={onDuplicateClip}
          onResetTrim={onResetTrim}
          playheadPosition={playheadPosition}
          onSeekToTime={onSeekToTime}
          zoomLevel={zoomLevel}
          scrollPosition={scrollPosition}
          onScrollChange={handleScrollChange}
          onTrimChange={onTrimChange}
          hiddenTracks={hiddenTracks}
        />
      </div>
      <TimelineControls
        zoomLevel={zoomLevel}
        onZoomChange={handleZoomChange}
        scrollPosition={scrollPosition}
        onScrollChange={handleScrollChange}
        clips={clips}
        timelineWidth={800} // TODO: Calculate actual timeline width
        onExport={onExport}
        isExporting={isExporting}
        onSplitClip={onSplitClip}
        canSplitClip={canSplitClip}
      />
    </div>
  );
}
