import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Play, Pause, Video, AlertTriangle } from 'lucide-react';
import { formatDuration, formatResolution } from '../utils/formatters';
import './MultiTrackVideoPreview.css';

/**
 * MultiTrackVideoPreview Component
 * Displays video player with controls for multi-track timeline
 * Shows main track video with overlay track as picture-in-picture
 */
const MultiTrackVideoPreview = forwardRef(({ 
  clips, 
  selectedClipId, 
  currentPlaybackTime,
  onPlaybackChange, 
  onClipEnded, 
  shouldAutoPlay, 
  onAutoPlayStarted 
}, ref) => {
  const mainVideoRef = useRef(null);
  const overlayVideoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [mainClip, setMainClip] = useState(null);
  const [overlayClip, setOverlayClip] = useState(null);

  // Calculate which clips should be playing at current time
  useEffect(() => {
    if (!clips || clips.length === 0) {
      setMainClip(null);
      setOverlayClip(null);
      return;
    }

    // Find clips that should be playing at current time
    let cumulativeTime = 0;
    let foundMainClip = null;
    let foundOverlayClip = null;

    // Sort clips by track and order
    const sortedClips = [...clips].sort((a, b) => {
      if (a.track !== b.track) {
        return a.track === 'main' ? -1 : 1;
      }
      return (a.order || 0) - (b.order || 0);
    });

    for (const clip of sortedClips) {
      const trimmedDuration = (clip.trimEnd || clip.duration || 0) - (clip.trimStart || 0);
      
      if (currentPlaybackTime >= cumulativeTime && currentPlaybackTime < cumulativeTime + trimmedDuration) {
        if (clip.track === 'main' || !clip.track) {
          foundMainClip = clip;
        } else if (clip.track === 'overlay') {
          foundOverlayClip = clip;
        }
      }
      
      cumulativeTime += trimmedDuration;
    }

    setMainClip(foundMainClip);
    setOverlayClip(foundOverlayClip);
  }, [clips, currentPlaybackTime]);

  // Expose seek method to parent component
  useImperativeHandle(ref, () => ({
    seekTo: (time) => {
      setCurrentTime(time);
      if (mainVideoRef.current) {
        mainVideoRef.current.currentTime = time;
      }
      if (overlayVideoRef.current) {
        overlayVideoRef.current.currentTime = time;
      }
    }
  }));

  // Handle main video loading
  useEffect(() => {
    if (!mainClip) {
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setHasError(false);
      return;
    }

    setIsLoading(true);
    setHasError(false);

    if (mainVideoRef.current) {
      const video = mainVideoRef.current;
      const rawPath = mainClip.filePath.replace(/^file:\/\//, '');
      const videoSrc = `local-media://${rawPath}`;
      
      video.src = videoSrc;
      video.load();

      video.onloadedmetadata = () => {
        setDuration(mainClip.duration || 0);
        setIsLoading(false);
      };

      video.oncanplay = () => {
        if (mainClip.trimStart > 0) {
          video.currentTime = mainClip.trimStart;
        }
      };

      video.onerror = () => {
        setHasError(true);
        setIsLoading(false);
      };
    }
  }, [mainClip]);

  // Handle overlay video loading
  useEffect(() => {
    if (!overlayClip || !overlayVideoRef.current) return;

    const video = overlayVideoRef.current;
    const rawPath = overlayClip.filePath.replace(/^file:\/\//, '');
    const videoSrc = `local-media://${rawPath}`;
    
    video.src = videoSrc;
    video.load();

    video.oncanplay = () => {
      if (overlayClip.trimStart > 0) {
        video.currentTime = overlayClip.trimStart;
      }
    };
  }, [overlayClip]);

  // Sync overlay video with main video
  useEffect(() => {
    if (mainVideoRef.current && overlayVideoRef.current && isPlaying) {
      const syncVideos = () => {
        if (overlayVideoRef.current && mainVideoRef.current) {
          overlayVideoRef.current.currentTime = mainVideoRef.current.currentTime;
        }
        if (isPlaying) {
          requestAnimationFrame(syncVideos);
        }
      };
      syncVideos();
    }
  }, [isPlaying]);

  // Handle auto-play
  useEffect(() => {
    if (shouldAutoPlay && mainVideoRef.current && mainClip && !isLoading && !hasError) {
      mainVideoRef.current.play();
      setIsPlaying(true);
      onAutoPlayStarted();
    }
  }, [shouldAutoPlay, mainClip, isLoading, hasError, onAutoPlayStarted]);

  const handleTimeUpdate = () => {
    if (mainVideoRef.current) {
      const time = mainVideoRef.current.currentTime;
      setCurrentTime(time);
      
      // Calculate timeline position and notify parent
      if (mainClip && onPlaybackChange) {
        const timelinePosition = calculateTimelinePosition(mainClip, time);
        onPlaybackChange(timelinePosition);
      }
    }
  };

  // Helper function to calculate timeline position
  const calculateTimelinePosition = useCallback((clip, timeInClip) => {
    if (!clips || clips.length === 0) return 0;
    
    let cumulativeTime = 0;
    
    // Find the clip index
    const clipIndex = clips.findIndex(c => c.id === clip.id);
    if (clipIndex === -1) return 0;
    
    // Add duration of all previous clips
    for (let i = 0; i < clipIndex; i++) {
      const prevClip = clips[i];
      const trimmedDuration = (prevClip.trimEnd || prevClip.duration || 0) - (prevClip.trimStart || 0);
      cumulativeTime += trimmedDuration;
    }
    
    // Add the current time within the current clip
    cumulativeTime += timeInClip;
    
    return cumulativeTime;
  }, [clips]);

  const handlePlayPause = useCallback(() => {
    if (!mainVideoRef.current) return;

    if (isPlaying) {
      mainVideoRef.current.pause();
      if (overlayVideoRef.current) {
        overlayVideoRef.current.pause();
      }
      setIsPlaying(false);
    } else {
      mainVideoRef.current.play();
      if (overlayVideoRef.current) {
        overlayVideoRef.current.play();
      }
      setIsPlaying(true);
    }
    
    if (mainClip && onPlaybackChange) {
      const currentVideoTime = mainVideoRef.current.currentTime || 0;
      const timelinePosition = calculateTimelinePosition(mainClip, currentVideoTime);
      onPlaybackChange(timelinePosition);
    }
  }, [calculateTimelinePosition, isPlaying, mainClip, onPlaybackChange]);

  const handleVideoEnded = () => {
    setIsPlaying(false);
    onClipEnded();
  };

  // Keyboard shortcut for play/pause (Space bar)
  useEffect(() => {
    if (!mainClip || hasError) {
      return;
    }

    const handleKeyDown = (event) => {
      if (event.code !== 'Space') {
        return;
      }

      const activeElement = document.activeElement;
      const isTyping = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.isContentEditable
      );

      if (isTyping) {
        return;
      }

      event.preventDefault();

      if (!isLoading) {
        handlePlayPause();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayPause, hasError, isLoading, mainClip]);

  const handleSeek = (e) => {
    if (!mainVideoRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    
    mainVideoRef.current.currentTime = newTime;
    if (overlayVideoRef.current) {
      overlayVideoRef.current.currentTime = newTime;
    }
    setCurrentTime(newTime);
  };

  if (!mainClip) {
    return (
      <div className="multi-track-preview empty">
        <div className="empty-state">
          <Video size={48} />
          <h3>No Video Selected</h3>
          <p>Select a clip from the timeline to preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className="multi-track-preview">
      <div className="preview-container">
        {/* Main Video */}
        <div className="main-video-container">
          <video
            ref={mainVideoRef}
            className="main-video"
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleVideoEnded}
            onClick={handleSeek}
            muted={false}
          />
          
          {/* Overlay Video (Picture-in-Picture) */}
          {overlayClip && (
            <div className="overlay-video-container">
              <video
                ref={overlayVideoRef}
                className="overlay-video"
                muted={true} // Mute overlay to avoid audio conflicts
              />
            </div>
          )}
          
          {/* Loading Overlay */}
          {isLoading && (
            <div className="loading-overlay">
              <div className="loading-spinner" />
              <p>Loading video...</p>
            </div>
          )}
          
          {/* Error Overlay */}
          {hasError && (
            <div className="error-overlay">
              <AlertTriangle size={48} />
              <h3>Error Loading Video</h3>
              <p>Unable to load the selected video file</p>
            </div>
          )}
        </div>
        
        {/* Controls */}
        <div className="preview-controls">
          <button 
            className="play-pause-btn"
            onClick={handlePlayPause}
            disabled={isLoading || hasError}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
          
          <div className="scrubber-container" onClick={handleSeek}>
            <div className="scrubber-track">
              <div 
                className="scrubber-progress"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
              <div 
                className="scrubber-handle"
                style={{ left: `${(currentTime / duration) * 100}%` }}
              />
            </div>
          </div>
          
          <div className="time-display">
            <span>{formatDuration(currentTime)}</span>
            <span>/</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>
        
        {/* Metadata */}
        <div className="preview-metadata">
          <div className="clip-info">
            <h4>{mainClip.fileName}</h4>
            <div className="clip-details">
              <span>{formatDuration(mainClip.duration)}</span>
              <span>•</span>
              <span>{formatResolution(mainClip.width, mainClip.height)}</span>
              {mainClip.track && (
                <>
                  <span>•</span>
                  <span className="track-label">{mainClip.track}</span>
                </>
              )}
            </div>
          </div>
          
          {overlayClip && (
            <div className="overlay-info">
              <span className="overlay-label">Overlay: {overlayClip.fileName}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

MultiTrackVideoPreview.displayName = 'MultiTrackVideoPreview';

export default MultiTrackVideoPreview;
