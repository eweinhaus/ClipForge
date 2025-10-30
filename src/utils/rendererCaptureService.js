/**
 * Renderer-side Capture Service
 * Handles actual recording logic in the renderer process
 */

// Constants
const RECORDING_FPS = 30;
const MIN_RESOLUTION = { width: 720, height: 480 };
const IDEAL_RESOLUTION = { width: 1920, height: 1080 };

/**
 * Start screen recording from a specific source
 * @param {string} sourceId - ID of the screen/window to record
 * @returns {Promise<Object>} Recording data with stream and recorder
 */
async function startScreenRecord(sourceId) {
  try {
    console.log('[RendererCaptureService] ============= STARTING SCREEN RECORDING =============');
    console.log('[RendererCaptureService] Source ID:', sourceId);
    console.log('[RendererCaptureService] Navigator available:', !!navigator);
    console.log('[RendererCaptureService] MediaDevices available:', !!navigator?.mediaDevices);
    console.log('[RendererCaptureService] getDisplayMedia available:', !!navigator?.mediaDevices?.getDisplayMedia);
    console.log('[RendererCaptureService] getUserMedia available:', !!navigator?.mediaDevices?.getUserMedia);
    
    if (!sourceId) {
      throw new Error('Source ID is required for screen recording');
    }

    // Check if we're trying to record the ClipForge window itself
    const currentWindowId = window.location.href;
    console.log('[RendererCaptureService] Current window URL:', currentWindowId);

    console.log('[RendererCaptureService] === ATTEMPTING METHOD 1: getDisplayMedia (Modern Standard) ===');
    
    // Try modern getDisplayMedia first (doesn't trigger IPC error 263)
    let screenStream;
    try {
      // Request screen video only (audio causes NotSupportedError on macOS/Chromium)
      const constraints = {
        video: {
          displaySurface: 'monitor',
          cursor: 'always',
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 30, max: 30 }
        }
      };
      
      console.log('[RendererCaptureService] Constraints:', JSON.stringify(constraints, null, 2));
      console.log('[RendererCaptureService] *** ABOUT TO CALL getDisplayMedia() ***');
      console.log('[RendererCaptureService] Time:', new Date().toISOString());
      
      screenStream = await navigator.mediaDevices.getDisplayMedia(constraints);
      
      console.log('[RendererCaptureService] *** getDisplayMedia() RETURNED ***');
      console.log('[RendererCaptureService] Time:', new Date().toISOString());
      console.log('[RendererCaptureService] ✓ getDisplayMedia succeeded!');
      console.log('[RendererCaptureService] Method used: Modern getDisplayMedia API');
    } catch (displayMediaError) {
      console.error('[RendererCaptureService] ✗ getDisplayMedia failed:', {
        name: displayMediaError.name,
        message: displayMediaError.message
      });
      
      console.log('[RendererCaptureService] === ATTEMPTING METHOD 2: Electron desktopCapturer via IPC ===');
      
      // Fallback: Use Electron's desktopCapturer with getUserMedia
      try {
        console.log('[RendererCaptureService] === ATTEMPTING METHOD 2: getUserMedia with desktopCapturer ===');
        
        const constraints = {
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: sourceId,
              minWidth: 1280,
              maxWidth: 1920,
              minHeight: 720,
              maxHeight: 1080,
              minFrameRate: 15,
              maxFrameRate: 30
            }
          }
        };
        
        console.log('[RendererCaptureService] Fallback constraints:', JSON.stringify(constraints, null, 2));
        console.log('[RendererCaptureService] *** ABOUT TO CALL getUserMedia() (DESKTOPCAPTURER FALLBACK) ***');
        console.log('[RendererCaptureService] Time:', new Date().toISOString());
        console.log('[RendererCaptureService] WARNING: This uses deprecated API but may work in older Electron versions');
        
        screenStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        console.log('[RendererCaptureService] *** getUserMedia() RETURNED (DESKTOPCAPTURER FALLBACK) ***');
        console.log('[RendererCaptureService] Time:', new Date().toISOString());
        console.log('[RendererCaptureService] ✓ getUserMedia desktopCapturer fallback succeeded!');
        console.log('[RendererCaptureService] Method used: getUserMedia with desktopCapturer');
        
      } catch (getUserMediaError) {
        console.error('[RendererCaptureService] ✗ getUserMedia desktopCapturer fallback also failed:', {
          name: getUserMediaError.name,
          message: getUserMediaError.message,
          stack: getUserMediaError.stack
        });
        
        // Handle specific errors
        if (displayMediaError.name === 'NotAllowedError') {
          throw new Error('Screen recording permission denied. Please enable screen recording in System Preferences > Security & Privacy > Screen Recording.');
        } else if (displayMediaError.name === 'NotSupportedError') {
          throw new Error('Screen recording not supported. This may be a browser/Electron compatibility issue.');
        } else {
          throw new Error(`Screen recording failed: ${displayMediaError.message} (${displayMediaError.name})`);
        }
      }
    }

    console.log('[RendererCaptureService] ✓ Screen stream obtained successfully');
    console.log('[RendererCaptureService] Stream details:', {
      id: screenStream.id,
      active: screenStream.active,
      videoTracks: screenStream.getVideoTracks().length,
      audioTracks: screenStream.getAudioTracks().length
    });
    
    if (screenStream.getVideoTracks().length > 0) {
      const videoTrack = screenStream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      console.log('[RendererCaptureService] Video track settings:', settings);
      console.log('[RendererCaptureService] Resolution:', `${settings.width}x${settings.height}`);
      console.log('[RendererCaptureService] Frame rate:', settings.frameRate);
    }

    // Get microphone audio separately (since getDisplayMedia audio is not supported)
    console.log('[RendererCaptureService] Getting microphone audio...');
    let audioStream = null;
    try {
      audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,        // Higher sample rate for better quality
          channelCount: 2,          // Stereo audio
          volume: 1.0,              // Full volume
          latency: 0.01,            // Low latency
          sampleSize: 16            // 16-bit samples
        }
      });
      console.log('[RendererCaptureService] ✓ Microphone audio obtained');
      
      // Add audio tracks to screen stream
      audioStream.getAudioTracks().forEach(track => {
        screenStream.addTrack(track);
        console.log('[RendererCaptureService] Added audio track to screen stream');
      });
    } catch (audioError) {
      console.warn('[RendererCaptureService] ⚠️ Microphone audio failed (continuing without audio):', audioError.message);
      // Continue without audio - user can still record screen video
    }

    // Create MediaRecorder with better error handling
    console.log('[RendererCaptureService] Creating MediaRecorder...');
    console.log('[RendererCaptureService] Checking supported mime types...');
    
    let mimeType;
    const supportedTypes = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4'
    ];
    
    for (const type of supportedTypes) {
      const isSupported = MediaRecorder.isTypeSupported(type);
      console.log(`[RendererCaptureService]   ${type}: ${isSupported ? '✓' : '✗'}`);
      if (isSupported && !mimeType) {
        mimeType = type;
      }
    }
    
    if (!mimeType) {
      throw new Error('No supported video format found for recording. Browser may not support MediaRecorder API.');
    }
    
    console.log('[RendererCaptureService] Selected mimeType:', mimeType);
    
    try {
      const recorder = new MediaRecorder(screenStream, {
        mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps for good quality
        audioBitsPerSecond: 128000   // 128 kbps for high-quality audio
      });

      console.log('[RendererCaptureService] ✓ MediaRecorder created successfully');
      console.log('[RendererCaptureService] MediaRecorder state:', recorder.state);
      console.log('[RendererCaptureService] ============= SCREEN RECORDING SETUP COMPLETE =============');

      return {
        stream: screenStream,
        recorder,
        sourceId,
        mimeType,
        audioStream: audioStream
      };
    } catch (recorderError) {
      console.error('[RendererCaptureService] ✗ MediaRecorder creation failed:', {
        name: recorderError.name,
        message: recorderError.message,
        stack: recorderError.stack
      });
      
      // Clean up stream
      screenStream.getTracks().forEach(track => track.stop());
      
      throw new Error(`Failed to create MediaRecorder: ${recorderError.message}`);
    }
  } catch (error) {
    console.error('[RendererCaptureService] ✗ Error starting screen recording:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    console.log('[RendererCaptureService] ============= SCREEN RECORDING FAILED =============');
    
    // Handle specific permission errors
    if (error.name === 'NotAllowedError' || error.message.includes('permission')) {
      throw new Error('Screen recording permission denied. Please enable screen recording in System Preferences > Security & Privacy > Screen Recording.');
    }
    
    throw new Error(`Failed to start screen recording: ${error.message}`);
  }
}

/**
 * Start webcam recording
 * @returns {Promise<Object>} Recording data with stream and recorder
 */
async function startWebcamRecord() {
  try {
    console.log('[RendererCaptureService] ============= STARTING WEBCAM RECORDING =============');
    console.log('[RendererCaptureService] MediaDevices available:', !!navigator?.mediaDevices);
    
    const constraints = {
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: true // Enable audio for webcam
    };
    
    console.log('[RendererCaptureService] Constraints:', JSON.stringify(constraints, null, 2));
    console.log('[RendererCaptureService] Attempting to get webcam stream...');

    // Get webcam stream
    let webcamStream;
    try {
      webcamStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('[RendererCaptureService] ✓ Webcam stream obtained successfully');
    } catch (error) {
      console.error('[RendererCaptureService] ✗ Webcam getUserMedia error:', {
        name: error.name,
        message: error.message
      });
      
      // Handle specific permission errors
      if (error.name === 'NotAllowedError') {
        throw new Error('Camera permission denied. Please enable camera access in System Preferences > Security & Privacy > Camera.');
      } else if (error.name === 'NotFoundError') {
        throw new Error('No camera found. Please connect a camera and try again.');
      } else {
        throw new Error(`Failed to access camera: ${error.message}`);
      }
    }

    console.log('[RendererCaptureService] Stream details:', {
      id: webcamStream.id,
      active: webcamStream.active,
      videoTracks: webcamStream.getVideoTracks().length,
      audioTracks: webcamStream.getAudioTracks().length
    });

    // Create MediaRecorder
    console.log('[RendererCaptureService] Creating MediaRecorder for webcam...');
    let mimeType;
    const supportedTypes = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4'
    ];
    
    for (const type of supportedTypes) {
      if (MediaRecorder.isTypeSupported(type) && !mimeType) {
        mimeType = type;
        break;
      }
    }
    
    if (!mimeType) {
      throw new Error('No supported video format found for recording');
    }
    
    console.log('[RendererCaptureService] Selected mimeType:', mimeType);
    
    const recorder = new MediaRecorder(webcamStream, {
      mimeType,
      videoBitsPerSecond: 2500000, // 2.5 Mbps
      audioBitsPerSecond: 128000   // 128 kbps for high-quality audio
    });

    console.log('[RendererCaptureService] ✓ MediaRecorder created for webcam');
    console.log('[RendererCaptureService] ============= WEBCAM RECORDING SETUP COMPLETE =============');

    return {
      stream: webcamStream,
      recorder,
      sourceId: 'webcam',
      mimeType
    };
  } catch (error) {
    console.error('[RendererCaptureService] ✗ Error starting webcam recording:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    console.log('[RendererCaptureService] ============= WEBCAM RECORDING FAILED =============');
    
    // Handle specific permission errors
    if (error.name === 'NotAllowedError' || error.message.includes('permission')) {
      throw new Error('Camera permission denied. Please enable camera access in System Preferences > Security & Privacy > Camera.');
    }
    
    throw new Error(`Failed to start webcam recording: ${error.message}`);
  }
}

/**
 * Start composite recording (screen + webcam) with Picture-in-Picture overlay
 * @param {string} screenSourceId - ID of the screen/window to record
 * @param {Object} pipSettings - PiP overlay settings
 * @returns {Promise<Object>} Recording data with composite stream and recorder
 */
async function startCompositeRecord(screenSourceId, pipSettings = {}) {
  try {
    console.log('[RendererCaptureService] ============= STARTING COMPOSITE RECORDING WITH PIP =============');
    console.log('[RendererCaptureService] Screen Source ID:', screenSourceId);
    console.log('[RendererCaptureService] PiP Settings:', pipSettings);
    
    // Import video compositor
    const { createCompositeStream, PIP_POSITIONS, PIP_SIZES } = require('./videoCompositor.js');
    
    // Get screen stream using modern API first (video only - audio causes NotSupportedError)
    console.log('[RendererCaptureService] STEP 1: Getting screen stream...');
    console.log('[RendererCaptureService] *** ABOUT TO CALL getDisplayMedia() for composite ***');
    
    let screenStream;
    try {
      screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          cursor: 'always',
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 30, max: 30 }
        }
      });
      console.log('[RendererCaptureService] *** getDisplayMedia() RETURNED for composite ***');
      console.log('[RendererCaptureService] ✓ Screen stream obtained');
    } catch (displayError) {
      console.error('[RendererCaptureService] ✗ getDisplayMedia failed for composite:', displayError);
      
      console.log('[RendererCaptureService] === ATTEMPTING FALLBACK: getUserMedia with desktopCapturer ===');
      
      // Fallback: Use Electron's desktopCapturer with getUserMedia
      try {
        const constraints = {
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: screenSourceId,
              minWidth: 1280,
              maxWidth: 1920,
              minHeight: 720,
              maxHeight: 1080,
              minFrameRate: 15,
              maxFrameRate: 30
            }
          }
        };
        
        console.log('[RendererCaptureService] *** ABOUT TO CALL getUserMedia() (COMPOSITE FALLBACK) ***');
        screenStream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('[RendererCaptureService] *** getUserMedia() RETURNED (COMPOSITE FALLBACK) ***');
        console.log('[RendererCaptureService] ✓ getUserMedia desktopCapturer fallback succeeded for composite!');
        
      } catch (fallbackError) {
        console.error('[RendererCaptureService] ✗ Composite fallback also failed:', fallbackError);
        throw new Error(`Failed to get screen stream: ${displayError.message}`);
      }
    }
    
    // Get webcam stream
    console.log('[RendererCaptureService] STEP 2: Getting webcam stream...');
    console.log('[RendererCaptureService] *** ABOUT TO CALL getUserMedia() for webcam ***');
    
    let webcamStream;
    try {
      webcamStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,        // Higher sample rate for better quality
          channelCount: 2,          // Stereo audio
          volume: 1.0,              // Full volume
          latency: 0.01,            // Low latency
          sampleSize: 16            // 16-bit samples
        }
      });
      console.log('[RendererCaptureService] *** getUserMedia() RETURNED for webcam ***');
      console.log('[RendererCaptureService] ✓ Webcam stream obtained');
    } catch (webcamError) {
      console.error('[RendererCaptureService] ✗ getUserMedia failed for webcam:', webcamError);
      // Clean up screen stream
      screenStream.getTracks().forEach(track => track.stop());
      throw new Error(`Failed to get webcam stream: ${webcamError.message}`);
    }

    // Get additional microphone audio for screen recording
    console.log('[RendererCaptureService] STEP 3: Getting microphone audio for screen...');
    let microphoneStream = null;
    try {
      microphoneStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,        // Higher sample rate for better quality
          channelCount: 2,          // Stereo audio
          volume: 1.0,              // Full volume
          latency: 0.01,            // Low latency
          sampleSize: 16            // 16-bit samples
        }
      });
      console.log('[RendererCaptureService] ✓ Microphone audio obtained');
      
      // Add microphone audio to screen stream
      microphoneStream.getAudioTracks().forEach(track => {
        screenStream.addTrack(track);
        console.log('[RendererCaptureService] Added microphone track to screen stream');
      });
    } catch (micError) {
      console.warn('[RendererCaptureService] ⚠️ Microphone audio failed (continuing without mic audio):', micError.message);
      // Continue without microphone audio
    }

    console.log('[RendererCaptureService] ✓ All streams obtained successfully');

    // Create composite stream with PiP overlay using canvas compositing
    console.log('[RendererCaptureService] STEP 4: Creating PiP composite stream...');
    
    // Default PiP settings
    const defaultPipSettings = {
      position: PIP_POSITIONS.BOTTOM_RIGHT,
      size: PIP_SIZES.MEDIUM,
      opacity: 0.9,
      ...pipSettings
    };
    
    console.log('[RendererCaptureService] Using PiP settings:', defaultPipSettings);
    
    // Create the composite stream with canvas-based PiP overlay
    const { stream: compositeStream, cleanup: cleanupCompositing } = createCompositeStream(
      screenStream, 
      webcamStream, 
      defaultPipSettings,
      RECORDING_FPS
    );

    console.log('[RendererCaptureService] Composite stream details:', {
      id: compositeStream.id,
      active: compositeStream.active,
      videoTracks: compositeStream.getVideoTracks().length,
      audioTracks: compositeStream.getAudioTracks().length
    });

    // Create MediaRecorder with composite stream
    console.log('[RendererCaptureService] Creating MediaRecorder for composite...');
    let mimeType;
    const supportedTypes = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4'
    ];
    
    for (const type of supportedTypes) {
      if (MediaRecorder.isTypeSupported(type) && !mimeType) {
        mimeType = type;
        break;
      }
    }
    
    if (!mimeType) {
      throw new Error('No supported video format found for composite recording');
    }
    
    console.log('[RendererCaptureService] Selected mimeType for composite:', mimeType);
    
    const recorder = new MediaRecorder(compositeStream, {
      mimeType,
      videoBitsPerSecond: 2500000, // 2.5 Mbps
      audioBitsPerSecond: 128000   // 128 kbps for high-quality audio
    });

    console.log('[RendererCaptureService] ✓ Composite MediaRecorder created');
    console.log('[RendererCaptureService] ============= COMPOSITE RECORDING SETUP COMPLETE =============');

    return {
      stream: compositeStream,
      recorder,
      sourceId: screenSourceId,
      mimeType,
      screenStream,
      webcamStream,
      microphoneStream,
      pipSettings: defaultPipSettings,
      cleanupCompositing // Include cleanup function for proper resource management
    };
  } catch (error) {
    console.error('[RendererCaptureService] Error starting composite recording:', error);
    
    // Handle specific permission errors
    if (error.name === 'NotAllowedError' || error.message.includes('permission')) {
      throw new Error('Screen or camera permission denied. Please enable both in System Preferences.');
    }
    
    throw new Error(`Failed to start composite recording: ${error.message}`);
  }
}

/**
 * Setup MediaRecorder with data collection
 * @param {MediaRecorder} recorder - The MediaRecorder instance
 * @returns {Array} chunks array that will collect recording data
 */
function setupRecorderDataCollection(recorder) {
  const chunks = [];
  
  recorder.ondataavailable = (event) => {
    console.log('[RendererCaptureService] Data available event:', {
      size: event.data.size,
      type: event.data.type
    });
    if (event.data.size > 0) {
      chunks.push(event.data);
      console.log('[RendererCaptureService] Chunk added, total chunks:', chunks.length);
    }
  };
  
  recorder.onerror = (event) => {
    console.error('[RendererCaptureService] Recorder error event:', event.error);
  };
  
  return chunks;
}

/**
 * Stop recording and save to file
 * @param {MediaRecorder} recorder - The MediaRecorder instance
 * @param {Array} chunks - Array of recorded data chunks
 * @param {string} outputPath - Path where to save the recording
 * @param {Object} recordingData - Additional recording data
 * @returns {Promise<Object>} Metadata about the recorded file
 */
async function stopRecording(recorder, chunks, outputPath, recordingData = {}) {
  try {
    console.log('[RendererCaptureService] Stopping recording...');
    console.log('[RendererCaptureService] Current chunks count:', chunks.length);
    
    return new Promise((resolve, reject) => {
      recorder.onstop = async () => {
        try {
          console.log('[RendererCaptureService] Recording stopped, processing chunks...');
          console.log('[RendererCaptureService] Chunks received:', chunks.length);
          
          if (chunks.length === 0) {
            console.error('[RendererCaptureService] No chunks received - recording failed');
            console.error('[RendererCaptureService] This usually indicates a MediaRecorder issue or stream problem');
            throw new Error('Recording failed: No data chunks were captured. This may be due to stream issues or MediaRecorder problems.');
          }
          
          // Combine chunks into blob
          const blob = new Blob(chunks, { type: recorder.mimeType });
          console.log('[RendererCaptureService] Blob created, size:', blob.size);
          
          if (blob.size === 0) {
            console.error('[RendererCaptureService] Empty blob created - recording failed');
            console.error('[RendererCaptureService] This indicates the MediaRecorder did not capture any data');
            throw new Error('Recording failed: No data was captured. The MediaRecorder may not have been properly configured or the stream may be invalid.');
          }
          
          // Convert blob to buffer and save to file
          const arrayBuffer = await blob.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          
          console.log('[RendererCaptureService] Writing file to:', outputPath);
          
          // Write file using Node.js fs (via IPC)
          const result = await window.electronAPI.writeRecordingFile(outputPath, uint8Array);
          
          if (!result.success) {
            throw new Error(result.error.message);
          }
          
          console.log('[RendererCaptureService] Recording saved successfully');
          
          // Clean up streams
          console.log('[RendererCaptureService] Cleaning up streams...');
          
          // Clean up compositing first (for PiP recordings)
          if (recordingData.cleanupCompositing) {
            console.log('[RendererCaptureService] Cleaning up compositing...');
            recordingData.cleanupCompositing();
          }
          
          if (recordingData.stream) {
            console.log('[RendererCaptureService] Stopping main stream tracks:', recordingData.stream.getTracks().length);
            recordingData.stream.getTracks().forEach(track => {
              console.log('[RendererCaptureService] Stopping track:', track.kind, track.label);
              track.stop();
            });
          }
          
          // Clean up additional streams
          if (recordingData.screenStream) {
            console.log('[RendererCaptureService] Stopping screen stream tracks:', recordingData.screenStream.getTracks().length);
            recordingData.screenStream.getTracks().forEach(track => {
              console.log('[RendererCaptureService] Stopping screen track:', track.kind, track.label);
              track.stop();
            });
          }
          if (recordingData.webcamStream) {
            console.log('[RendererCaptureService] Stopping webcam stream tracks:', recordingData.webcamStream.getTracks().length);
            recordingData.webcamStream.getTracks().forEach(track => {
              console.log('[RendererCaptureService] Stopping webcam track:', track.kind, track.label);
              track.stop();
            });
          }
          if (recordingData.microphoneStream) {
            console.log('[RendererCaptureService] Stopping microphone stream tracks:', recordingData.microphoneStream.getTracks().length);
            recordingData.microphoneStream.getTracks().forEach(track => {
              console.log('[RendererCaptureService] Stopping microphone track:', track.kind, track.label);
              track.stop();
            });
          }
          if (recordingData.audioStream) {
            console.log('[RendererCaptureService] Stopping audio stream tracks:', recordingData.audioStream.getTracks().length);
            recordingData.audioStream.getTracks().forEach(track => {
              console.log('[RendererCaptureService] Stopping audio track:', track.kind, track.label);
              track.stop();
            });
          }
          
          console.log('[RendererCaptureService] ✓ All streams cleaned up');
          
          // Generate thumbnail (simplified - just use first frame)
          const thumbnail = await generateThumbnail(outputPath);
          
          resolve({
            filePath: outputPath,
            duration: recordingData.duration || 0,
            width: recordingData.width || IDEAL_RESOLUTION.width,
            height: recordingData.height || IDEAL_RESOLUTION.height,
            fileSize: (uint8Array.byteLength / (1024 * 1024)).toFixed(2),
            thumbnail,
            mimeType: recorder.mimeType
          });
        } catch (error) {
          console.error('[RendererCaptureService] Error processing recording:', error);
          reject(new Error(`Failed to process recording: ${error.message}`));
        }
      };
      
      // Stop the recorder
      recorder.stop();
    });
  } catch (error) {
    console.error('[RendererCaptureService] Error stopping recording:', error);
    throw new Error(`Failed to stop recording: ${error.message}`);
  }
}

/**
 * Generate a thumbnail from a video file
 * @param {string} filePath - Path to the video file
 * @returns {Promise<string>} Base64 encoded thumbnail
 */
async function generateThumbnail(filePath) {
  try {
    // For now, return a placeholder thumbnail
    // In a real implementation, you'd use FFmpeg to extract a frame
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 90;
    const ctx = canvas.getContext('2d');
    
    // Draw a placeholder
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Recording', canvas.width / 2, canvas.height / 2);
    
    return canvas.toDataURL('image/jpeg', 0.8);
  } catch (error) {
    console.error('[RendererCaptureService] Error generating thumbnail:', error);
    return null;
  }
}

/**
 * Request screen recording permission
 * @returns {Promise<boolean>} True if permission granted
 */
async function requestScreenPermission() {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: 'monitor',
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: RECORDING_FPS }
      },
      audio: true
    });
    
    // Stop the stream immediately - we just wanted to trigger permission
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.error('[RendererCaptureService] Permission request failed:', error);
    return false;
  }
}

module.exports = {
  startScreenRecord,
  startWebcamRecord,
  startCompositeRecord,
  setupRecorderDataCollection,
  stopRecording,
  requestScreenPermission,
  RECORDING_FPS,
  MIN_RESOLUTION,
  IDEAL_RESOLUTION
};

