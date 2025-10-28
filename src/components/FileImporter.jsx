import React, { useState } from 'react';
import { Upload, Film } from 'lucide-react';
import { useToast } from '../utils/toastContext';
import { SUPPORTED_MIME_TYPES, ERROR_MESSAGES } from '../utils/constants';
import './FileImporter.css';

/**
 * FileImporter Component
 * Handles drag-drop and file picker for video imports
 */
export default function FileImporter({ onImportFiles, isLoading }) {
  const [isDragging, setIsDragging] = useState(false);
  const { showToast } = useToast();

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const filePaths = await window.electronAPI.handleDroppedFiles(files);

    if (filePaths.length > 0) {
      onImportFiles(filePaths);
    } else {
      showToast('No valid files dropped', 'error');
    }
  };

  const handleFileSelect = async () => {
    const filePaths = await window.electronAPI.selectFile();
    if (filePaths && filePaths.length > 0) {
      onImportFiles(filePaths);
    }
  };

  return (
    <div className="file-importer">
      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''} ${isLoading ? 'loading' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Importing videos...</p>
          </div>
        ) : (
          <div className="drop-zone-content">
            <div className="drop-zone-icon">
              <Film size={48} strokeWidth={1.5} />
            </div>
            <p className="drop-zone-title">Drag & drop video files here</p>
            <p className="drop-zone-formats">Supports: MP4, MOV, WebM</p>
          </div>
        )}
      </div>

      <input
        type="file"
        id="file-input"
        accept={SUPPORTED_MIME_TYPES.join(',')}
        multiple
        onChange={handleFileSelect} // Removed direct onChange handler
        disabled={isLoading}
        style={{ display: 'none' }}
      />
      <label 
        htmlFor="file-input" 
        className={`file-picker-btn ${isLoading ? 'disabled' : ''}`}
        onClick={(e) => {
          // Manually trigger file selection via IPC
          if (!isLoading) {
            handleFileSelect();
          }
        }}
      >
        <Upload size={16} />
        <span>{isLoading ? 'Importing...' : 'Or choose files'}</span>
      </label>
    </div>
  );
}
