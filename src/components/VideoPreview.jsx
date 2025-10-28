import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Play, Pause, Video, AlertTriangle } from 'lucide-react';
import { formatDuration, formatResolution } from '../utils/formatters';
import './VideoPreview.css';

/**
 * VideoPreview Component
 * Displays video player with controls for the selected clip
 */
const VideoPreview = forwardRef(({ clip, onPlaybackChange }, ref) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Expose seek method to parent component
  useImperativeHandle(ref, () => ({
    seekTo: (time) => {
      if (videoRef.current && clip) {
        const trimStart = clip.trimStart || 0;
        const trimEnd = clip.trimEnd || clip.duration || 0;
        
        // Clamp seek time within trim range
        const clampedTime = Math.max(trimStart, Math.min(trimEnd, time));
        
        videoRef.current.currentTime = clampedTime;
        setCurrentTime(clampedTime);
      }
    }
  }));

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
    setCurrentTime(clip.trimStart || 0);
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

      video.onloadedmetadata = () => {
        handleLoadedMetadata();
      };

      video.oncanplay = () => {
        // Only seek to trim start if video is ready and we have a trim start > 0
        if (clip.trimStart > 0 && videoRef.current) {
          const currentTime = videoRef.current.currentTime;
          // Only seek if we're not already at the trim start
          if (Math.abs(currentTime - clip.trimStart) > 0.1) {
            videoRef.current.currentTime = clip.trimStart;
            setCurrentTime(clip.trimStart);
          }
        }
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
    if (videoRef.current && clip) {
      const video = videoRef.current;
      let newTime = video.currentTime;
      
      // Clamp time within trim range
      const trimStart = clip.trimStart || 0;
      const trimEnd = clip.trimEnd || clip.duration || 0;
      
      // Only clamp if we're actually outside the trim range
      if (trimStart > 0 && newTime < trimStart) {
        newTime = trimStart;
        video.currentTime = trimStart;
      } else if (trimEnd < clip.duration && newTime > trimEnd) {
        newTime = trimEnd;
        video.currentTime = trimEnd;
        video.pause(); // Pause when reaching trim end
        setIsPlaying(false);
      }
      
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
    if (!videoRef.current || hasError) {
      return;
    }

    const video = videoRef.current;
    const trimStart = clip?.trimStart || 0;
    
    if (isPlaying) {
      video.pause();
    } else {
      // Ensure we're at trim start if needed
      if (trimStart > 0 && video.currentTime < trimStart) {
        video.currentTime = trimStart;
      }
      video.play();
    }
  };

  const handleScrub = (e) => {
    if (!videoRef.current || hasError || !clip) return;
    
    const newTime = parseFloat(e.target.value);
    const trimStart = clip.trimStart || 0;
    const trimEnd = clip.trimEnd || clip.duration || 0;
    
    // Clamp scrubber value within trim range
    const clampedTime = Math.max(trimStart, Math.min(trimEnd, newTime));
    
    videoRef.current.currentTime = clampedTime;
    setCurrentTime(clampedTime);
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
            <Video size={80} strokeWidth={1.5} />
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
          <div className="empty-icon error">
            <AlertTriangle size={80} strokeWidth={1.5} />
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
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
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
            min={clip?.trimStart || 0}
            max={clip?.trimEnd || duration || 0}
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
          <span className="metadata-label">Res:</span>
          <span className="metadata-value">
            {formatResolution(clip.width, clip.height)}
          </span>
        </div>
        <div className="metadata-item">
          <span className="metadata-label">Dur:</span>
          <span className="metadata-value">
            {formatDuration((clip.trimEnd || clip.duration) - (clip.trimStart || 0))}
          </span>
        </div>
      </div>
    </div>
  );
});

VideoPreview.displayName = 'VideoPreview';

export default VideoPreview;
