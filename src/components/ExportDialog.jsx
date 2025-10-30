import React, { useState, useEffect } from 'react';
import { Download, X, AlertCircle, CheckCircle } from 'lucide-react';
import './ExportDialog.css';

const ExportDialog = ({ 
  isOpen, 
  onClose, 
  clips, 
  onExport, 
  isExporting, 
  exportProgress, 
  exportError 
}) => {
  const [outputPath, setOutputPath] = useState('');
  const [resolution, setResolution] = useState('source');
  const [quality, setQuality] = useState('high');
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [validationWarning, setValidationWarning] = useState('');

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setOutputPath('');
      setResolution('source');
      setQuality('high');
      setShowFilePicker(false);
      setValidationWarning('');
    }
  }, [isOpen]);

  // Validate resolution selection when clips or resolution changes
  useEffect(() => {
    if (clips.length > 0 && resolution !== 'source') {
      validateResolution();
    } else {
      setValidationWarning('');
    }
  }, [clips, resolution]);

  // Validate resolution selection and warn about upscaling
  const validateResolution = () => {
    if (clips.length === 0 || resolution === 'source') {
      setValidationWarning('');
      return;
    }

    const targetRes = getResolutionDimensions(resolution);
    let upscaledClips = 0;
    let totalPixels = 0;
    let maxPixels = 0;

    clips.forEach(clip => {
      const clipPixels = clip.width * clip.height;
      totalPixels += clipPixels;
      maxPixels = Math.max(maxPixels, clipPixels);
      
      if (clipPixels < targetRes.width * targetRes.height) {
        upscaledClips++;
      }
    });

    const upscalePercentage = (upscaledClips / clips.length) * 100;
    
    if (upscalePercentage > 25) {
      setValidationWarning(`⚠️ ${Math.round(upscalePercentage)}% of clips will be upscaled. Consider using "Source Resolution" for better quality.`);
    } else if (upscalePercentage > 0) {
      setValidationWarning(`ℹ️ ${upscaledClips} clip${upscaledClips > 1 ? 's' : ''} will be upscaled.`);
    } else {
      setValidationWarning('');
    }
  };

  // Get resolution dimensions
  const getResolutionDimensions = (res) => {
    switch (res) {
      case '720p': return { width: 1280, height: 720 };
      case '1080p': return { width: 1920, height: 1080 };
      case '480p': return { width: 854, height: 480 };
      default: return { width: 0, height: 0 };
    }
  };

  const handleFilePicker = async () => {
    try {
      const result = await window.electronAPI.selectSaveLocation();
      if (result && !result.canceled) {
        setOutputPath(result.filePath);
      }
    } catch (err) {
      console.error('File picker error:', err);
    }
  };

  const handleExport = () => {
    if (!outputPath) {
      alert('Please select an output location');
      return;
    }
    
    if (clips.length === 0) {
      alert('No clips to export');
      return;
    }

    onExport(outputPath, { resolution, quality });
  };

  const handleCancel = () => {
    if (!isExporting) {
      onClose();
    }
  };

  const calculateTotalDuration = () => {
    return clips.reduce((total, clip) => {
      return total + (clip.trimEnd - clip.trimStart);
    }, 0);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = () => {
    if (exportError) return <AlertCircle className="status-icon error" />;
    if (isExporting) return <div className="spinner" />;
    if (exportProgress === 100) return <CheckCircle className="status-icon success" />;
    return <Download className="status-icon" />;
  };

  const getStatusText = () => {
    if (exportError) return `Export failed: ${exportError}`;
    if (isExporting && exportProgress < 100) {
      const resText = resolution === 'source' ? 'Source' : resolution.toUpperCase();
      const qualityText = quality.charAt(0).toUpperCase() + quality.slice(1);
      if (exportProgress <= 5) return `Preparing ${resText} export at ${qualityText} quality...`;
      if (exportProgress <= 55) return `Processing clips at ${resText}... ${exportProgress}%`;
      if (exportProgress <= 90) return `Combining clips... ${exportProgress}%`;
      if (exportProgress < 100) return `Finalizing ${resText} export... ${exportProgress}%`;
    }
    if (exportProgress === 100) return 'Export completed successfully!';
    return 'Ready to export';
  };

  if (!isOpen) return null;

  return (
    <div className="export-dialog-overlay">
      <div className="export-dialog">
        <div className="export-dialog-header">
          <h2>Export Timeline</h2>
          <button 
            className="close-button" 
            onClick={handleCancel}
            disabled={isExporting}
          >
            <X size={20} />
          </button>
        </div>

        <div className="export-dialog-content">
          {/* Timeline Summary */}
          <div className="export-summary">
            <h3>Timeline Summary</h3>
            <div className="summary-stats">
              <div className="stat">
                <span className="stat-label">Clips:</span>
                <span className="stat-value">{clips.length}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Total Duration:</span>
                <span className="stat-value">{formatDuration(calculateTotalDuration())}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Resolution:</span>
                <span className="stat-value">{resolution === 'source' ? 'Source' : resolution}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Quality:</span>
                <span className="stat-value">{quality.charAt(0).toUpperCase() + quality.slice(1)}</span>
              </div>
            </div>
          </div>

          {/* Output Location */}
          <div className="export-section">
            <label className="section-label">Output Location</label>
            <div className="file-picker-row">
              <input
                type="text"
                value={outputPath}
                onChange={(e) => setOutputPath(e.target.value)}
                placeholder="Select output file..."
                className="file-path-input"
                disabled={isExporting}
              />
              <button
                className="browse-button"
                onClick={handleFilePicker}
                disabled={isExporting}
              >
                Browse
              </button>
            </div>
          </div>

          {/* Export Options */}
          <div className="export-section">
            <label className="section-label">Export Settings</label>
            <div className="export-options-row">
              <div className="option-group">
                <label className="option-label">Resolution</label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="resolution-select"
                  disabled={isExporting}
                >
                  <option value="source">Source Resolution</option>
                  <option value="1080p">1080p (1920×1080)</option>
                  <option value="720p">720p (1280×720)</option>
                  <option value="480p">480p (854×480)</option>
                </select>
              </div>
              <div className="option-group">
                <label className="option-label">Quality</label>
                <select
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  className="quality-select"
                  disabled={isExporting}
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
            {validationWarning && (
              <div className="validation-warning">
                {validationWarning}
              </div>
            )}
          </div>

          {/* Progress Section */}
          {(isExporting || exportProgress > 0 || exportError) && (
            <div className="export-section">
              <div className="progress-header">
                {getStatusIcon()}
                <span className="progress-text">{getStatusText()}</span>
              </div>
              
              {isExporting && (
                <div className="progress-bar-container">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                  <span className="progress-percent">{exportProgress}%</span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="export-actions">
            <button
              className="cancel-button"
              onClick={handleCancel}
              disabled={isExporting}
            >
              {isExporting ? 'Exporting...' : 'Cancel'}
            </button>
            <button
              className="export-button"
              onClick={handleExport}
              disabled={isExporting || !outputPath || clips.length === 0}
            >
              <Download size={16} />
              Export Video
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog;