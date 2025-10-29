/**
 * Playwright test helpers for ClipForge
 * Provides utility functions for common test operations
 */

/**
 * Wait for app to be fully loaded
 * @param {import('@playwright/test').Page} page
 */
async function waitForAppLoad(page) {
  // Wait for the main app container
  await page.waitForSelector('.app-container', { timeout: 10000 });
  
  // Wait for any loading states to complete
  await page.waitForLoadState('networkidle');
}

/**
 * Check if a clip is visible in the timeline
 * @param {import('@playwright/test').Page} page
 * @param {string} clipName - Filename or identifier of the clip
 * @returns {Promise<boolean>}
 */
async function isClipVisible(page, clipName) {
  try {
    await page.waitForSelector(`text=${clipName}`, { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the number of clips in the timeline
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<number>}
 */
async function getClipCount(page) {
  const clipBlocks = await page.locator('.clip-block, .sortable-clip-block').count();
  return clipBlocks;
}

/**
 * Wait for import to complete
 * @param {import('@playwright/test').Page} page
 */
async function waitForImportComplete(page) {
  // Wait for loading state to disappear
  await page.waitForSelector('.loading-state', { state: 'hidden', timeout: 30000 }).catch(() => {});
  
  // Wait for any toast notifications to appear/disappear
  await page.waitForTimeout(1000);
}

/**
 * Check if export dialog is open
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>}
 */
async function isExportDialogOpen(page) {
  try {
    await page.waitForSelector('.export-dialog', { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get preview player element
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<import('@playwright/test').Locator>}
 */
async function getPreviewPlayer(page) {
  return page.locator('.multi-track-preview, .video-preview').first();
}

/**
 * Check if preview is playing
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>}
 */
async function isPreviewPlaying(page) {
  const playButton = page.locator('.play-pause-btn').first();
  const pauseIcon = playButton.locator('svg').first();
  
  // If pause icon is visible, video is playing
  const isPaused = await pauseIcon.isVisible().catch(() => false);
  return !isPaused; // Reversed logic: if pause icon exists, it's playing
}

/**
 * Click play/pause button
 * @param {import('@playwright/test').Page} page
 */
async function togglePlayPause(page) {
  const playButton = page.locator('.play-pause-btn').first();
  await playButton.click();
  await page.waitForTimeout(500); // Wait for state change
}

/**
 * Get timeline playhead position
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<number>} Position in pixels
 */
async function getPlayheadPosition(page) {
  const playhead = page.locator('.playhead').first();
  const style = await playhead.evaluate(el => window.getComputedStyle(el).left);
  return parseFloat(style);
}

module.exports = {
  waitForAppLoad,
  isClipVisible,
  getClipCount,
  waitForImportComplete,
  isExportDialogOpen,
  getPreviewPlayer,
  isPreviewPlaying,
  togglePlayPause,
  getPlayheadPosition,
};

