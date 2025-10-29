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
  const electronAPI = typeof window !== 'undefined' ? window.electronAPI : undefined;

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
    let filePaths = [];

    if (electronAPI?.handleDroppedFiles) {
      try {
        filePaths = await electronAPI.handleDroppedFiles(files);
      } catch (error) {
        console.error('[FileImporter] handleDroppedFiles failed:', error);
        showToast('Unable to process dropped files', 'error');
        return;
      }
    } else {
      filePaths = files
        .map((file) => file.path)
        .filter(Boolean);

      if (filePaths.length === 0) {
        showToast('Drag & drop is only available in the desktop app', 'warning');
        return;
      }
    }

    if (filePaths.length > 0) {
      onImportFiles(filePaths);
    } else {
      showToast('No valid files dropped', 'error');
    }
  };

  const handleFileSelect = async (event) => {
    if (isLoading) {
      if (event?.preventDefault) event.preventDefault();
      return;
    }

    let filePaths = [];

    if (event?.target?.files?.length) {
      filePaths = Array.from(event.target.files)
        .map((file) => file.path)
        .filter(Boolean);
    }

    if ((!filePaths || filePaths.length === 0) && electronAPI?.selectFile) {
      try {
        filePaths = await electronAPI.selectFile();
      } catch (error) {
        console.error('[FileImporter] selectFile failed:', error);
        showToast('Unable to open file picker', 'error');
        return;
      }
    }

    if (!filePaths || filePaths.length === 0) {
      showToast('No files selected', 'warning');
      if (event?.target) {
        event.target.value = '';
      }
      return;
    }

    onImportFiles(filePaths);

    if (event?.target) {
      event.target.value = '';
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
        onChange={handleFileSelect}
        disabled={isLoading}
        style={{ display: 'none' }}
      />
      <label 
        htmlFor="file-input" 
        className={`file-picker-btn ${isLoading ? 'disabled' : ''}`}
        onClick={(e) => {
          if (isLoading) {
            e.preventDefault();
            return;
          }

          if (electronAPI?.selectFile) {
            e.preventDefault();
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
