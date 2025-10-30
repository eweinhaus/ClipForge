import { useEffect, useRef } from 'react';

/**
 * Custom hook for timeline keyboard navigation
 * Handles arrow key navigation for playhead seeking and clip selection
 */
export function useTimelineKeyboard({
  clips,
  selectedClipId,
  onSelectClip,
  onSeekToTime,
  playheadPosition,
  zoomLevel,
  timelineRef,
  onSplitClip,
  canSplitClip
}) {
  const lastKeyTime = useRef(0);
  const keyRepeatTimeout = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle arrow keys when timeline is focused
      if (!timelineRef.current || !timelineRef.current.contains(document.activeElement)) {
        return;
      }

      // Prevent default browser behavior for arrow keys and 'S' key
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 's', 'S'].includes(e.key)) {
        e.preventDefault();
      }

      const now = Date.now();
      const timeSinceLastKey = now - lastKeyTime.current;
      
      // Throttle key repeats to avoid flooding state updates (except for split)
      if (timeSinceLastKey < 100 && !['s', 'S'].includes(e.key)) {
        return;
      }
      
      lastKeyTime.current = now;

      switch (e.key) {
        case 's':
        case 'S':
          // Split clip at playhead (only if valid)
          if (canSplitClip && onSplitClip) {
            onSplitClip();
          }
          break;
        case 'ArrowLeft':
          // Seek playhead backward by 1 second (adjusted by zoom level)
          const seekBackward = Math.max(0, playheadPosition - (1 / zoomLevel));
          onSeekToTime(seekBackward);
          break;
          
        case 'ArrowRight':
          // Seek playhead forward by 1 second (adjusted by zoom level)
          const totalDuration = clips.reduce((total, clip) => {
            const trimmedDuration = (clip.trimEnd || clip.duration || 0) - (clip.trimStart || 0);
            return total + trimmedDuration;
          }, 0);
          const seekForward = Math.min(totalDuration, playheadPosition + (1 / zoomLevel));
          onSeekToTime(seekForward);
          break;
          
        case 'ArrowUp':
          // Select previous clip
          if (clips.length > 0) {
            const currentIndex = clips.findIndex(clip => clip.id === selectedClipId);
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : clips.length - 1;
            onSelectClip(clips[prevIndex].id);
          }
          break;
          
        case 'ArrowDown':
          // Select next clip
          if (clips.length > 0) {
            const currentIndex = clips.findIndex(clip => clip.id === selectedClipId);
            const nextIndex = currentIndex < clips.length - 1 ? currentIndex + 1 : 0;
            onSelectClip(clips[nextIndex].id);
          }
          break;
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (keyRepeatTimeout.current) {
        clearTimeout(keyRepeatTimeout.current);
      }
    };
  }, [clips, selectedClipId, onSelectClip, onSeekToTime, playheadPosition, zoomLevel, timelineRef, onSplitClip, canSplitClip]);
}
