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

module.exports = {
  getSources,
  testScreenPermissions,
  requestScreenPermission,
  RECORDING_FPS,
  MIN_RESOLUTION,
  IDEAL_RESOLUTION
};