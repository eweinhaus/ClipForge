import React, { useRef, useState, useEffect } from 'react';
import { formatDuration, formatResolution } from '../utils/formatters';
import './VideoPreview.css';

/**
 * VideoPreview Component
 * Displays video player with controls for the selected clip
 */
export default function VideoPreview({ clip, onPlaybackChange }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Reset state when clip changes
  useEffect(() => {
    if (!clip) {
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setHasError(false);
      return;
    }

    // Reset playback state for new clip
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(clip.duration || 0);
    setHasError(false);
    setIsLoading(true);

    // Load new video source
    if (videoRef.current) {
      const video = videoRef.current;
      
      // Prefer custom protocol to avoid file:// restrictions
      const rawPath = clip.filePath.replace(/^file:\/\//, '');
      const videoSrc = `local-media://${rawPath}`;
      
      video.src = videoSrc;
      video.load();

      // Enhanced logging
      video.onloadedmetadata = () => {
        console.log('[Video] loadedmetadata', {
          src: videoSrc,
          duration: video.duration,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          readyState: video.readyState,
        });
        handleLoadedMetadata();
      };

      video.oncanplay = () => {
        console.log('[Video] canplay', { src: videoSrc, readyState: video.readyState });
      };

      video.onerror = (e) => {
        const mediaError = video.error || {};
        console.error('[Video] error event', {
          src: videoSrc,
          code: mediaError.code,
          message: mediaError.message,
          networkState: video.networkState,
          readyState: video.readyState,
        });
        console.error('Video element error:', e);
      };

      video.onstalled = () => console.warn('[Video] stalled', { src: videoSrc });
      video.onsuspend = () => console.warn('[Video] suspend', { src: videoSrc });
      video.onwaiting = () => console.warn('[Video] waiting', { src: videoSrc });
    }
  }, [clip]);

  // Handle video events
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
      setIsLoading(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const newTime = videoRef.current.currentTime;
      setCurrentTime(newTime);
      onPlaybackChange?.(newTime);
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
    setIsPlaying(false);
  };

  // Playback controls
  const togglePlayPause = () => {
    if (!videoRef.current || hasError) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  const handleScrub = (e) => {
    if (!videoRef.current || hasError) return;
    
    const newTime = parseFloat(e.target.value);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && clip && !hasError) {
        e.preventDefault();
        togglePlayPause();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clip, hasError, isPlaying]);

  // No clip selected state
  if (!clip) {
    return (
      <div className="video-preview">
        <div className="preview-placeholder">
          <div className="empty-icon">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
            </svg>
          </div>
          <h2>No clip selected</h2>
          <p className="text-muted">Select a clip from the timeline to preview</p>
        </div>
      </div>
    );
  }

  // Error state
  if (hasError) {
    return (
      <div className="video-preview">
        <div className="preview-placeholder">
          <div className="empty-icon">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor">
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
            </svg>
          </div>
          <h2>Video Error</h2>
          <p className="text-muted">Unable to load video file</p>
          <p className="text-muted">{clip.fileName}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="video-preview">
      {/* Video Container */}
      <div className="video-container">
        <video
          ref={videoRef}
          className="video-element"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
          onError={handleError}
          preload="metadata"
        />
        
        {/* Loading overlay */}
        {isLoading && (
          <div className="video-loading">
            <div className="loading-spinner"></div>
            <p>Loading video...</p>
          </div>
        )}
      </div>

      {/* Video Controls */}
      <div className="video-controls">
        {/* Play/Pause Button */}
        <button
          className="control-btn play-btn"
          onClick={togglePlayPause}
          disabled={isLoading}
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        >
          {isPlaying ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1"/>
              <rect x="14" y="4" width="4" height="16" rx="1"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>

        {/* Time Display */}
        <div className="time-display">
          <span>{formatDuration(currentTime)}</span>
          <span className="time-separator">/</span>
          <span>{formatDuration(duration)}</span>
        </div>

        {/* Scrubber */}
        <div className="scrubber-container">
          <input
            type="range"
            className="scrubber"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleScrub}
            step="0.1"
            disabled={isLoading || duration === 0}
          />
        </div>
      </div>

      {/* Video Metadata */}
      <div className="video-metadata">
        <div className="metadata-item">
          <span className="metadata-label">File:</span>
          <span className="metadata-value" title={clip.fileName}>
            {clip.fileName}
          </span>
        </div>
        <div className="metadata-item">
          <span className="metadata-label">Resolution:</span>
          <span className="metadata-value">
            {formatResolution(clip.width, clip.height)}
          </span>
        </div>
        <div className="metadata-item">
          <span className="metadata-label">Duration:</span>
          <span className="metadata-value">
            {formatDuration(clip.duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
