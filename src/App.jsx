import React, { useState, useEffect, useRef } from 'react';
import { Download, HelpCircle } from 'lucide-react';
import { ToastProvider, useToast } from './utils/toastContext';
import { generateUuid } from './utils/uuid';
import { ERROR_MESSAGES } from './utils/constants';
import { 
  startScreenRecord, 
  startWebcamRecord, 
  startCompositeRecord, 
  setupRecorderDataCollection,
  stopRecording,
  requestScreenPermission 
} from './utils/rendererCaptureService';
import FileImporter from './components/FileImporter';
import TimelineContainer from './components/TimelineContainer';
import TimelineErrorBoundary from './components/TimelineErrorBoundary';
import VideoPreview from './components/VideoPreview';
import ClipEditor from './components/ClipEditor';
import ExportDialog from './components/ExportDialog';
import HelpDialog from './components/HelpDialog';
import Notifications from './components/Notifications';
import RecordingPanel from './components/RecordingPanel';
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
  
  // Recording state
  const [recordingState, setRecordingState] = useState('idle');
  const [recordingElapsedTime, setRecordingElapsedTime] = useState(0);
  const [recordingType, setRecordingType] = useState(null);
  const [selectedSource, setSelectedSource] = useState(null);
  const [availableSources, setAvailableSources] = useState([]);
  const [recordingData, setRecordingData] = useState(null);
  const [recordingInterval, setRecordingInterval] = useState(null);
  
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

  // Cleanup recording interval on unmount
  useEffect(() => {
    return () => {
      if (recordingInterval) {
        clearInterval(recordingInterval);
      }
    };
  }, [recordingInterval]);

  // Handle renderer crashes during recording
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (recordingState === 'recording') {
        console.log('[App] Page unloading during recording - cleaning up');
        if (recordingInterval) {
          clearInterval(recordingInterval);
        }
        if (recordingData?.stream) {
          recordingData.stream.getTracks().forEach(track => track.stop());
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [recordingState, recordingInterval, recordingData]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Export shortcut (Cmd+E)
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        if (clips.length > 0) {
          setShowExportDialog(true);
        } else {
          showToast('No clips to export', 'warning');
        }
      }
      
      // Space bar for play/pause
      if (e.code === 'Space') {
        e.preventDefault();
        
        // If no clip is selected, select the first clip and start playback
        if (!selectedClipId && clips.length > 0) {
          const firstClip = clips[0];
          setSelectedClipId(firstClip.id);
          setShouldAutoPlay(true);
          showToast(`Playing ${firstClip.fileName}`, 'info');
        }
        // If a clip is selected, let VideoPreview handle the space bar
        // (VideoPreview component will handle the actual play/pause)
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clips.length, selectedClipId, showToast]);

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
   * Handle clip duplication
   * @param {string} clipId - ID of clip to duplicate
   */
  const handleDuplicateClip = (clipId) => {
    const clip = clips.find(c => c.id === clipId);
    if (!clip) return;

    // Create a duplicate clip with new ID and order
    const duplicatedClip = {
      ...clip,
      id: generateUuid(),
      order: clips.length,
      fileName: `${clip.fileName} (Copy)`
    };

    // Add to clips state
    setClips(prev => [...prev, duplicatedClip]);
    showToast('Clip duplicated', 'success');
  };

  /**
   * Handle resetting clip trim points
   * @param {string} clipId - ID of clip to reset trim
   */
  const handleResetTrim = (clipId) => {
    const clip = clips.find(c => c.id === clipId);
    if (!clip) return;

    // Reset trim points to full duration
    setClips(prev => prev.map(c => 
      c.id === clipId 
        ? { ...c, trimStart: 0, trimEnd: c.duration }
        : c
    ));
    showToast('Trim reset', 'success');
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

  /**
   * Handle starting screen recording
   * @param {string} type - Type of recording ('screen', 'webcam', 'screen+webcam')
   */
  const handleStartRecord = async (type) => {
    try {
      console.log('[App] ============= STARTING RECORDING FLOW =============');
      console.log('[App] Recording type requested:', type);
      console.log('[App] Current state:', {
        recordingState,
        selectedSource,
        availableSources: availableSources.length
      });
      
      // Test permissions first
      console.log('[App] Testing screen permissions...');
      const permissionResult = await window.electronAPI.testScreenPermissions();
      console.log('[App] Permission test result:', permissionResult);
      
      if (!permissionResult.success || !permissionResult.data) {
        console.log('[App] Requesting screen permission...');
        const granted = await requestScreenPermission();
        console.log('[App] Permission request result:', granted);
        
        if (!granted) {
          console.error('[App] Permission denied by user');
          showToast('Screen recording permission denied. Please enable in System Preferences > Security & Privacy > Screen Recording.', 'error', 8000);
          return;
        }
      }

      // Store the selected source in a local variable for immediate use
      let sourceToUseForRecording = selectedSource;
      
      // Get available sources for screen recording
      if (type === 'screen' || type === 'screen+webcam') {
        console.log('[App] Getting available screen sources...');
        const sourcesResult = await window.electronAPI.getSources();
        console.log('[App] Sources result:', {
          success: sourcesResult.success,
          count: sourcesResult.data?.length || 0
        });
        
        if (!sourcesResult.success) {
          console.error('[App] Failed to get sources:', sourcesResult.error);
          showToast(`Failed to get screen sources: ${sourcesResult.error.message}`, 'error');
          return;
        }
        
        setAvailableSources(sourcesResult.data);
        
        // For screen recording, we need a source selection
        if (type === 'screen' && sourcesResult.data.length > 0) {
          // Auto-select first non-ClipForge source
          const nonClipForgeSources = sourcesResult.data.filter(source => 
            !source.name.toLowerCase().includes('clipforge') && 
            !source.name.toLowerCase().includes('electron')
          );
          
          const sourceToSelect = nonClipForgeSources.length > 0 
            ? nonClipForgeSources[0] 
            : sourcesResult.data[0];
          
          console.log('[App] Auto-selecting source:', sourceToSelect.name);
          setSelectedSource(sourceToSelect);
          sourceToUseForRecording = sourceToSelect; // Use this immediately
          
          // Warn if user might be trying to record ClipForge itself
          const clipForgeWindow = sourcesResult.data.find(source => 
            source.name.toLowerCase().includes('clipforge') || 
            source.name.toLowerCase().includes('electron')
          );
          
          if (clipForgeWindow && sourceToSelect.id === clipForgeWindow.id) {
            console.warn('[App] Warning: Selected source appears to be ClipForge itself');
            showToast('⚠️ Recording ClipForge itself may cause issues. Try recording a different window or screen.', 'warning', 6000);
          }
        } else if ((type === 'screen+webcam') && sourcesResult.data.length > 0) {
          // For composite, also auto-select if not already selected
          if (!sourceToUseForRecording) {
            const nonClipForgeSources = sourcesResult.data.filter(source => 
              !source.name.toLowerCase().includes('clipforge') && 
              !source.name.toLowerCase().includes('electron')
            );
            
            const sourceToSelect = nonClipForgeSources.length > 0 
              ? nonClipForgeSources[0] 
              : sourcesResult.data[0];
            
            console.log('[App] Auto-selecting source for composite:', sourceToSelect.name);
            setSelectedSource(sourceToSelect);
            sourceToUseForRecording = sourceToSelect;
          }
        }
      }

      console.log('[App] Setting recording state...');
      setRecordingState('recording');
      setRecordingType(type);
      setRecordingElapsedTime(0);

      // Start recording based on type using renderer capture service
      console.log('[App] ========================================================');
      console.log('[App] STEP 5: Calling renderer capture service...');
      console.log('[App] Recording type:', type);
      
      let result;
      if (type === 'screen') {
        // Use the source we just selected (from local variable)
        const sourceToUse = sourceToUseForRecording || availableSources[0];
        if (!sourceToUse) {
          console.error('[App] No source available for recording');
          console.error('[App] sourceToUseForRecording:', sourceToUseForRecording);
          console.error('[App] availableSources:', availableSources);
          showToast('Please select a screen or window to record', 'warning');
          setRecordingState('idle');
          return;
        }
        console.log('[App] STEP 5a: Starting SCREEN recording...');
        console.log('[App] Source ID:', sourceToUse.id);
        console.log('[App] Source name:', sourceToUse.name);
        console.log('[App] *** ABOUT TO CALL startScreenRecord() ***');
        
        try {
          result = await startScreenRecord(sourceToUse.id);
          console.log('[App] *** startScreenRecord() RETURNED SUCCESSFULLY ***');
        } catch (screenError) {
          console.error('[App] *** startScreenRecord() THREW ERROR ***');
          throw screenError;
        }
      } else if (type === 'webcam') {
        console.log('[App] STEP 5b: Starting WEBCAM recording...');
        console.log('[App] *** ABOUT TO CALL startWebcamRecord() ***');
        
        try {
          result = await startWebcamRecord();
          console.log('[App] *** startWebcamRecord() RETURNED SUCCESSFULLY ***');
        } catch (webcamError) {
          console.error('[App] *** startWebcamRecord() THREW ERROR ***');
          throw webcamError;
        }
      } else if (type === 'screen+webcam') {
        const sourceToUse = sourceToUseForRecording || availableSources[0];
        if (!sourceToUse) {
          console.error('[App] No source available for composite recording');
          console.error('[App] sourceToUseForRecording:', sourceToUseForRecording);
          console.error('[App] availableSources:', availableSources);
          showToast('Please select a screen or window to record', 'warning');
          setRecordingState('idle');
          return;
        }
        console.log('[App] STEP 5c: Starting COMPOSITE recording...');
        console.log('[App] Source ID:', sourceToUse.id);
        console.log('[App] Source name:', sourceToUse.name);
        console.log('[App] *** ABOUT TO CALL startCompositeRecord() ***');
        
        try {
          result = await startCompositeRecord(sourceToUse.id);
          console.log('[App] *** startCompositeRecord() RETURNED SUCCESSFULLY ***');
        } catch (compositeError) {
          console.error('[App] *** startCompositeRecord() THREW ERROR ***');
          throw compositeError;
        }
      }
      
      console.log('[App] ========================================================');

      console.log('[App] ✓ Capture service returned successfully');
      console.log('[App] Result:', {
        hasRecorder: !!result.recorder,
        hasStream: !!result.stream,
        mimeType: result.mimeType,
        recorderState: result.recorder?.state
      });

      // Setup data collection BEFORE starting the recorder
      console.log('[App] Setting up recorder data collection...');
      const chunks = setupRecorderDataCollection(result.recorder);
      console.log('[App] ✓ Data collection setup complete');

      // Start the MediaRecorder
      console.log('[App] Starting MediaRecorder...');
      try {
        result.recorder.start(1000); // Start recording with 1-second chunks
        console.log('[App] ✓ MediaRecorder.start() called successfully');
        console.log('[App] MediaRecorder state after start:', result.recorder.state);
      } catch (startError) {
        console.error('[App] ✗ MediaRecorder.start() failed:', {
          name: startError.name,
          message: startError.message,
          stack: startError.stack
        });
        throw new Error(`Failed to start MediaRecorder: ${startError.message}`);
      }

      // Add timeout to prevent hanging
      const recordingTimeout = setTimeout(() => {
        console.warn('[App] Recording timeout - stopping recording');
        handleStopRecord();
      }, 300000); // 5 minute timeout

      // Store recording data with timeout and chunks
      setRecordingData({ ...result, timeout: recordingTimeout, chunks });

      // Start elapsed time timer
      const startTime = Date.now();
      const interval = setInterval(() => {
        setRecordingElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 100);
      setRecordingInterval(interval);

      console.log('[App] ✓ Recording started successfully');
      console.log('[App] ============= RECORDING FLOW COMPLETE =============');
      showToast(`Started ${type} recording`, 'success');
    } catch (err) {
      console.error('[App] ✗ Recording start error:', {
        name: err.name,
        message: err.message,
        stack: err.stack
      });
      console.log('[App] ============= RECORDING FLOW FAILED =============');
      showToast(`Recording failed: ${err.message}`, 'error', 8000);
      setRecordingState('idle');
      setRecordingType(null);
    }
  };

  /**
   * Handle stopping recording
   */
  const handleStopRecord = async () => {
    try {
      console.log('[App] Stopping recording...');
      
      if (!recordingData) {
        showToast('No active recording to stop', 'warning');
        return;
      }

      // Show immediate feedback
      showToast('Stopping recording...', 'info');

      // Clear elapsed time timer
      if (recordingInterval) {
        clearInterval(recordingInterval);
        setRecordingInterval(null);
      }

      // Clear recording timeout
      if (recordingData.timeout) {
        clearTimeout(recordingData.timeout);
      }

      // Clean up all streams immediately to stop webcam/camera
      console.log('[App] Cleaning up recording streams...');
      if (recordingData.stream) {
        console.log('[App] Stopping main stream tracks:', recordingData.stream.getTracks().length);
        recordingData.stream.getTracks().forEach(track => {
          console.log('[App] Stopping track:', track.kind, track.label);
          track.stop();
        });
      }
      if (recordingData.screenStream) {
        console.log('[App] Stopping screen stream tracks:', recordingData.screenStream.getTracks().length);
        recordingData.screenStream.getTracks().forEach(track => {
          console.log('[App] Stopping screen track:', track.kind, track.label);
          track.stop();
        });
      }
      if (recordingData.webcamStream) {
        console.log('[App] Stopping webcam stream tracks:', recordingData.webcamStream.getTracks().length);
        recordingData.webcamStream.getTracks().forEach(track => {
          console.log('[App] Stopping webcam track:', track.kind, track.label);
          track.stop();
        });
      }
      if (recordingData.microphoneStream) {
        console.log('[App] Stopping microphone stream tracks:', recordingData.microphoneStream.getTracks().length);
        recordingData.microphoneStream.getTracks().forEach(track => {
          console.log('[App] Stopping microphone track:', track.kind, track.label);
          track.stop();
        });
      }
      if (recordingData.audioStream) {
        console.log('[App] Stopping audio stream tracks:', recordingData.audioStream.getTracks().length);
        recordingData.audioStream.getTracks().forEach(track => {
          console.log('[App] Stopping audio track:', track.kind, track.label);
          track.stop();
        });
      }
      console.log('[App] ✓ All recording streams stopped');

      // Generate output path
      const timestamp = Date.now();
      const fileName = `${recordingType}_${timestamp}.webm`;
      const homeDirResult = await window.electronAPI.getHomeDir();
      const homeDir = homeDirResult.success ? homeDirResult.data : '/Users/ethan/Desktop';
      const outputPath = `${homeDir}/Desktop/${fileName}`;

      console.log('[App] Output path:', outputPath);
      console.log('[App] Chunks collected during recording:', recordingData.chunks?.length || 0);

      // Stop recording using renderer capture service
      const metadata = await stopRecording(
        recordingData.recorder, 
        recordingData.chunks || [], 
        outputPath, 
        {
          duration: recordingElapsedTime,
          width: recordingType === 'webcam' ? 1280 : 1920,
          height: recordingType === 'webcam' ? 720 : 1080,
          stream: recordingData.stream,
          screenStream: recordingData.screenStream,
          webcamStream: recordingData.webcamStream,
          microphoneStream: recordingData.microphoneStream,
          audioStream: recordingData.audioStream
        }
      );

      console.log('[App] Recording metadata:', metadata);

      // Create clip object and add to timeline
      const newClip = {
        id: generateUuid(),
        fileName: fileName,
        filePath: metadata.filePath,
        source: recordingType,
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height,
        thumbnail: metadata.thumbnail,
        trimStart: 0,
        trimEnd: metadata.duration,
        order: clips.length,
        track: recordingType === 'webcam' ? 'overlay' : 'main',
        hasAudio: true,
        audioVolume: 1.0,
        isMuted: false
      };

      setClips(prev => [...prev, newClip]);
      setRecordingState('idle');
      setRecordingType(null);
      setRecordingData(null);
      setRecordingElapsedTime(0);
      setSelectedSource(null);

      showToast(`✓ ${recordingType} recording added to timeline`, 'success');
    } catch (err) {
      console.error('[App] Stop recording error:', err);
      
      // Clean up streams even on error to stop webcam/camera
      console.log('[App] Cleaning up streams after error...');
      if (recordingData) {
        if (recordingData.stream) {
          recordingData.stream.getTracks().forEach(track => track.stop());
        }
        if (recordingData.screenStream) {
          recordingData.screenStream.getTracks().forEach(track => track.stop());
        }
        if (recordingData.webcamStream) {
          recordingData.webcamStream.getTracks().forEach(track => track.stop());
        }
        if (recordingData.microphoneStream) {
          recordingData.microphoneStream.getTracks().forEach(track => track.stop());
        }
        if (recordingData.audioStream) {
          recordingData.audioStream.getTracks().forEach(track => track.stop());
        }
        console.log('[App] ✓ Streams cleaned up after error');
      }
      
      showToast(`Stop recording failed: ${err.message}`, 'error');
      setRecordingState('idle');
      setRecordingType(null);
      setRecordingData(null);
      setRecordingElapsedTime(0);
      setSelectedSource(null);
    }
  };

  /**
   * Handle source selection change
   * @param {Object} source - Selected source object
   */
  const handleSourceChange = (source) => {
    setSelectedSource(source);
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
          <RecordingPanel
            recordingState={recordingState}
            recordingDuration={recordingElapsedTime}
            onStartRecord={handleStartRecord}
            onStopRecord={handleStopRecord}
            selectedSource={selectedSource}
            availableSources={availableSources}
            onSourceChange={handleSourceChange}
            recordingType={recordingType}
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
        </main>
      </div>

      {/* Horizontal Timeline at Bottom */}
      <TimelineErrorBoundary>
        <TimelineContainer
          clips={clips}
          selectedClipId={selectedClipId}
          onSelectClip={handleSelectClip}
          onDeleteClip={handleDeleteClip}
          onDuplicateClip={handleDuplicateClip}
          onResetTrim={handleResetTrim}
          playheadPosition={currentPlaybackTime}
          onSeekToTime={handleSeekToTime}
          onTrimChange={handleTrimChange}
          onExport={() => setShowExportDialog(true)}
          isExporting={isExporting}
        />
      </TimelineErrorBoundary>

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
