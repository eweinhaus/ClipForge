/**
 * Video Compositor Utility
 * Handles canvas-based video compositing for Picture-in-Picture recording
 */

// PiP position constants
const PIP_POSITIONS = {
  TOP_LEFT: 'top-left',
  TOP_RIGHT: 'top-right',
  BOTTOM_LEFT: 'bottom-left',
  BOTTOM_RIGHT: 'bottom-right'
};

// PiP size presets (as percentage of shorter screen dimension)
const PIP_SIZES = {
  SMALL: 0.2,   // 20%
  MEDIUM: 0.3,  // 30%
  LARGE: 0.4    // 40%
};

/**
 * Calculate PiP overlay dimensions and position
 * @param {number} screenWidth - Screen video width
 * @param {number} screenHeight - Screen video height
 * @param {string} position - PiP position (PIP_POSITIONS)
 * @param {number} size - PiP size as percentage (PIP_SIZES)
 * @param {number} padding - Padding from edges in pixels
 * @returns {Object} {x, y, width, height}
 */
function calculatePipOverlay(screenWidth, screenHeight, position, size, padding = 20) {
  const shorterDimension = Math.min(screenWidth, screenHeight);
  const pipSize = Math.floor(shorterDimension * size);
  
  // Maintain 16:9 aspect ratio for webcam overlay
  const aspectRatio = 16 / 9;
  let width = pipSize;
  let height = Math.floor(pipSize / aspectRatio);
  
  // If height is too large, scale down
  if (height > pipSize) {
    height = pipSize;
    width = Math.floor(height * aspectRatio);
  }
  
  // Calculate position based on corner
  let x, y;
  switch (position) {
    case PIP_POSITIONS.TOP_LEFT:
      x = padding;
      y = padding;
      break;
    case PIP_POSITIONS.TOP_RIGHT:
      x = screenWidth - width - padding;
      y = padding;
      break;
    case PIP_POSITIONS.BOTTOM_LEFT:
      x = padding;
      y = screenHeight - height - padding;
      break;
    case PIP_POSITIONS.BOTTOM_RIGHT:
    default:
      x = screenWidth - width - padding;
      y = screenHeight - height - padding;
      break;
  }
  
  return { x, y, width, height };
}

/**
 * Create a composite video stream with PiP overlay
 * @param {MediaStream} screenStream - Screen capture stream
 * @param {MediaStream} webcamStream - Webcam stream
 * @param {Object} settings - PiP settings
 * @param {string} settings.position - PiP position
 * @param {number} settings.size - PiP size percentage
 * @param {number} settings.opacity - PiP opacity (0-1)
 * @param {number} fps - Target frame rate
 * @returns {Object} {stream, cleanup}
 */
function createCompositeStream(screenStream, webcamStream, settings, fps = 30) {
  const { position = PIP_POSITIONS.BOTTOM_RIGHT, size = PIP_SIZES.MEDIUM, opacity = 0.9 } = settings;
  
  // Create video elements for compositing
  const screenVideo = document.createElement('video');
  const webcamVideo = document.createElement('video');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Set up video elements
  screenVideo.srcObject = screenStream;
  webcamVideo.srcObject = webcamStream;
  screenVideo.muted = true; // Prevent audio feedback
  webcamVideo.muted = true;
  
  let animationId = null;
  let isCompositing = false;
  
  // Wait for video metadata to load
  const setupCompositing = () => {
    return new Promise((resolve) => {
      let loadedCount = 0;
      
      const onLoadedMetadata = () => {
        loadedCount++;
        if (loadedCount === 2) {
          // Set canvas size to match screen video
          canvas.width = screenVideo.videoWidth;
          canvas.height = screenVideo.videoHeight;
          
          console.log('[VideoCompositor] Canvas size:', canvas.width, 'x', canvas.height);
          console.log('[VideoCompositor] Webcam size:', webcamVideo.videoWidth, 'x', webcamVideo.videoHeight);
          
          // Start compositing loop
          startCompositingLoop();
          resolve();
        }
      };
      
      screenVideo.addEventListener('loadedmetadata', onLoadedMetadata);
      webcamVideo.addEventListener('loadedmetadata', onLoadedMetadata);
      
      // Start playing videos
      screenVideo.play().catch(console.error);
      webcamVideo.play().catch(console.error);
    });
  };
  
  // Start the compositing animation loop
  const startCompositingLoop = () => {
    isCompositing = true;
    
    const compositeFrame = () => {
      if (!isCompositing) return;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw screen video as background
      ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
      
      // Calculate PiP overlay dimensions
      const overlay = calculatePipOverlay(canvas.width, canvas.height, position, size);
      
      // Set opacity for webcam overlay
      ctx.globalAlpha = opacity;
      
      // Draw webcam video as overlay
      ctx.drawImage(webcamVideo, overlay.x, overlay.y, overlay.width, overlay.height);
      
      // Reset opacity
      ctx.globalAlpha = 1.0;
      
      // Schedule next frame
      animationId = requestAnimationFrame(compositeFrame);
    };
    
    // Start the loop
    compositeFrame();
  };
  
  // Create MediaStream from canvas
  const compositeStream = canvas.captureStream(fps);
  
  // Add audio tracks from screen stream (microphone)
  const audioTracks = screenStream.getAudioTracks();
  audioTracks.forEach(track => {
    compositeStream.addTrack(track);
    console.log('[VideoCompositor] Added audio track to composite stream');
  });
  
  // Cleanup function
  const cleanup = () => {
    console.log('[VideoCompositor] Cleaning up compositing...');
    isCompositing = false;
    
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    
    // Stop video elements
    screenVideo.pause();
    webcamVideo.pause();
    screenVideo.srcObject = null;
    webcamVideo.srcObject = null;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };
  
  // Start compositing when metadata is loaded
  setupCompositing().catch(console.error);
  
  return {
    stream: compositeStream,
    cleanup,
    canvas // Expose canvas for debugging
  };
}

/**
 * Validate PiP settings
 * @param {Object} settings - PiP settings to validate
 * @returns {Object} {valid, errors}
 */
function validatePipSettings(settings) {
  const errors = [];
  
  if (!settings.position || !Object.values(PIP_POSITIONS).includes(settings.position)) {
    errors.push('Invalid PiP position');
  }
  
  if (typeof settings.size !== 'number' || settings.size < 0.1 || settings.size > 0.8) {
    errors.push('PiP size must be between 0.1 and 0.8');
  }
  
  if (typeof settings.opacity !== 'number' || settings.opacity < 0.1 || settings.opacity > 1.0) {
    errors.push('PiP opacity must be between 0.1 and 1.0');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  PIP_POSITIONS,
  PIP_SIZES,
  calculatePipOverlay,
  createCompositeStream,
  validatePipSettings
};
