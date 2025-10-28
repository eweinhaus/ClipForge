const path = require('path');
const isDev = process.env.NODE_ENV === 'development';
const isMac = process.platform === 'darwin';
const arch = process.arch;
const fs = require('fs'); // Add this import

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

function getFfmpegBinaryPath() {
  const binaryPath = isDev
    ? path.join(__dirname, '..', '..', '.webpack', 'main', 'resources', 'ffmpeg', `darwin-${arch}`, 'ffmpeg')
    : path.join(process.resourcesPath, 'ffmpeg', `darwin-${arch}`, 'ffmpeg');
  console.log(`[FFmpegPath] FFmpeg binary path: ${binaryPath} (isDev: ${isDev})`);
  return ensureExecutable(binaryPath, 'ffmpeg');
}

function getFfprobeBinaryPath() {
  const binaryPath = isDev
    ? path.join(__dirname, '..', '..', '.webpack', 'main', 'resources', 'ffmpeg', `darwin-${arch}`, 'ffprobe')
    : path.join(process.resourcesPath, 'ffmpeg', `darwin-${arch}`, 'ffprobe');
  console.log(`[FFmpegPath] FFprobe binary path: ${binaryPath} (isDev: ${isDev})`);
  return ensureExecutable(binaryPath, 'ffprobe');
}

module.exports = { getFfmpegBinaryPath, getFfprobeBinaryPath };
