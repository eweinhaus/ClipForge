import React, { useState } from 'react';
import { Video, Camera, Monitor, Settings } from 'lucide-react';
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
  pipSettings = null,
  onPipSettingsChange = null
}) => {
  // Format elapsed time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isRecording = recordingState === 'recording';
  const isIdle = recordingState === 'idle';
  
  // PiP settings state
  const [showPipSettings, setShowPipSettings] = useState(false);
  const [localPipSettings, setLocalPipSettings] = useState({
    position: 'bottom-right',
    size: 0.3,
    opacity: 0.9,
    ...pipSettings
  });
  
  // PiP position options
  const pipPositions = [
    { value: 'top-left', label: 'Top Left' },
    { value: 'top-right', label: 'Top Right' },
    { value: 'bottom-left', label: 'Bottom Left' },
    { value: 'bottom-right', label: 'Bottom Right' }
  ];
  
  // PiP size options
  const pipSizes = [
    { value: 0.2, label: 'Small (20%)' },
    { value: 0.3, label: 'Medium (30%)' },
    { value: 0.4, label: 'Large (40%)' }
  ];
  
  // Handle PiP settings change
  const handlePipSettingChange = (key, value) => {
    const newSettings = { ...localPipSettings, [key]: value };
    setLocalPipSettings(newSettings);
    if (onPipSettingsChange) {
      onPipSettingsChange(newSettings);
    }
  };

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
          <div className="composite-recording-controls">
            <button
              className={`recording-button composite-record ${isRecording && recordingType === 'screen+webcam' ? 'active' : ''}`}
              onClick={() => onStartRecord('screen+webcam')}
              disabled={isRecording}
              title="Record screen + webcam together"
            >
              <Video size={20} />
              <span>Screen + Camera</span>
            </button>
            
            {/* PiP Settings Toggle */}
            <button
              className={`pip-settings-button ${showPipSettings ? 'active' : ''}`}
              onClick={() => setShowPipSettings(!showPipSettings)}
              disabled={isRecording}
              title="Picture-in-Picture settings"
            >
              <Settings size={16} />
            </button>
          </div>
          
          {/* PiP Settings Panel */}
          {showPipSettings && (
            <div className="pip-settings-panel">
              <h4>Picture-in-Picture Settings</h4>
              
              {/* Position Control */}
              <div className="pip-control-group">
                <label>Position:</label>
                <select
                  value={localPipSettings.position}
                  onChange={(e) => handlePipSettingChange('position', e.target.value)}
                  disabled={isRecording}
                >
                  {pipPositions.map(pos => (
                    <option key={pos.value} value={pos.value}>
                      {pos.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Size Control */}
              <div className="pip-control-group">
                <label>Size:</label>
                <select
                  value={localPipSettings.size}
                  onChange={(e) => handlePipSettingChange('size', parseFloat(e.target.value))}
                  disabled={isRecording}
                >
                  {pipSizes.map(size => (
                    <option key={size.value} value={size.value}>
                      {size.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Opacity Control */}
              <div className="pip-control-group opacity-control-group">
                <label>Opacity: {Math.round(localPipSettings.opacity * 100)}%</label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={localPipSettings.opacity}
                  onChange={(e) => handlePipSettingChange('opacity', parseFloat(e.target.value))}
                  disabled={isRecording}
                  className="opacity-slider"
                />
              </div>
            </div>
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

