import React, { useState, useEffect } from 'react';
import { PictureInPicture, X } from 'lucide-react';
import './PipEditor.css';

/**
 * PiP Editor Component
 * Allows editing of Picture-in-Picture settings for composite recordings
 */
const PipEditor = ({ 
  clip, 
  isVisible, 
  onClose, 
  onSave 
}) => {
  const [pipSettings, setPipSettings] = useState({
    position: 'bottom-right',
    size: 0.3,
    opacity: 0.9
  });

  // Initialize settings from clip
  useEffect(() => {
    if (clip?.pipSettings) {
      setPipSettings(clip.pipSettings);
    }
  }, [clip]);

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

  const handleSettingChange = (key, value) => {
    setPipSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = () => {
    if (onSave) {
      onSave(pipSettings);
    }
    onClose();
  };

  const handleCancel = () => {
    // Reset to original settings
    if (clip?.pipSettings) {
      setPipSettings(clip.pipSettings);
    }
    onClose();
  };

  if (!isVisible || !clip?.isComposite) {
    return null;
  }

  return (
    <div className="pip-editor-overlay">
      <div className="pip-editor">
        <div className="pip-editor-header">
          <div className="pip-editor-title">
            <PictureInPicture size={16} />
            <span>Picture-in-Picture Settings</span>
          </div>
          <button 
            className="pip-editor-close"
            onClick={handleCancel}
            title="Close editor"
          >
            <X size={16} />
          </button>
        </div>

        <div className="pip-editor-content">
          <div className="pip-info">
            <p>Editing settings for: <strong>{clip.fileName}</strong></p>
            <p className="pip-note">
              Note: These settings are for reference only. The actual PiP overlay 
              was baked into the video during recording and cannot be changed.
            </p>
          </div>

          <div className="pip-controls">
            {/* Position Control */}
            <div className="pip-control-group">
              <label>Position:</label>
              <select
                value={pipSettings.position}
                onChange={(e) => handleSettingChange('position', e.target.value)}
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
                value={pipSettings.size}
                onChange={(e) => handleSettingChange('size', parseFloat(e.target.value))}
              >
                {pipSizes.map(size => (
                  <option key={size.value} value={size.value}>
                    {size.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Opacity Control */}
            <div className="pip-control-group">
              <label>Opacity: {Math.round(pipSettings.opacity * 100)}%</label>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.1"
                value={pipSettings.opacity}
                onChange={(e) => handleSettingChange('opacity', parseFloat(e.target.value))}
                className="opacity-slider"
              />
            </div>
          </div>
        </div>

        <div className="pip-editor-footer">
          <button 
            className="pip-editor-button cancel"
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button 
            className="pip-editor-button save"
            onClick={handleSave}
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default PipEditor;
