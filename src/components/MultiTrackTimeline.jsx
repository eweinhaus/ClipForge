import React, { useState, useRef, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TimelineHeader from './TimelineHeader';
import TimelineControls from './TimelineControls';
import Playhead from './Playhead';
import ClipBlock from './ClipBlock';
import ClipBlockErrorBoundary from './ClipBlockErrorBoundary';
import { useTimelineKeyboard } from '../hooks/useTimelineKeyboard';
import './MultiTrackTimeline.css';

/**
 * SortableClipBlock Component
 * Individual clip block that can be dragged between tracks
 */
function SortableClipBlock({ 
  clip, 
  isSelected, 
  onSelect, 
  onDelete, 
  onDuplicate, 
  onResetTrim, 
  width, 
  position, 
  zoomLevel, 
  snapToGrid, 
  onTrimChange,
  trackId 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: clip.id, data: { trackId } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1100 : undefined,
  };

  return (
    <ClipBlock
      ref={setNodeRef}
      clip={clip}
      isSelected={isSelected}
      onSelect={onSelect}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onResetTrim={onResetTrim}
      width={width}
      position={position}
      zoomLevel={zoomLevel}
      snapToGrid={snapToGrid}
      onTrimChange={onTrimChange}
      dragAttributes={attributes}
      dragListeners={listeners}
      dragStyle={style}
      isDragging={isDragging}
    />
  );
}

/**
 * Track Component
 * Individual track container with droppable area
 */
function Track({ 
  trackId, 
  trackName, 
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
    <div className={`track ${trackId}`}>
      {trackName && (
        <div className="track-header">
          <span className="track-label">{trackName}</span>
          <span className="track-clip-count">{clips.length} clips</span>
        </div>
      )}
      <div className="track-content">
        <SortableContext id={trackId} items={clips.map(clip => clip.id)} strategy={rectSortingStrategy}>
          {clips.map((clip) => {
            const clipDuration = clip.duration || 0;
            const clipTrimStart = clip.trimStart || 0;
            const clipTrimEnd = clip.trimEnd || clipDuration;
            
            const trimmedDuration = clipTrimEnd - clipTrimStart;
            const clipWidth = Math.max(trimmedDuration * pxPerSecond, 20);
            const clipPosition = currentPosition + clipTrimStart * pxPerSecond;
            
            currentPosition += trimmedDuration * pxPerSecond;

            return (
              <ClipBlockErrorBoundary key={clip.id} clip={clip}>
                <SortableClipBlock
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
                  trackId={trackId}
                />
              </ClipBlockErrorBoundary>
            );
          })}
        </SortableContext>
      </div>
    </div>
  );
}

/**
 * MultiTrackTimeline Component
 * Multi-track timeline with drag & drop between tracks
 */
export default function MultiTrackTimeline({ 
  clips, 
  selectedClipId, 
  onSelectClip, 
  onDeleteClip, 
  onDuplicateClip,
  onResetTrim,
  playheadPosition,
  onSeekToTime,
  onTrimChange,
  onTrackChange,
  onReorderClips,
  onExport,
  isExporting
}) {
  const timelineHeight = 200; // Fixed height
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
  const containerRef = useRef(null);

  // Drag & drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Save preferences to localStorage when they change
  useEffect(() => {
    try {
      const prefs = {
        zoomLevel,
        scrollPosition
      };
      localStorage.setItem('clipforge.timelinePrefs', JSON.stringify(prefs));
    } catch (e) {
      console.warn('Failed to save timeline preferences:', e);
    }
  }, [zoomLevel, scrollPosition]);

  // Keyboard navigation hook
  useTimelineKeyboard({
    clips,
    selectedClipId,
    onSelectClip,
    onSeekToTime,
    playheadPosition,
    zoomLevel,
    timelineRef: containerRef
  });

  const handleZoomChange = (newZoom) => {
    setZoomLevel(newZoom);
  };

  const handleScrollChange = (newScroll) => {
    setScrollPosition(newScroll);
  };

  // Handle drag end for track changes and reordering
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) {
      return;
    }

    // Find the active clip
    const activeClip = clips.find(clip => clip.id === activeId);
    if (!activeClip) return;

    // Determine target track based on overId
    let targetTrack = 'main';
    if (overId === 'overlay-track') {
      targetTrack = 'overlay';
    } else if (overId === 'main-track') {
      targetTrack = 'main';
    } else {
      // Check if overId is another clip ID (reordering within same track)
      const overClip = clips.find(clip => clip.id === overId);
      if (overClip) {
        targetTrack = overClip.track;
      }
    }

    // If track changed, call onTrackChange
    if (activeClip.track !== targetTrack) {
      onTrackChange(activeId, targetTrack);
    } else {
      // Same track, handle reordering
      const activeIndex = clips.findIndex(clip => clip.id === activeId);
      const overIndex = clips.findIndex(clip => clip.id === overId);

      if (activeIndex === -1 || overIndex === -1) {
        return;
      }

      if (activeIndex !== overIndex) {
        onReorderClips(activeIndex, overIndex);
      }
    }
  };

  // Separate clips by track
  const mainClips = clips.filter(clip => clip.track === 'main' || !clip.track);
  const overlayClips = clips.filter(clip => clip.track === 'overlay');

  const pxPerSecond = 50 * zoomLevel;
  // Calculate total duration as max of main track (overlay can be shorter/longer)
  // For multi-track, we use the duration of the longest track as the timeline width
  const mainTrackDuration = mainClips.reduce((sum, clip) => {
    const trimmedDuration = (clip.trimEnd || clip.duration || 0) - (clip.trimStart || 0);
    return sum + trimmedDuration;
  }, 0);
  const overlayTrackDuration = overlayClips.reduce((sum, clip) => {
    const trimmedDuration = (clip.trimEnd || clip.duration || 0) - (clip.trimStart || 0);
    return sum + trimmedDuration;
  }, 0);
  const totalDuration = Math.max(mainTrackDuration, overlayTrackDuration);
  const timelineWidth = totalDuration * pxPerSecond;

  if (clips.length === 0) {
    return (
      <div className="multi-track-timeline timeline-empty" style={{ height: timelineHeight }}>
        <div className="empty-state">
          <p>No clips yet</p>
          <p className="empty-hint">Import videos to get started!</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="multi-track-timeline"
      ref={containerRef}
      style={{ height: timelineHeight }}
      tabIndex={0}
      onMouseEnter={() => {
        if (containerRef.current) {
          containerRef.current.focus();
        }
      }}
    >
      <TimelineHeader />
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="timeline-content">
          <div className="timeline-scroll-container">
            <div 
              className="timeline-track-container"
              style={{ width: Math.max(timelineWidth, 800) }}
            >
              <div className="time-ruler">
                {/* Time ruler content */}
              </div>
              
              <div className="tracks-container">
                <Track
                  trackId="main-track"
                  trackName=""
                  clips={mainClips}
                  selectedClipId={selectedClipId}
                  onSelectClip={onSelectClip}
                  onDeleteClip={onDeleteClip}
                  onDuplicateClip={onDuplicateClip}
                  onResetTrim={onResetTrim}
                  pxPerSecond={pxPerSecond}
                  zoomLevel={zoomLevel}
                  snapToGrid={true}
                  onTrimChange={onTrimChange}
                />
                
                <Track
                  trackId="overlay-track"
                  trackName="Overlay"
                  clips={overlayClips}
                  selectedClipId={selectedClipId}
                  onSelectClip={onSelectClip}
                  onDeleteClip={onDeleteClip}
                  onDuplicateClip={onDuplicateClip}
                  onResetTrim={onResetTrim}
                  pxPerSecond={pxPerSecond}
                  zoomLevel={zoomLevel}
                  snapToGrid={true}
                  onTrimChange={onTrimChange}
                />
              </div>
              
              {/* Playhead */}
              <Playhead
                position={playheadPosition}
                pxPerSecond={pxPerSecond}
                onSeekToTime={onSeekToTime}
              />
            </div>
          </div>
        </div>
      </DndContext>
      
      <TimelineControls
        zoomLevel={zoomLevel}
        onZoomChange={handleZoomChange}
        scrollPosition={scrollPosition}
        onScrollChange={handleScrollChange}
        clips={clips}
        timelineWidth={timelineWidth}
        onExport={onExport}
        isExporting={isExporting}
      />
    </div>
  );
}
