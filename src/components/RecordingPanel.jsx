import React from 'react';
import { Video, Camera, Monitor } from 'lucide-react';
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
  recordingType = null
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
            title="Record your screen"
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
            title="Record from webcam"
          >
            <Camera size={20} />
            <span>Record Webcam</span>
          </button>
        </div>

        {/* Composite Recording */}
        <div className="recording-section">
          <button
            className={`recording-button composite-record ${isRecording && recordingType === 'screen+webcam' ? 'active' : ''}`}
            onClick={() => onStartRecord('screen+webcam')}
            disabled={isRecording}
            title="Record screen + webcam together"
          >
            <Video size={20} />
            <span>Screen + Camera</span>
          </button>
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

