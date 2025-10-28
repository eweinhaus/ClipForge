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
  const [showFilePicker, setShowFilePicker] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setOutputPath('');
      setResolution('source');
      setShowFilePicker(false);
    }
  }, [isOpen]);

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

    onExport(outputPath);
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
      if (exportProgress <= 5) return 'Preparing export...';
      if (exportProgress <= 55) return `Processing clips... ${exportProgress}%`;
      if (exportProgress <= 90) return `Combining clips... ${exportProgress}%`;
      if (exportProgress < 100) return `Finalizing... ${exportProgress}%`;
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

          {/* Resolution Options */}
          <div className="export-section">
            <label className="section-label">Resolution</label>
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              className="resolution-select"
              disabled={isExporting}
            >
              <option value="source">Source Resolution</option>
              <option value="1080p">1080p (1920x1080)</option>
              <option value="720p">720p (1280x720)</option>
              <option value="480p">480p (854x480)</option>
            </select>
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