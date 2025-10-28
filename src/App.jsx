import React, { useState, useEffect } from 'react';
import { ToastProvider, useToast } from './utils/toastContext';
import { generateUuid } from './utils/uuid';
import { ERROR_MESSAGES } from './utils/constants';
import FileImporter from './components/FileImporter';
import Timeline from './components/Timeline';
import VideoPreview from './components/VideoPreview';
import ClipEditor from './components/ClipEditor';
import ExportDialog from './components/ExportDialog';
import Notifications from './components/Notifications';
import './styles/main.css';

/**
 * Main App Component (wrapped with ToastProvider)
 */
function AppContent() {
  const [clips, setClips] = useState([]);
  const [selectedClipId, setSelectedClipId] = useState(null);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  
  // Export state
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState(null);
  
  const { showToast } = useToast();

  // Listen for export progress updates
  useEffect(() => {
    const handleExportProgress = (event, progress) => {
      setExportProgress(progress);
    };

    window.electronAPI.onExportProgress(handleExportProgress);

    return () => {
      // Cleanup listener when component unmounts
      window.electronAPI.removeAllListeners('export-progress');
    };
  }, []);

  // Keyboard shortcut for export (Cmd+E)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        if (clips.length > 0) {
          setShowExportDialog(true);
        } else {
          showToast('No clips to export', 'warning');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clips.length, showToast]);

  /**
   * Handle file imports
   * @param {string[]} filePaths - Array of file paths to import
   */
  const handleImportFiles = async (filePaths) => {
    setIsImporting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const filePath of filePaths) {
      try {
        console.log('[App] Importing file:', filePath);
        
        // Call IPC to extract metadata
        const result = await window.electronAPI.readMetadata(filePath);
        
        // Check if metadata extraction succeeded
        if (!result.success) {
          console.error('[App] Metadata extraction failed:', result.error);
          errorCount++;
          
          const fileName = filePath.split('/').pop();
          const errorMessage = result.error.message || ERROR_MESSAGES[result.error.type] || ERROR_MESSAGES.UNKNOWN;
          showToast(`${fileName}: ${errorMessage}`, 'error', 5000);
          continue;
        }
        
        const metadata = result.data;
        
        // Create clip object
        const newClip = {
          id: generateUuid(),
          fileName: filePath.split('/').pop(),
          filePath,
          source: 'import',
          duration: metadata.duration,
          width: metadata.width,
          height: metadata.height,
          thumbnail: metadata.thumbnail,
          trimStart: 0,
          trimEnd: metadata.duration,
          order: clips.length + successCount,
          track: 'main'
        };

        // Add to clips state
        setClips(prev => [...prev, newClip]);
        successCount++;
        
        console.log('[App] Successfully imported:', newClip.fileName);
      } catch (err) {
        console.error('[App] Unexpected import error:', err);
        errorCount++;
        
        const fileName = filePath.split('/').pop();
        showToast(`Failed to import ${fileName}: Unexpected error`, 'error');
      }
    }

    setIsImporting(false);

    // Show success message
    if (successCount > 0) {
      showToast(
        `Successfully imported ${successCount} clip${successCount !== 1 ? 's' : ''}`,
        'success'
      );
    }
    
    if (errorCount > 0 && successCount === 0) {
      showToast(`Failed to import ${errorCount} file${errorCount !== 1 ? 's' : ''}`, 'error');
    }
  };

  /**
   * Handle clip deletion
   * @param {string} clipId - ID of clip to delete
   */
  const handleDeleteClip = (clipId) => {
    const clip = clips.find(c => c.id === clipId);
    if (!clip) return;

    // Show confirmation dialog
    const confirmed = window.confirm(`Delete "${clip.fileName}"?`);
    if (!confirmed) return;

    // Remove clip from state
    setClips(clips.filter(c => c.id !== clipId));
    
    // Clear selection if deleted clip was selected
    if (selectedClipId === clipId) {
      setSelectedClipId(null);
    }

    showToast('Clip deleted', 'success');
  };

  /**
   * Handle clip selection
   * @param {string} clipId - ID of clip to select
   */
  const handleSelectClip = (clipId) => {
    setSelectedClipId(clipId);
  };

  /**
   * Handle trim changes for a clip
   * @param {string} clipId - ID of clip to trim
   * @param {number} trimStart - New trim start time in seconds
   * @param {number} trimEnd - New trim end time in seconds
   */
  const handleTrimChange = (clipId, trimStart, trimEnd) => {
    setClips(prev => prev.map(clip => 
      clip.id === clipId 
        ? { ...clip, trimStart, trimEnd }
        : clip
    ));
    showToast('Clip trimmed', 'success');
  };

  /**
   * Handle export request
   * @param {string} outputPath - Path where to save the exported video
   */
  const handleExport = async (outputPath) => {
    setIsExporting(true);
    setExportProgress(0);
    setExportError(null);

    try {
      console.log('[App] Starting export to:', outputPath);
      
      const result = await window.electronAPI.exportTimeline({
        clips,
        outputPath
      });

      if (result.success) {
        showToast(`✓ Video exported successfully to ${outputPath.split('/').pop()}`, 'success', 5000);
        setShowExportDialog(false);
      } else {
        const errorMessage = result.error.message || 'Export failed';
        setExportError(errorMessage);
        showToast(`Export failed: ${errorMessage}`, 'error', 5000);
      }
    } catch (err) {
      console.error('[App] Export error:', err);
      const errorMessage = err.message || 'Export failed';
      setExportError(errorMessage);
      showToast(`Export failed: ${errorMessage}`, 'error', 5000);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  /**
   * Handle export dialog close
   */
  const handleCloseExportDialog = () => {
    if (!isExporting) {
      setShowExportDialog(false);
      setExportError(null);
      setExportProgress(0);
    }
  };

  return (
    <div className="app-container">
      <aside className="timeline-panel">
        <FileImporter 
          onImportFiles={handleImportFiles} 
          isLoading={isImporting} 
        />
        <Timeline
          clips={clips}
          selectedClipId={selectedClipId}
          onSelectClip={handleSelectClip}
          onDeleteClip={handleDeleteClip}
        />
      </aside>

      <main className="preview-panel">
        <VideoPreview
          clip={clips.find(c => c.id === selectedClipId) || null}
          onPlaybackChange={setCurrentPlaybackTime}
        />
        <ClipEditor
          clip={clips.find(c => c.id === selectedClipId) || null}
          onTrimChange={handleTrimChange}
        />
        
        {/* Export Button */}
        <div className="export-section">
          <button
            className="export-button"
            onClick={() => setShowExportDialog(true)}
            disabled={clips.length === 0 || isExporting}
          >
            Export Timeline ({clips.length} clip{clips.length !== 1 ? 's' : ''})
          </button>
        </div>
      </main>

      {/* Export Dialog */}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={handleCloseExportDialog}
        clips={clips}
        onExport={handleExport}
        isExporting={isExporting}
        exportProgress={exportProgress}
        exportError={exportError}
      />

      <Notifications />
    </div>
  );
}

/**
 * App Component with ToastProvider
 */
export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
