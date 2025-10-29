/**
 * Test video fixtures helper
 * Provides paths to test video files for use in Playwright tests
 */

const path = require('path');
const fs = require('fs');

const FIXTURES_DIR = path.join(__dirname, '../scripts/test-fixtures/test-fixtures');

/**
 * Get path to a test video file
 * @param {string} filename - Name of the test video file
 * @returns {string} Full path to the test video
 */
function getTestVideoPath(filename) {
  const videoPath = path.join(FIXTURES_DIR, filename);
  if (!fs.existsSync(videoPath)) {
    throw new Error(`Test video fixture not found: ${filename}. Run 'npm run create-test-videos' first.`);
  }
  return videoPath;
}

/**
 * Check if test fixtures exist
 * @returns {boolean}
 */
function fixturesExist() {
  return fs.existsSync(FIXTURES_DIR) && fs.existsSync(path.join(FIXTURES_DIR, 'main_audio.mp4'));
}

/**
 * Get all available test video files
 * @returns {string[]} Array of test video filenames
 */
function getAvailableTestVideos() {
  if (!fixturesExist()) {
    return [];
  }
  
  const files = fs.readdirSync(FIXTURES_DIR);
  return files.filter(file => file.endsWith('.mp4'));
}

module.exports = {
  getTestVideoPath,
  fixturesExist,
  getAvailableTestVideos,
  FIXTURES_DIR,
};

