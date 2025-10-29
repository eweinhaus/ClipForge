import React, { useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import './WebcamPreview.css';

/**
 * WebcamPreview Component
 * Shows live webcam feed with microphone toggle
 */
const WebcamPreview = ({
  stream = null,
  isRecording = false,
  micEnabled = true,
  onMicToggle = () => {}
}) => {
  const videoRef = useRef(null);

  // Set up video stream when component mounts or stream changes
  useEffect(() => {
    if (videoRef.current && stream) {
      console.log('[WebcamPreview] Setting up video stream');
      videoRef.current.srcObject = stream;
      
      // Ensure video plays
      videoRef.current.play().catch(err => {
        console.warn('[WebcamPreview] Video play failed:', err);
      });
    }
  }, [stream]);

  // Clean up stream when component unmounts
  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        console.log('[WebcamPreview] Cleaning up video stream');
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  const handleMicToggle = () => {
    console.log('[WebcamPreview] Microphone toggle clicked');
    onMicToggle();
  };

  return (
    <div className={`webcam-preview ${isRecording ? 'recording' : ''}`}>
      <div className="preview-container">
        <video
          ref={videoRef}
          className="preview-video"
          autoPlay
          muted
          playsInline
          width="320"
          height="240"
        />
        
        {isRecording && (
          <div className="recording-indicator">
            <div className="recording-dot"></div>
            <span>REC</span>
          </div>
        )}
      </div>

      <div className="preview-controls">
        <button
          className={`mic-toggle ${micEnabled ? 'enabled' : 'disabled'}`}
          onClick={handleMicToggle}
          title={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
          aria-label={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
        >
          {micEnabled ? (
            <Mic size={16} />
          ) : (
            <MicOff size={16} />
          )}
          <span>{micEnabled ? 'Mic On' : 'Mic Off'}</span>
        </button>
      </div>

      {!stream && (
        <div className="no-stream-message">
          <p>No camera feed available</p>
          <p className="hint">Click "Record Webcam" to start</p>
        </div>
      )}
    </div>
  );
};

export default WebcamPreview;
