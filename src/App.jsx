import React, { useState } from 'react';
import { ToastProvider, useToast } from './utils/toastContext';
import { generateUuid } from './utils/uuid';
import { ERROR_MESSAGES } from './utils/constants';
import FileImporter from './components/FileImporter';
import Timeline from './components/Timeline';
import Notifications from './components/Notifications';
import './styles/main.css';

/**
 * Main App Component (wrapped with ToastProvider)
 */
function AppContent() {
  const [clips, setClips] = useState([]);
  const [selectedClipId, setSelectedClipId] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const { showToast } = useToast();

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
        {selectedClipId ? (
          <div className="preview-placeholder">
            <h2>Video Preview</h2>
            <p>Selected: {clips.find(c => c.id === selectedClipId)?.fileName}</p>
            <p className="text-muted">Video preview will be implemented in PR-3</p>
          </div>
        ) : (
          <div className="preview-placeholder">
            <div className="empty-icon">🎬</div>
            <h2>No clip selected</h2>
            <p className="text-muted">Select a clip from the timeline to preview</p>
          </div>
        )}
      </main>

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
