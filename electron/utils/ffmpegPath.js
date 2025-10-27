const path = require('path');
const { app } = require('electron');
const os = require('os');
const fs = require('fs');

function ensureExecutable(binaryPath, label) {
  try {
    fs.accessSync(binaryPath, fs.constants.X_OK);
  } catch (err) {
    if (err.code === 'EACCES') {
      try {
        fs.chmodSync(binaryPath, 0o755);
        fs.accessSync(binaryPath, fs.constants.X_OK);
        console.info(`[FFmpeg] Added execute permission to ${label} at ${binaryPath}`);
      } catch (chmodErr) {
        console.warn(`[FFmpeg] Failed to set execute permission for ${label} at ${binaryPath}`, chmodErr);
      }
    } else if (err.code === 'ENOENT') {
      console.warn(`[FFmpeg] ${label} binary not found at ${binaryPath}`);
    } else {
      console.warn(`[FFmpeg] Unable to access ${label} at ${binaryPath}`, err);
    }
  }

  return binaryPath;
}

function getFFmpegPath() {
  const arch = os.arch();
  const platform = os.platform();
  
  let resourcesPath;
  if (app.isPackaged) {
    resourcesPath = process.resourcesPath;
  } else {
    // In development, resources are copied to .webpack/main/resources
    resourcesPath = path.join(__dirname, '..', '..', '.webpack', 'main', 'resources');
  }
  
  const binaryPath = path.join(
    resourcesPath,
    'ffmpeg',
    `${platform}-${arch}`,
    'ffmpeg'
  );

  return ensureExecutable(binaryPath, 'ffmpeg');
}

function getFFprobePath() {
  const arch = os.arch();
  const platform = os.platform();
  
  let resourcesPath;
  if (app.isPackaged) {
    resourcesPath = process.resourcesPath;
  } else {
    resourcesPath = path.join(__dirname, '..', '..', '.webpack', 'main', 'resources');
  }
  
  const binaryPath = path.join(
    resourcesPath,
    'ffmpeg',
    `${platform}-${arch}`,
    'ffprobe'
  );

  return ensureExecutable(binaryPath, 'ffprobe');
}

module.exports = { getFFmpegPath, getFFprobePath };
