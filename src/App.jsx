import React, { useState, useEffect, useRef } from 'react';
import { Download, HelpCircle } from 'lucide-react';
import { ToastProvider, useToast } from './utils/toastContext';
import { generateUuid } from './utils/uuid';
import { ERROR_MESSAGES } from './utils/constants';
import FileImporter from './components/FileImporter';
import TimelineContainer from './components/TimelineContainer';
import VideoPreview from './components/VideoPreview';
import ClipEditor from './components/ClipEditor';
import ExportDialog from './components/ExportDialog';
import HelpDialog from './components/HelpDialog';
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
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
  
  // Export state
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState(null);
  
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  
  const videoPreviewRef = useRef(null);
  
  const { showToast } = useToast();

  /**
   * Calculate cumulative timeline position for a given clip and time within that clip
   * @param {string} clipId - ID of the clip
   * @param {number} timeInClip - Time within the clip
   * @returns {number} Cumulative timeline position
   */
  const calculateTimelinePosition = (clipId, timeInClip) => {
    const clipIndex = clips.findIndex(clip => clip.id === clipId);
    if (clipIndex === -1) return 0;
    
    let cumulativeTime = 0;
    
    // Add duration of all previous clips
    for (let i = 0; i < clipIndex; i++) {
      const clip = clips[i];
      const trimmedDuration = (clip.trimEnd || clip.duration || 0) - (clip.trimStart || 0);
      cumulativeTime += trimmedDuration;
    }
    
    // Add the current time within the current clip
    cumulativeTime += timeInClip;
    
    return cumulativeTime;
  };

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
   * Handle clip reordering via drag and drop
   * @param {number} oldIndex - Original index of the clip
   * @param {number} newIndex - New index for the clip
   */
  const handleReorderClips = (oldIndex, newIndex) => {
    if (oldIndex === newIndex) return;

    // Create a copy of the clips array
    const newClips = Array.from(clips);
    
    // Remove the clip from old position
    const [movedClip] = newClips.splice(oldIndex, 1);
    
    // Insert at new position
    newClips.splice(newIndex, 0, movedClip);
    
    // Update order property for all clips
    newClips.forEach((clip, index) => {
      clip.order = index;
    });
    
    setClips(newClips);
    showToast('Clip reordered', 'success');
  };

  /**
   * Handle seeking to a specific time in the timeline
   * @param {number} timelineTime - Time in seconds to seek to on the timeline
   */
  const handleSeekToTime = (timelineTime) => {
    if (videoPreviewRef.current && clips.length > 0) {
      let cumulativeTime = 0;
      
      // Find which clip contains the target time
      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        const trimmedDuration = (clip.trimEnd || clip.duration || 0) - (clip.trimStart || 0);
        
        if (timelineTime <= cumulativeTime + trimmedDuration) {
          // This clip contains the target time
          const timeInClip = timelineTime - cumulativeTime;
          
          // Switch to this clip if it's not currently selected
          if (selectedClipId !== clip.id) {
            setSelectedClipId(clip.id);
          }
          
          // Seek to the time within the clip
          videoPreviewRef.current.seekTo(timeInClip);
          return;
        }
        
        cumulativeTime += trimmedDuration;
      }
      
      // If we get here, the time is beyond all clips
      // Seek to the end of the last clip
      const lastClip = clips[clips.length - 1];
      if (selectedClipId !== lastClip.id) {
        setSelectedClipId(lastClip.id);
      }
      videoPreviewRef.current.seekTo(lastClip.trimEnd || lastClip.duration || 0);
    }
  };

  /**
   * Handle clip ending - move to next clip for continuous playback
   */
  const handleClipEnded = () => {
    if (clips.length === 0) return;
    
    const currentIndex = clips.findIndex(clip => clip.id === selectedClipId);
    if (currentIndex === -1) return;
    
    // Move to next clip if available
    const nextIndex = currentIndex + 1;
    if (nextIndex < clips.length) {
      const nextClip = clips[nextIndex];
      setSelectedClipId(nextClip.id);
      setShouldAutoPlay(true); // Signal to auto-play the next clip
      
      // Calculate cumulative timeline position up to the next clip
      let cumulativeTime = 0;
      for (let i = 0; i < nextIndex; i++) {
        const clip = clips[i];
        const trimmedDuration = (clip.trimEnd || clip.duration || 0) - (clip.trimStart || 0);
        cumulativeTime += trimmedDuration;
      }
      
      // Add the trim start of the next clip
      cumulativeTime += (nextClip.trimStart || 0);
      setCurrentPlaybackTime(cumulativeTime);
    } else {
      // No more clips, stop playback
      setCurrentPlaybackTime(0);
    }
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
      {/* Help Button (Top Right) */}
      <button 
        className="help-button"
        onClick={() => setShowHelpDialog(true)}
        title="Help & Shortcuts"
        aria-label="Open help dialog"
      >
        <HelpCircle size={20} />
      </button>

      <div className="main-content">
        <aside className="media-panel">
          <FileImporter 
            onImportFiles={handleImportFiles} 
            isLoading={isImporting} 
          />
        </aside>

        <main className="preview-panel">
          <VideoPreview
            ref={videoPreviewRef}
            clip={clips.find(c => c.id === selectedClipId) || null}
            onPlaybackChange={(timeInClip) => {
              if (selectedClipId) {
                const timelinePosition = calculateTimelinePosition(selectedClipId, timeInClip);
                setCurrentPlaybackTime(timelinePosition);
              }
            }}
            onClipEnded={handleClipEnded}
            shouldAutoPlay={shouldAutoPlay}
            onAutoPlayStarted={() => setShouldAutoPlay(false)}
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
              <Download size={20} />
              <span>Export Timeline ({clips.length} clip{clips.length !== 1 ? 's' : ''})</span>
            </button>
          </div>
        </main>
      </div>

      {/* Horizontal Timeline at Bottom */}
      <TimelineContainer
        clips={clips}
        selectedClipId={selectedClipId}
        onSelectClip={handleSelectClip}
        onDeleteClip={handleDeleteClip}
        playheadPosition={currentPlaybackTime}
        onSeekToTime={handleSeekToTime}
        onTrimChange={handleTrimChange}
      />

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

      {/* Help Dialog */}
      <HelpDialog
        isOpen={showHelpDialog}
        onClose={() => setShowHelpDialog(false)}
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
