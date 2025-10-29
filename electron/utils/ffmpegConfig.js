const ffmpeg = require('fluent-ffmpeg');
const { getFfmpegBinaryPath, getFfprobeBinaryPath } = require('./ffmpegPath');
const fs = require('fs');

let isConfigured = false;

/**
 * Configure FFmpeg paths once and ensure they're consistent
 */
function configureFFmpeg() {
  if (isConfigured) {
    console.log('[FFmpegConfig] FFmpeg already configured, skipping');
    return;
  }
  
  console.log('[FFmpegConfig] Starting FFmpeg configuration...');

  const ffmpegPath = getFfmpegBinaryPath();
  const ffprobePath = getFfprobeBinaryPath();

  console.log('[FFmpegConfig] Configuring FFmpeg paths:', { ffmpegPath, ffprobePath });

  // Ensure the paths exist before setting them
  if (!fs.existsSync(ffmpegPath)) {
    console.error('[FFmpegConfig] FFmpeg binary not found at:', ffmpegPath);
    throw new Error(`FFmpeg binary not found at: ${ffmpegPath}`);
  }
  if (!fs.existsSync(ffprobePath)) {
    console.error('[FFmpegConfig] FFprobe binary not found at:', ffprobePath);
    throw new Error(`FFprobe binary not found at: ${ffprobePath}`);
  }

  // Set environment variables as well (fluent-ffmpeg might use these)
  process.env.FFMPEG_PATH = ffmpegPath;
  process.env.FFPROBE_PATH = ffprobePath;
  
  ffmpeg.setFfmpegPath(ffmpegPath);
  ffmpeg.setFfprobePath(ffprobePath);

  // Verify paths are set correctly
  console.log('[FFmpegConfig] FFmpeg paths configured successfully');
  console.log('[FFmpegConfig] Final configuration:', {
    ffmpegPath,
    ffprobePath,
    ffmpegExists: fs.existsSync(ffmpegPath),
    ffprobeExists: fs.existsSync(ffprobePath),
    envFFMPEG: process.env.FFMPEG_PATH,
    envFFPROBE: process.env.FFPROBE_PATH
  });

  isConfigured = true;
}

/**
 * Get the configured FFmpeg instance
 */
function getFFmpeg() {
  configureFFmpeg();
  return ffmpeg;
}

module.exports = {
  configureFFmpeg,
  getFFmpeg
};
