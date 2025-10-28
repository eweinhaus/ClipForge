const path = require('path');
const arch = process.arch;
const fs = require('fs');
let isPackaged = false;
try {
  // app.isPackaged is the most reliable signal
  const { app } = require('electron');
  isPackaged = !!app && app.isPackaged;
} catch (_) {
  // Ignore if not in Electron main context
}

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

function resolveBinaryPath(binaryName) {
  const candidates = [];

  // 1) Development source path (checked-in binaries) - try this first
  candidates.push(path.join(__dirname, '..', 'resources', 'ffmpeg', `darwin-${arch}`, binaryName));

  // 2) Packaged app resources path
  candidates.push(path.join(process.resourcesPath || '', 'ffmpeg', `darwin-${arch}`, binaryName));

  // 3) Webpack dev paths (these may not exist in dev mode)
  candidates.push(path.join(__dirname, '..', '..', '.webpack', 'main', 'resources', 'ffmpeg', `darwin-${arch}`, binaryName));
  candidates.push(path.join(__dirname, '..', '..', '.webpack', 'resources', 'ffmpeg', `darwin-${arch}`, binaryName));

  console.log(`[FFmpegPath] Resolving ${binaryName}, trying paths:`, candidates);

  for (const candidate of candidates) {
    try {
      if (candidate && fs.existsSync(candidate)) {
        console.log(`[FFmpegPath] Found ${binaryName} at:`, candidate);
        return ensureExecutable(candidate, binaryName);
      }
    } catch (_) {
      // continue
    }
  }

  console.error(`[FFmpegPath] No ${binaryName} found in any candidate path`);
  // Return the first candidate to surface a useful error path if none exist
  return ensureExecutable(candidates[0], binaryName);
}

function getFfmpegBinaryPath() {
  return resolveBinaryPath('ffmpeg');
}

function getFfprobeBinaryPath() {
  return resolveBinaryPath('ffprobe');
}

// Backwards-compat exports for callers using different casing
module.exports = {
  getFfmpegBinaryPath,
  getFfprobeBinaryPath,
  getFFmpegPath: getFfmpegBinaryPath,
  getFFprobePath: getFfprobeBinaryPath,
};
