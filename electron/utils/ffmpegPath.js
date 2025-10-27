const path = require('path');
const { app } = require('electron');
const os = require('os');

function getFFmpegPath() {
  if (process.env.NODE_ENV === 'development') {
    // Use system FFmpeg in dev (assumes brew install ffmpeg)
    return 'ffmpeg';
  }
  
  // Production: use bundled FFmpeg
  const arch = os.arch(); // 'arm64' or 'x64'
  const platform = os.platform(); // 'darwin'
  const resourcesPath = process.resourcesPath;
  
  return path.join(
    resourcesPath,
    'ffmpeg',
    `${platform}-${arch}`,
    'ffmpeg'
  );
}

function getFFprobePath() {
  if (process.env.NODE_ENV === 'development') {
    return 'ffprobe';
  }
  
  const arch = os.arch();
  const platform = os.platform();
  const resourcesPath = process.resourcesPath;
  
  return path.join(
    resourcesPath,
    'ffmpeg',
    `${platform}-${arch}`,
    'ffprobe'
  );
}

module.exports = { getFFmpegPath, getFFprobePath };
