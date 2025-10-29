import React from 'react';
import { Video, Camera, Monitor } from 'lucide-react';
import WebcamPreview from './WebcamPreview';
import CompositePreview from './CompositePreview';
import './RecordingPanel.css';

/**
 * RecordingPanel Component
 * Provides UI controls for screen recording, webcam recording, and composite recording
 */
const RecordingPanel = ({
  recordingState = 'idle',
  recordingDuration = 0,
  onStartRecord,
  onStopRecord,
  selectedSource = null,
  availableSources = [],
  onSourceChange,
  recordingType = null,
  webcamStream = null,
  screenStream = null,
  micEnabled = true,
  onMicToggle = () => {}
}) => {
  // Format elapsed time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isRecording = recordingState === 'recording';
  const isIdle = recordingState === 'idle';

  return (
    <div className="recording-panel">
      <div className="recording-header">
        <h3>Recording</h3>
        {isRecording && (
          <div className="recording-status">
            <div className="recording-indicator"></div>
            <span>Recording {recordingType || 'screen'}</span>
          </div>
        )}
      </div>

      <div className="recording-controls">
        {/* Screen Recording */}
        <div className="recording-section">
          <button
            className={`recording-button screen-record ${isRecording && recordingType === 'screen' ? 'active' : ''}`}
            onClick={() => onStartRecord('screen')}
            disabled={isRecording}
            title="Record your entire screen or a specific window"
          >
            <Monitor size={20} />
            <span>Record Screen</span>
          </button>
          
          {recordingType === 'screen' && availableSources.length > 0 && (
            <select
              className="source-selector"
              value={selectedSource?.id || ''}
              onChange={(e) => {
                const source = availableSources.find(s => s.id === e.target.value);
                onSourceChange(source);
              }}
              disabled={isRecording}
            >
              <option value="">Select screen/window...</option>
              {availableSources.map(source => {
                const isClipForge = source.name.toLowerCase().includes('clipforge') || 
                                  source.name.toLowerCase().includes('electron');
                return (
                  <option key={source.id} value={source.id}>
                {isClipForge ? '⚠️ ' : ''}{source.name}
                  </option>
                );
              })}
            </select>
          )}
        </div>

        {/* Webcam Recording */}
        <div className="recording-section">
          <button
            className={`recording-button webcam-record ${isRecording && recordingType === 'webcam' ? 'active' : ''}`}
            onClick={() => onStartRecord('webcam')}
            disabled={isRecording}
            title="Record from your camera with audio"
          >
            <Camera size={20} />
            <span>Record Webcam</span>
          </button>
          
          {/* Webcam Preview - only show when webcam recording is active or stream is available */}
          {(recordingType === 'webcam' || webcamStream) && (
            <WebcamPreview
              stream={webcamStream}
              isRecording={isRecording && recordingType === 'webcam'}
              micEnabled={micEnabled}
              onMicToggle={onMicToggle}
            />
          )}
        </div>

        {/* Composite Recording */}
        <div className="recording-section">
          <button
            className={`recording-button composite-record ${isRecording && recordingType === 'screen+webcam' ? 'active' : ''}`}
            onClick={() => onStartRecord('screen+webcam')}
            disabled={isRecording}
            title="Record both simultaneously with picture-in-picture"
          >
            <Video size={20} />
            <span>Screen + Camera</span>
          </button>
          
          {/* Composite Preview - show when composite recording is active or streams are available */}
          {(recordingType === 'screen+webcam' || (screenStream && webcamStream)) && (
            <CompositePreview
              screenStream={screenStream}
              webcamStream={webcamStream}
              recordingState={recordingState}
              isRecording={isRecording && recordingType === 'screen+webcam'}
            />
          )}
        </div>
      </div>

      {/* Recording Status */}
      {isRecording && (
        <div className="recording-status-panel">
          <div className="elapsed-time">
            <span className="time-label">Elapsed:</span>
            <span className="time-value">{formatTime(recordingDuration)}</span>
          </div>
          
          <button
            className="stop-recording-button"
            onClick={onStopRecord}
            title="Stop recording"
          >
            <div className="stop-icon"></div>
            <span>Stop Recording</span>
          </button>
        </div>
      )}

    </div>
  );
};

export default RecordingPanel;

