import React, { useState, useEffect } from 'react';
import { PictureInPicture } from 'lucide-react';
import { formatDuration } from '../utils/formatters';
import PipEditor from './PipEditor';
import './ClipEditor.css';

/**
 * ClipEditor Component
 * Allows users to set trim start/end points for the selected clip
 */
export default function ClipEditor({ clip, onTrimChange, onPipSettingsChange }) {
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [validationError, setValidationError] = useState(null);
  const [showPipEditor, setShowPipEditor] = useState(false);

  // Update local state when clip changes
  useEffect(() => {
    if (clip) {
      setTrimStart(clip.trimStart || 0);
      setTrimEnd(clip.trimEnd || clip.duration || 0);
      setValidationError(null);
    }
  }, [clip]);

  // Validate trim values
  const validateTrim = (start, end) => {
    if (!clip) return 'No clip selected';
    
    const startNum = parseFloat(start);
    const endNum = parseFloat(end);
    
    if (isNaN(startNum) || isNaN(endNum)) {
      return 'Please enter valid numbers';
    }
    
    if (startNum < 0) {
      return 'Start time cannot be negative';
    }
    
    if (endNum > clip.duration) {
      return 'End time exceeds clip duration';
    }
    
    if (startNum >= endNum) {
      return 'Start time must be before end time';
    }
    
    return null;
  };

  // Handle trim start change
  const handleTrimStartChange = (e) => {
    const value = e.target.value;
    setTrimStart(value);
    
    const error = validateTrim(value, trimEnd);
    setValidationError(error);
  };

  // Handle trim end change
  const handleTrimEndChange = (e) => {
    const value = e.target.value;
    setTrimEnd(value);
    
    const error = validateTrim(trimStart, value);
    setValidationError(error);
  };

  // Apply trim changes
  const handleApply = () => {
    if (!clip || validationError) return;
    
    const startNum = parseFloat(trimStart);
    const endNum = parseFloat(trimEnd);
    
    onTrimChange?.(clip.id, startNum, endNum);
  };

  // Reset to full clip duration
  const handleReset = () => {
    if (!clip) return;
    
    setTrimStart(0);
    setTrimEnd(clip.duration);
    setValidationError(null);
    onTrimChange?.(clip.id, 0, clip.duration);
  };

  // Calculate trimmed duration
  const trimmedDuration = clip ? parseFloat(trimEnd) - parseFloat(trimStart) : 0;
  const isValid = !validationError && clip;

  // No clip selected state
  if (!clip) {
    return (
      <div className="clip-editor">
        <div className="editor-placeholder">
          <div className="empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <h3>No clip selected</h3>
          <p className="text-muted">Select a clip to edit</p>
        </div>
      </div>
    );
  }

  return (
    <div className="clip-editor">
      <div className="editor-header">
        <h3>Edit Clip</h3>
        <span className="clip-name" title={clip.fileName}>
          {clip.fileName}
        </span>
      </div>

      <div className="trim-controls">
        <div className="trim-main-row">
          <div className="trim-input-group">
            <label htmlFor="trim-start">Start (s)</label>
            <input
              id="trim-start"
              type="number"
              min="0"
              max={clip.duration}
              step="0.1"
              value={trimStart}
              onChange={handleTrimStartChange}
              className={validationError ? 'error' : ''}
            />
          </div>

          <div className="trim-input-group">
            <label htmlFor="trim-end">End (s)</label>
            <input
              id="trim-end"
              type="number"
              min="0"
              max={clip.duration}
              step="0.1"
              value={trimEnd}
              onChange={handleTrimEndChange}
              className={validationError ? 'error' : ''}
            />
          </div>

          <div className="trim-actions">
            <button
              className="btn btn-secondary"
              onClick={handleReset}
              disabled={!clip}
            >
              Reset
            </button>
            <button
              className="btn btn-primary"
              onClick={handleApply}
              disabled={!isValid}
            >
              Apply
            </button>
          </div>
        </div>

        <div className="trim-info-row">
          <div className="trim-info">
            <span className="duration-label">Original:</span>
            <span className="duration-value">{formatDuration(clip.duration)}</span>
            <span className="duration-label">Trimmed:</span>
            <span className="duration-value">{formatDuration(trimmedDuration)}</span>
          </div>
          
          {validationError && (
            <div className="validation-error">
              {validationError}
            </div>
          )}
        </div>

        {/* PiP Settings for composite recordings */}
        {clip.isComposite && (
          <div className="pip-controls">
            <div className="pip-control-header">
              <PictureInPicture size={16} />
              <span>Picture-in-Picture Settings</span>
            </div>
            <button
              className="btn btn-outline"
              onClick={() => setShowPipEditor(true)}
              title="Edit PiP settings"
            >
              Edit PiP Settings
            </button>
          </div>
        )}
      </div>

      {/* PiP Editor Modal */}
      <PipEditor
        clip={clip}
        isVisible={showPipEditor}
        onClose={() => setShowPipEditor(false)}
        onSave={(settings) => {
          if (onPipSettingsChange) {
            onPipSettingsChange(clip.id, settings);
          }
        }}
      />
    </div>
  );
}
