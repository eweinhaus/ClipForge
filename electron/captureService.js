const { desktopCapturer } = require('electron');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/**
 * Capture Service Module
 * Handles screen recording, webcam recording, and composite recording
 * Note: This module runs in the main process, so browser APIs are not available
 */

// Constants
const RECORDING_FPS = 30;
const MIN_RESOLUTION = { width: 720, height: 480 };
const IDEAL_RESOLUTION = { width: 1920, height: 1080 };

/**
 * Get available screen and window sources
 * @returns {Promise<Array>} Array of source objects with id, name, and thumbnail
 */
async function getSources() {
  try {
    console.log('[CaptureService] Getting available sources...');
    
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 150, height: 150 }
    });

    console.log(`[CaptureService] Found ${sources.length} sources`);
    
    return sources.map(source => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL()
    }));
  } catch (error) {
    console.error('[CaptureService] Error getting sources:', error);
    throw new Error(`Failed to get screen sources: ${error.message}`);
  }
}

/**
 * Test screen recording permissions
 * @returns {Promise<boolean>} True if permissions are available
 */
async function testScreenPermissions() {
  try {
    const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
    return sources.length > 0;
  } catch (error) {
    console.error('[CaptureService] Permission test failed:', error);
    return false;
  }
}

/**
 * Request screen recording permission
 * Note: This is a placeholder - actual permission request happens in renderer
 * @returns {Promise<boolean>} True if permission granted
 */
async function requestScreenPermission() {
  try {
    // In the main process, we can't directly request permissions
    // This should be handled in the renderer process
    console.log('[CaptureService] Permission request - handled in renderer');
    return true;
  } catch (error) {
    console.error('[CaptureService] Permission request failed:', error);
    return false;
  }
}

/**
 * Start webcam recording
 * Note: This is a placeholder - actual webcam recording happens in renderer
 * @returns {Promise<Object>} Recording data with stream and recorder
 */
async function startWebcamRecord() {
  try {
    // In the main process, we can't directly access getUserMedia
    // This should be handled in the renderer process
    console.log('[CaptureService] Webcam recording - handled in renderer');
    return {
      success: true,
      message: 'Webcam recording handled in renderer process'
    };
  } catch (error) {
    console.error('[CaptureService] Webcam recording error:', error);
    throw new Error(`Failed to start webcam recording: ${error.message}`);
  }
}

/**
 * Stop webcam recording
 * Note: This is a placeholder - actual stopping happens in renderer
 * @param {Object} recorder - The MediaRecorder instance
 * @param {string} outputPath - Path where to save the recording
 * @returns {Promise<Object>} Metadata about the recorded file
 */
async function stopWebcamRecording(recorder, outputPath) {
  try {
    // In the main process, we can't directly stop MediaRecorder
    // This should be handled in the renderer process
    console.log('[CaptureService] Webcam recording stop - handled in renderer');
    return {
      success: true,
      message: 'Webcam recording stop handled in renderer process'
    };
  } catch (error) {
    console.error('[CaptureService] Webcam recording stop error:', error);
    throw new Error(`Failed to stop webcam recording: ${error.message}`);
  }
}

/**
 * Start composite recording (screen + webcam)
 * Note: This is a placeholder - actual composite recording happens in renderer
 * @param {string} screenSourceId - ID of the screen/window to record
 * @returns {Promise<Object>} Recording data with stream and recorder
 */
async function startCompositeRecord(screenSourceId) {
  try {
    // In the main process, we can't directly access getUserMedia or create MediaRecorder
    // This should be handled in the renderer process
    console.log('[CaptureService] Composite recording - handled in renderer');
    return {
      success: true,
      message: 'Composite recording handled in renderer process',
      screenSourceId
    };
  } catch (error) {
    console.error('[CaptureService] Composite recording error:', error);
    throw new Error(`Failed to start composite recording: ${error.message}`);
  }
}

/**
 * Stop composite recording
 * Note: This is a placeholder - actual stopping happens in renderer
 * @param {Object} recorder - The MediaRecorder instance
 * @param {string} outputPath - Path where to save the recording
 * @returns {Promise<Object>} Metadata about the recorded file
 */
async function stopCompositeRecording(recorder, outputPath) {
  try {
    // In the main process, we can't directly stop MediaRecorder
    // This should be handled in the renderer process
    console.log('[CaptureService] Composite recording stop - handled in renderer');
    return {
      success: true,
      message: 'Composite recording stop handled in renderer process'
    };
  } catch (error) {
    console.error('[CaptureService] Composite recording stop error:', error);
    throw new Error(`Failed to stop composite recording: ${error.message}`);
  }
}

module.exports = {
  getSources,
  testScreenPermissions,
  requestScreenPermission,
  startWebcamRecord,
  stopWebcamRecording,
  startCompositeRecord,
  stopCompositeRecording,
  RECORDING_FPS,
  MIN_RESOLUTION,
  IDEAL_RESOLUTION
};