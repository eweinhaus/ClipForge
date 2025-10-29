import React, { useEffect, useRef } from 'react';
import './CompositePreview.css';

/**
 * CompositePreview Component
 * Shows live preview of screen + webcam composite recording
 * Displays screen video as main content with webcam as picture-in-picture inset
 */
const CompositePreview = ({
  screenStream = null,
  webcamStream = null,
  recordingState = 'idle',
  isRecording = false
}) => {
  const screenVideoRef = useRef(null);
  const webcamVideoRef = useRef(null);
  const containerRef = useRef(null);

  // Set up video streams when they change
  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
      screenVideoRef.current.play().catch(err => {
        console.warn('[CompositePreview] Screen video play failed:', err);
      });
    }
  }, [screenStream]);

  useEffect(() => {
    if (webcamVideoRef.current && webcamStream) {
      webcamVideoRef.current.srcObject = webcamStream;
      webcamVideoRef.current.play().catch(err => {
        console.warn('[CompositePreview] Webcam video play failed:', err);
      });
    }
  }, [webcamStream]);

  // Clean up streams when component unmounts
  useEffect(() => {
    return () => {
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = null;
      }
      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = null;
      }
    };
  }, []);

  const isActive = recordingState === 'recording' && (screenStream || webcamStream);

  return (
    <div className={`composite-preview ${isActive ? 'active' : ''}`} ref={containerRef}>
      <div className="preview-header">
        <h4>Composite Preview</h4>
        {isRecording && (
          <div className="recording-indicator">
            <div className="pulse-dot"></div>
            <span>Recording</span>
          </div>
        )}
      </div>

      <div className="preview-container">
        {/* Screen Video (Main Content) */}
        <div className="screen-video-container">
          <video
            ref={screenVideoRef}
            className="screen-video"
            muted
            playsInline
            autoPlay
          />
          {!screenStream && (
            <div className="no-stream-placeholder">
              <div className="placeholder-icon">🖥️</div>
              <p>Screen capture will appear here</p>
            </div>
          )}
        </div>

        {/* Webcam Video (Picture-in-Picture) */}
        <div className="webcam-video-container">
          <video
            ref={webcamVideoRef}
            className="webcam-video"
            muted
            playsInline
            autoPlay
          />
          {!webcamStream && (
            <div className="no-stream-placeholder webcam-placeholder">
              <div className="placeholder-icon">📹</div>
              <p>Webcam feed</p>
            </div>
          )}
        </div>

        {/* Recording Overlay */}
        {isRecording && (
          <div className="recording-overlay">
            <div className="recording-text">● REC</div>
          </div>
        )}
      </div>

      {/* Instructions */}
      {!isActive && (
        <div className="preview-instructions">
          <p>Start composite recording to see live preview</p>
          <div className="preview-features">
            <div className="feature-item">
              <span className="feature-icon">🖥️</span>
              <span>Screen capture</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📹</span>
              <span>Webcam inset</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🎤</span>
              <span>Audio mixing</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompositePreview;
