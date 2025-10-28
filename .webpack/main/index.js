/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./electron/fileManager.js":
/*!*********************************!*\
  !*** ./electron/fileManager.js ***!
  \*********************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const path = __webpack_require__(/*! path */ "path");
const ffmpeg = __webpack_require__(/*! fluent-ffmpeg */ "./node_modules/fluent-ffmpeg/index.js");
const {
  getFfmpegBinaryPath,
  getFfprobeBinaryPath
} = __webpack_require__(/*! ./utils/ffmpegPath */ "./electron/utils/ffmpegPath.js");
const fs = __webpack_require__(/*! fs */ "fs");
const os = __webpack_require__(/*! os */ "os");

// Configure FFmpeg paths
ffmpeg.setFfmpegPath(getFfmpegBinaryPath());
ffmpeg.setFfprobePath(getFfprobeBinaryPath());

/**
 * Error types for consistent error handling
 */
const ERROR_TYPES = {
  FFMPEG_ERROR: 'FFMPEG_ERROR',
  CORRUPT_VIDEO: 'CORRUPT_VIDEO',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  INVALID_FORMAT: 'INVALID_FORMAT'
};

/**
 * Create a timeout promise
 * @param {number} ms - Timeout in milliseconds
 * @returns {Promise} Promise that rejects after timeout
 */
function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), ms));
}

/**
 * Extract metadata from video file using ffprobe
 * @param {string} filePath - Absolute path to video file
 * @returns {Promise<Object>} Video metadata
 */
async function extractMetadata(filePath) {
  return new Promise((resolve, reject) => {
    console.debug('[Metadata] Starting ffprobe for', filePath);
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) {
        const errorMsg = err.message || '';

        // Classify the error type based on ffprobe output
        let errorType = ERROR_TYPES.FFMPEG_ERROR;
        let userMessage = 'Failed to read video file';
        if (errorMsg.includes('moov atom not found') || errorMsg.includes('Invalid data found')) {
          errorType = ERROR_TYPES.CORRUPT_VIDEO;
          userMessage = 'Video file is corrupted or incomplete. The file may not have finished uploading/downloading.';
        } else if (errorMsg.includes('No such file') || errorMsg.includes('does not exist')) {
          errorType = ERROR_TYPES.FILE_NOT_FOUND;
          userMessage = 'Video file not found';
        } else if (errorMsg.includes('Permission denied')) {
          errorType = ERROR_TYPES.PERMISSION_DENIED;
          userMessage = 'Permission denied when accessing video file';
        } else if (errorMsg.includes('not a valid')) {
          errorType = ERROR_TYPES.INVALID_FORMAT;
          userMessage = 'Video format not supported';
        }
        console.error('[Metadata] ffprobe error', {
          errorType,
          userMessage,
          rawMessage: err.message,
          code: err.code,
          errno: err.errno,
          path: err.path,
          spawnargs: err.spawnargs
        });
        const error = new Error(errorType);
        error.userMessage = userMessage;
        error.details = errorMsg;
        error.raw = err;
        reject(error);
        return;
      }

      // Find video stream
      const videoStream = data.streams.find(s => s.codec_type === 'video');
      if (!videoStream) {
        console.warn('[Metadata] No video stream detected in ffprobe response');
        const error = new Error(ERROR_TYPES.CORRUPT_VIDEO);
        error.userMessage = 'No video stream found in file';
        reject(error);
        return;
      }
      console.debug('[Metadata] ffprobe raw response snapshot', {
        formatName: data.format?.format_name,
        duration: data.format?.duration,
        size: data.format?.size,
        bitRate: data.format?.bit_rate,
        videoCodec: videoStream.codec_name,
        audioStreamCount: data.streams.filter(s => s.codec_type === 'audio').length
      });
      console.debug('[Metadata] ffprobe succeeded, video stream found', {
        codec: videoStream.codec_name,
        resolution: `${videoStream.width}x${videoStream.height}`,
        duration: data.format.duration
      });
      resolve({
        duration: parseFloat(data.format.duration) || 0,
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        codec: videoStream.codec_name || 'unknown',
        bitrate: parseInt(data.format.bit_rate) || 0
      });
    });
  });
}

/**
 * Generate thumbnail from video at specific timestamp
 * @param {string} filePath - Absolute path to video file
 * @param {string} timestamp - Timestamp (e.g., '00:00:01')
 * @returns {Promise<string>} Base64 encoded thumbnail
 */
async function generateThumbnailAtTime(filePath, timestamp) {
  return new Promise((resolve, reject) => {
    console.debug('[Thumbnail] Attempting screenshot', {
      filePath,
      timestamp
    });
    const tempPath = path.join(os.tmpdir(), `thumb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`);
    ffmpeg(filePath).on('start', cmdLine => {
      console.debug('[Thumbnail] ffmpeg command started', {
        timestamp,
        cmdLine
      });
    }).on('stderr', line => {
      console.debug('[Thumbnail][stderr]', line.trim());
    }).screenshots({
      timestamps: [timestamp],
      filename: path.basename(tempPath),
      folder: path.dirname(tempPath),
      size: '320x180'
    }).on('end', () => {
      try {
        console.debug('[Thumbnail] Screenshot succeeded', {
          tempPath
        });
        // Read file and convert to base64
        const imageBuffer = fs.readFileSync(tempPath);
        const base64 = imageBuffer.toString('base64');

        // Clean up temp file
        fs.unlinkSync(tempPath);
        resolve(`data:image/jpeg;base64,${base64}`);
      } catch (err) {
        console.error('[Thumbnail] Error reading generated image', {
          message: err.message,
          code: err.code,
          errno: err.errno,
          path: err.path
        });
        reject(new Error(ERROR_TYPES.FFMPEG_ERROR));
      }
    }).on('error', err => {
      console.error('[Thumbnail] Generation error', {
        message: err.message,
        code: err.code,
        errno: err.errno,
        path: err.path,
        spawnargs: err.spawnargs
      });
      // Clean up temp file if it exists
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      reject(new Error(ERROR_TYPES.FFMPEG_ERROR));
    });
  });
}

/**
 * Generate thumbnail with fallback timestamps
 * @param {string} filePath - Absolute path to video file
 * @returns {Promise<string>} Base64 encoded thumbnail
 */
async function generateThumbnail(filePath) {
  const timestamps = ['00:00:01', '00:00:00', '00:00:05'];
  for (const timestamp of timestamps) {
    try {
      return await generateThumbnailAtTime(filePath, timestamp);
    } catch (err) {
      console.warn('[Thumbnail] Failed attempt, trying next timestamp', {
        timestamp,
        reason: err.message
      });
      continue;
    }
  }

  // If all timestamps fail, return placeholder
  throw new Error(ERROR_TYPES.FFMPEG_ERROR);
}

/**
 * Get complete metadata for a video file
 * @param {string} filePath - Absolute path to video file
 * @returns {Promise<Object>} Complete metadata including thumbnail
 */
async function getMetadata(filePath) {
  try {
    console.log('[Metadata] ========== Starting metadata extraction ==========');
    console.log('[Metadata] File path:', filePath);

    // Validate file exists
    if (!fs.existsSync(filePath)) {
      console.warn('[Metadata] File not found at path', filePath);
      throw new Error(ERROR_TYPES.FILE_NOT_FOUND);
    }

    // Get file stats for logging
    try {
      const stats = fs.statSync(filePath);
      console.log('[Metadata] File info:', {
        size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
        sizeBytes: stats.size,
        modified: stats.mtime.toISOString(),
        created: stats.birthtime.toISOString(),
        isFile: stats.isFile(),
        extension: path.extname(filePath)
      });
    } catch (err) {
      console.warn('[Metadata] Could not read file stats:', err.message);
    }

    // Check file permissions
    try {
      fs.accessSync(filePath, fs.constants.R_OK);
      console.log('[Metadata] File is readable ✓');
    } catch (err) {
      console.warn('[Metadata] Permission denied when accessing file', {
        filePath,
        err
      });
      throw new Error(ERROR_TYPES.PERMISSION_DENIED);
    }

    // Extract metadata with timeout
    const metadataPromise = extractMetadata(filePath);
    const metadata = await Promise.race([metadataPromise, timeout(30000) // 30 second timeout
    ]);
    console.debug('[Metadata] Core data extracted', metadata);

    // Generate thumbnail with timeout
    const thumbnailPromise = generateThumbnail(filePath);
    const thumbnail = await Promise.race([thumbnailPromise, timeout(30000) // 30 second timeout
    ]);
    console.log('[Metadata] Thumbnail generated successfully ✓');
    console.log('[Metadata] ========== Metadata extraction complete ==========');
    console.log('[Metadata] Final metadata package:', {
      duration: metadata.duration,
      width: metadata.width,
      height: metadata.height,
      codec: metadata.codec,
      hasThumbnail: !!thumbnail
    });
    return {
      ...metadata,
      thumbnail
    };
  } catch (err) {
    console.error('[Metadata] ========== Metadata extraction FAILED ==========');
    console.error('[Metadata] Error details:', {
      type: err.message,
      userMessage: err.userMessage || 'Unknown error',
      hasDetails: !!err.details,
      details: err.details,
      stack: err.stack
    });

    // Re-throw with enhanced error info
    throw err;
  }
}
module.exports = {
  getMetadata
};

/***/ }),

/***/ "./electron/mediaProcessor.js":
/*!************************************!*\
  !*** ./electron/mediaProcessor.js ***!
  \************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const ffmpeg = __webpack_require__(/*! fluent-ffmpeg */ "./node_modules/fluent-ffmpeg/index.js");
const {
  getFfmpegBinaryPath,
  getFfprobeBinaryPath
} = __webpack_require__(/*! ./utils/ffmpegPath */ "./electron/utils/ffmpegPath.js");
const fs = __webpack_require__(/*! fs */ "fs");
const path = __webpack_require__(/*! path */ "path");
const os = __webpack_require__(/*! os */ "os");

// Configure FFmpeg path
ffmpeg.setFfmpegPath(getFfmpegBinaryPath());
ffmpeg.setFfprobePath(getFfprobeBinaryPath());

/**
 * Error mapping for user-friendly messages
 */
const ERROR_MAP = {
  'ENOSPC': 'Not enough disk space',
  'EACCES': 'Permission denied. Check file permissions.',
  'ENOENT': 'Output directory not found',
  'ffmpeg': 'Video processing failed',
  'TIMEOUT': 'Export timed out. Try a shorter video.',
  'INVALID_CLIPS': 'No clips to export',
  'EXPORT_FAILED': 'Export failed'
};

/**
 * Create a timeout promise
 * @param {number} ms - Timeout in milliseconds
 * @returns {Promise} Promise that rejects after timeout
 */
function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), ms));
}

/**
 * Extract trimmed segment from a clip with resolution normalization
 * @param {Object} clip - Clip object with filePath, trimStart, trimEnd
 * @param {string} outputPath - Path for the trimmed segment
 * @param {Object} targetResolution - Target resolution {width, height}
 * @returns {Promise<void>}
 */
async function extractTrimmedSegment(clip, outputPath, targetResolution, onProgress) {
  return new Promise((resolve, reject) => {
    const trimDuration = clip.trimEnd - clip.trimStart;
    let lastProgress = 0;
    console.log(`[Export] Extracting segment: ${clip.fileName} (${clip.trimStart}s - ${clip.trimEnd}s)`);
    ffmpeg(clip.filePath).on('start', cmdLine => {
      console.log('[Export] FFmpeg command:', cmdLine);
    }).on('stderr', line => {
      console.debug('[Export][stderr]', line.trim());
    }).on('progress', progress => {
      const percent = Math.min(Math.round(progress.percent || 0), 100);
      // Only report meaningful progress increases
      if (percent > lastProgress + 2) {
        lastProgress = percent;
        onProgress(percent);
      }
    }).on('end', () => {
      console.log('[Export] Segment extraction complete:', outputPath);
      resolve();
    }).on('error', err => {
      console.error('[Export] Segment extraction failed:', err.message);
      reject(err);
    })
    // Use input seeking for accuracy, then output seeking for precision
    .seekInput(clip.trimStart).setDuration(trimDuration)
    // Video filter: scale + pad + reset PTS to start at 0
    .outputOptions(['-vf', `scale=${targetResolution.width}:${targetResolution.height}:force_original_aspect_ratio=decrease,pad=${targetResolution.width}:${targetResolution.height}:(ow-iw)/2:(oh-ih)/2,setpts=PTS-STARTPTS`])
    // Audio filter: reset PTS to start at 0 and ensure sync
    .outputOptions(['-af', 'asetpts=PTS-STARTPTS'])
    // Video encoding
    .outputOptions(['-c:v', 'libx264', '-preset', 'fast', '-crf', '23'])
    // Audio: use PCM (no encoder delay) to avoid priming/gaps between segments
    .outputOptions(['-c:a', 'pcm_s16le', '-ar', '48000', '-ac', '2'])
    // Force constant frame rate at 30fps
    .outputOptions(['-r', '30', '-vsync', 'cfr'])
    // Generate proper timestamps and fix any A/V sync issues
    .outputOptions(['-fflags', '+genpts', '-async', '1'])
    // Ensure proper stream mapping
    .outputOptions(['-map', '0:v:0', '-map', '0:a:0?']).output(outputPath).run();
  });
}

/**
 * Concatenate segments into final output using filter_complex
 * This approach is more robust than concat demuxer for segments with different properties
 * @param {string[]} segmentPaths - Array of segment file paths
 * @param {string} outputPath - Final output path
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<void>}
 */
async function concatenateSegments(segmentPaths, outputPath, onProgress) {
  return new Promise((resolve, reject) => {
    let lastProgress = 0;

    // Build filter_complex for concatenation
    // Since segments are already normalized, we just concatenate them directly
    const filterComplex = segmentPaths.map((_, index) => `[${index}:v][${index}:a]`).join('') + `concat=n=${segmentPaths.length}:v=1:a=1[vcat][acat]`;
    console.log('[Export] Using filter_complex concatenation');
    console.log('[Export] Filter:', filterComplex);
    console.log('[Export] Segments to concatenate:', segmentPaths.length);
    let ffmpegCmd = ffmpeg();

    // Add all segment inputs
    segmentPaths.forEach(segmentPath => {
      ffmpegCmd = ffmpegCmd.input(segmentPath);
    });
    ffmpegCmd.on('start', cmdLine => {
      console.log('[Export] Concat command:', cmdLine);
      // Report initial progress when concatenation starts
      onProgress(0);
    }).on('stderr', line => {
      console.debug('[Export][concat stderr]', line.trim());
    }).on('progress', progress => {
      const percent = Math.min(Math.round(progress.percent || 0), 100); // Cap at 100%
      // Only report progress if it's a meaningful increase (at least 3%)
      if (percent > lastProgress + 2) {
        lastProgress = percent;
        onProgress(percent);
      }
    }).on('end', () => {
      console.log('[Export] Concatenation complete');
      // Ensure we report 100% completion
      onProgress(100);
      resolve();
    }).on('error', err => {
      console.error('[Export] Concatenation failed:', err.message);
      reject(err);
    }).complexFilter(filterComplex)
    // Map concatenated outputs
    .outputOptions(['-map', '[vcat]', '-map', '[acat]'])
    // Final encode: h264 + AAC (one-time encoding, avoids AAC priming between clips)
    .outputOptions(['-c:v', 'libx264', '-preset', 'fast', '-crf', '23']).outputOptions(['-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2']).outputOptions(['-r', '30'])
    // Ensure proper timing and avoid any PTS issues
    .outputOptions(['-fflags', '+genpts', '-async', '1']).output(outputPath).run();
  });
}

/**
 * Clean up temporary files
 * @param {string[]} tempFiles - Array of temporary file paths
 */
function cleanupTempFiles(tempFiles) {
  tempFiles.forEach(filePath => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('[Export] Cleaned up temp file:', filePath);
      }
    } catch (err) {
      console.warn('[Export] Failed to clean up temp file:', filePath, err.message);
    }
  });
}

/**
 * Export timeline to MP4
 * @param {Array} clips - Array of clip objects
 * @param {string} outputPath - Output file path
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Promise<string>} Output path on success
 */
async function exportTimeline(clips, outputPath, onProgress = () => {}) {
  if (!clips || clips.length === 0) {
    throw new Error('INVALID_CLIPS');
  }
  console.log('[Export] ========== Starting timeline export ==========');
  console.log('[Export] Clips count:', clips.length);
  console.log('[Export] Output path:', outputPath);

  // Sort clips by order
  const sortedClips = [...clips].sort((a, b) => a.order - b.order);
  console.log('[Export] Sorted clips by order:', sortedClips.map(c => ({
    name: c.fileName,
    order: c.order
  })));

  // Determine target resolution (use the highest resolution among all clips)
  const targetResolution = sortedClips.reduce((max, clip) => {
    const clipPixels = clip.width * clip.height;
    const maxPixels = max.width * max.height;
    return clipPixels > maxPixels ? {
      width: clip.width,
      height: clip.height
    } : max;
  }, {
    width: sortedClips[0].width,
    height: sortedClips[0].height
  });
  console.log('[Export] Target resolution:', targetResolution);
  const tempDir = os.tmpdir();
  const tempFiles = [];
  try {
    // Validate output directory is writable
    const outputDir = path.dirname(outputPath);
    try {
      fs.accessSync(outputDir, fs.constants.W_OK);
    } catch (err) {
      throw new Error('EACCES');
    }

    // Step 1: Extract trimmed segments
    console.log('[Export] Step 1: Extracting trimmed segments...');
    onProgress(5);
    const segmentPaths = [];
    for (let i = 0; i < sortedClips.length; i++) {
      const clip = sortedClips[i];
      const segmentPath = path.join(tempDir, `segment_${i}_${Date.now()}.mkv`);
      tempFiles.push(segmentPath);
      console.log(`[Export] Processing clip ${i + 1}/${sortedClips.length}: ${clip.fileName}`);

      // Calculate progress range for this segment
      const segmentStartProgress = 5 + 50 * i / sortedClips.length;
      const segmentEndProgress = 5 + 50 * (i + 1) / sortedClips.length;
      await Promise.race([extractTrimmedSegment(clip, segmentPath, targetResolution, segmentPercent => {
        // Map segment progress to overall progress
        const mappedProgress = segmentStartProgress + segmentPercent * (segmentEndProgress - segmentStartProgress) / 100;
        onProgress(Math.round(mappedProgress));
      }), timeout(60000) // 60 second timeout per segment
      ]);
      segmentPaths.push(segmentPath);

      // Ensure we reach the end of this segment's progress range
      onProgress(Math.round(segmentEndProgress));
    }

    // Step 2: Concatenate segments using filter_complex
    console.log('[Export] Step 2: Concatenating segments...');
    onProgress(55);
    await Promise.race([concatenateSegments(segmentPaths, outputPath, percent => {
      // Map 0-100% to 55-90% (35% range for better granularity)
      const mappedProgress = Math.min(55 + percent * 0.35, 90);
      onProgress(Math.round(mappedProgress));
    }), timeout(300000) // 5 minute timeout for concatenation
    ]);

    // Step 3: Finalization
    console.log('[Export] Step 3: Finalizing export...');
    onProgress(90);

    // Simulate finalization work with a small delay
    await new Promise(resolve => setTimeout(resolve, 500));
    onProgress(100);
    console.log('[Export] ========== Export completed successfully ==========');
    console.log('[Export] Final output:', outputPath);
    return outputPath;
  } catch (err) {
    console.error('[Export] ========== Export FAILED ==========');
    console.error('[Export] Error:', err.message);

    // Clean up temp files
    cleanupTempFiles(tempFiles);

    // Map error to user-friendly message
    const errorCode = err.message || 'EXPORT_FAILED';
    const userMessage = ERROR_MAP[errorCode] || ERROR_MAP['EXPORT_FAILED'];
    const exportError = new Error(errorCode);
    exportError.userMessage = userMessage;
    throw exportError;
  } finally {
    // Always clean up temp files
    cleanupTempFiles(tempFiles);
  }
}
module.exports = {
  exportTimeline
};

/***/ }),

/***/ "./electron/utils/ffmpegPath.js":
/*!**************************************!*\
  !*** ./electron/utils/ffmpegPath.js ***!
  \**************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const path = __webpack_require__(/*! path */ "path");
const arch = process.arch;
const fs = __webpack_require__(/*! fs */ "fs");
let isPackaged = false;
try {
  // app.isPackaged is the most reliable signal
  const {
    app
  } = __webpack_require__(/*! electron */ "electron");
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
  getFFprobePath: getFfprobeBinaryPath
};

/***/ }),

/***/ "./node_modules/async/lib/async.js":
/*!*****************************************!*\
  !*** ./node_modules/async/lib/async.js ***!
  \*****************************************/
/***/ ((module) => {

/*global setImmediate: false, setTimeout: false, console: false */
(function () {

    var async = {};

    // global on the server, window in the browser
    var root, previous_async;

    root = this;
    if (root != null) {
      previous_async = root.async;
    }

    async.noConflict = function () {
        root.async = previous_async;
        return async;
    };

    function only_once(fn) {
        var called = false;
        return function() {
            if (called) throw new Error("Callback was already called.");
            called = true;
            fn.apply(root, arguments);
        }
    }

    //// cross-browser compatiblity functions ////

    var _each = function (arr, iterator) {
        if (arr.forEach) {
            return arr.forEach(iterator);
        }
        for (var i = 0; i < arr.length; i += 1) {
            iterator(arr[i], i, arr);
        }
    };

    var _map = function (arr, iterator) {
        if (arr.map) {
            return arr.map(iterator);
        }
        var results = [];
        _each(arr, function (x, i, a) {
            results.push(iterator(x, i, a));
        });
        return results;
    };

    var _reduce = function (arr, iterator, memo) {
        if (arr.reduce) {
            return arr.reduce(iterator, memo);
        }
        _each(arr, function (x, i, a) {
            memo = iterator(memo, x, i, a);
        });
        return memo;
    };

    var _keys = function (obj) {
        if (Object.keys) {
            return Object.keys(obj);
        }
        var keys = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                keys.push(k);
            }
        }
        return keys;
    };

    //// exported async module functions ////

    //// nextTick implementation with browser-compatible fallback ////
    if (typeof process === 'undefined' || !(process.nextTick)) {
        if (typeof setImmediate === 'function') {
            async.nextTick = function (fn) {
                // not a direct alias for IE10 compatibility
                setImmediate(fn);
            };
            async.setImmediate = async.nextTick;
        }
        else {
            async.nextTick = function (fn) {
                setTimeout(fn, 0);
            };
            async.setImmediate = async.nextTick;
        }
    }
    else {
        async.nextTick = process.nextTick;
        if (typeof setImmediate !== 'undefined') {
            async.setImmediate = function (fn) {
              // not a direct alias for IE10 compatibility
              setImmediate(fn);
            };
        }
        else {
            async.setImmediate = async.nextTick;
        }
    }

    async.each = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        _each(arr, function (x) {
            iterator(x, only_once(function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed >= arr.length) {
                        callback(null);
                    }
                }
            }));
        });
    };
    async.forEach = async.each;

    async.eachSeries = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        var iterate = function () {
            iterator(arr[completed], function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed >= arr.length) {
                        callback(null);
                    }
                    else {
                        iterate();
                    }
                }
            });
        };
        iterate();
    };
    async.forEachSeries = async.eachSeries;

    async.eachLimit = function (arr, limit, iterator, callback) {
        var fn = _eachLimit(limit);
        fn.apply(null, [arr, iterator, callback]);
    };
    async.forEachLimit = async.eachLimit;

    var _eachLimit = function (limit) {

        return function (arr, iterator, callback) {
            callback = callback || function () {};
            if (!arr.length || limit <= 0) {
                return callback();
            }
            var completed = 0;
            var started = 0;
            var running = 0;

            (function replenish () {
                if (completed >= arr.length) {
                    return callback();
                }

                while (running < limit && started < arr.length) {
                    started += 1;
                    running += 1;
                    iterator(arr[started - 1], function (err) {
                        if (err) {
                            callback(err);
                            callback = function () {};
                        }
                        else {
                            completed += 1;
                            running -= 1;
                            if (completed >= arr.length) {
                                callback();
                            }
                            else {
                                replenish();
                            }
                        }
                    });
                }
            })();
        };
    };


    var doParallel = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.each].concat(args));
        };
    };
    var doParallelLimit = function(limit, fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [_eachLimit(limit)].concat(args));
        };
    };
    var doSeries = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.eachSeries].concat(args));
        };
    };


    var _asyncMap = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (err, v) {
                results[x.index] = v;
                callback(err);
            });
        }, function (err) {
            callback(err, results);
        });
    };
    async.map = doParallel(_asyncMap);
    async.mapSeries = doSeries(_asyncMap);
    async.mapLimit = function (arr, limit, iterator, callback) {
        return _mapLimit(limit)(arr, iterator, callback);
    };

    var _mapLimit = function(limit) {
        return doParallelLimit(limit, _asyncMap);
    };

    // reduce only has a series version, as doing reduce in parallel won't
    // work in many situations.
    async.reduce = function (arr, memo, iterator, callback) {
        async.eachSeries(arr, function (x, callback) {
            iterator(memo, x, function (err, v) {
                memo = v;
                callback(err);
            });
        }, function (err) {
            callback(err, memo);
        });
    };
    // inject alias
    async.inject = async.reduce;
    // foldl alias
    async.foldl = async.reduce;

    async.reduceRight = function (arr, memo, iterator, callback) {
        var reversed = _map(arr, function (x) {
            return x;
        }).reverse();
        async.reduce(reversed, memo, iterator, callback);
    };
    // foldr alias
    async.foldr = async.reduceRight;

    var _filter = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.filter = doParallel(_filter);
    async.filterSeries = doSeries(_filter);
    // select alias
    async.select = async.filter;
    async.selectSeries = async.filterSeries;

    var _reject = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (!v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.reject = doParallel(_reject);
    async.rejectSeries = doSeries(_reject);

    var _detect = function (eachfn, arr, iterator, main_callback) {
        eachfn(arr, function (x, callback) {
            iterator(x, function (result) {
                if (result) {
                    main_callback(x);
                    main_callback = function () {};
                }
                else {
                    callback();
                }
            });
        }, function (err) {
            main_callback();
        });
    };
    async.detect = doParallel(_detect);
    async.detectSeries = doSeries(_detect);

    async.some = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (v) {
                    main_callback(true);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(false);
        });
    };
    // any alias
    async.any = async.some;

    async.every = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (!v) {
                    main_callback(false);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(true);
        });
    };
    // all alias
    async.all = async.every;

    async.sortBy = function (arr, iterator, callback) {
        async.map(arr, function (x, callback) {
            iterator(x, function (err, criteria) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, {value: x, criteria: criteria});
                }
            });
        }, function (err, results) {
            if (err) {
                return callback(err);
            }
            else {
                var fn = function (left, right) {
                    var a = left.criteria, b = right.criteria;
                    return a < b ? -1 : a > b ? 1 : 0;
                };
                callback(null, _map(results.sort(fn), function (x) {
                    return x.value;
                }));
            }
        });
    };

    async.auto = function (tasks, callback) {
        callback = callback || function () {};
        var keys = _keys(tasks);
        if (!keys.length) {
            return callback(null);
        }

        var results = {};

        var listeners = [];
        var addListener = function (fn) {
            listeners.unshift(fn);
        };
        var removeListener = function (fn) {
            for (var i = 0; i < listeners.length; i += 1) {
                if (listeners[i] === fn) {
                    listeners.splice(i, 1);
                    return;
                }
            }
        };
        var taskComplete = function () {
            _each(listeners.slice(0), function (fn) {
                fn();
            });
        };

        addListener(function () {
            if (_keys(results).length === keys.length) {
                callback(null, results);
                callback = function () {};
            }
        });

        _each(keys, function (k) {
            var task = (tasks[k] instanceof Function) ? [tasks[k]]: tasks[k];
            var taskCallback = function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (args.length <= 1) {
                    args = args[0];
                }
                if (err) {
                    var safeResults = {};
                    _each(_keys(results), function(rkey) {
                        safeResults[rkey] = results[rkey];
                    });
                    safeResults[k] = args;
                    callback(err, safeResults);
                    // stop subsequent errors hitting callback multiple times
                    callback = function () {};
                }
                else {
                    results[k] = args;
                    async.setImmediate(taskComplete);
                }
            };
            var requires = task.slice(0, Math.abs(task.length - 1)) || [];
            var ready = function () {
                return _reduce(requires, function (a, x) {
                    return (a && results.hasOwnProperty(x));
                }, true) && !results.hasOwnProperty(k);
            };
            if (ready()) {
                task[task.length - 1](taskCallback, results);
            }
            else {
                var listener = function () {
                    if (ready()) {
                        removeListener(listener);
                        task[task.length - 1](taskCallback, results);
                    }
                };
                addListener(listener);
            }
        });
    };

    async.waterfall = function (tasks, callback) {
        callback = callback || function () {};
        if (tasks.constructor !== Array) {
          var err = new Error('First argument to waterfall must be an array of functions');
          return callback(err);
        }
        if (!tasks.length) {
            return callback();
        }
        var wrapIterator = function (iterator) {
            return function (err) {
                if (err) {
                    callback.apply(null, arguments);
                    callback = function () {};
                }
                else {
                    var args = Array.prototype.slice.call(arguments, 1);
                    var next = iterator.next();
                    if (next) {
                        args.push(wrapIterator(next));
                    }
                    else {
                        args.push(callback);
                    }
                    async.setImmediate(function () {
                        iterator.apply(null, args);
                    });
                }
            };
        };
        wrapIterator(async.iterator(tasks))();
    };

    var _parallel = function(eachfn, tasks, callback) {
        callback = callback || function () {};
        if (tasks.constructor === Array) {
            eachfn.map(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            eachfn.each(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.parallel = function (tasks, callback) {
        _parallel({ map: async.map, each: async.each }, tasks, callback);
    };

    async.parallelLimit = function(tasks, limit, callback) {
        _parallel({ map: _mapLimit(limit), each: _eachLimit(limit) }, tasks, callback);
    };

    async.series = function (tasks, callback) {
        callback = callback || function () {};
        if (tasks.constructor === Array) {
            async.mapSeries(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            async.eachSeries(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.iterator = function (tasks) {
        var makeCallback = function (index) {
            var fn = function () {
                if (tasks.length) {
                    tasks[index].apply(null, arguments);
                }
                return fn.next();
            };
            fn.next = function () {
                return (index < tasks.length - 1) ? makeCallback(index + 1): null;
            };
            return fn;
        };
        return makeCallback(0);
    };

    async.apply = function (fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        return function () {
            return fn.apply(
                null, args.concat(Array.prototype.slice.call(arguments))
            );
        };
    };

    var _concat = function (eachfn, arr, fn, callback) {
        var r = [];
        eachfn(arr, function (x, cb) {
            fn(x, function (err, y) {
                r = r.concat(y || []);
                cb(err);
            });
        }, function (err) {
            callback(err, r);
        });
    };
    async.concat = doParallel(_concat);
    async.concatSeries = doSeries(_concat);

    async.whilst = function (test, iterator, callback) {
        if (test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.whilst(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doWhilst = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            if (test()) {
                async.doWhilst(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.until = function (test, iterator, callback) {
        if (!test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.until(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doUntil = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            if (!test()) {
                async.doUntil(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.queue = function (worker, concurrency) {
        if (concurrency === undefined) {
            concurrency = 1;
        }
        function _insert(q, data, pos, callback) {
          if(data.constructor !== Array) {
              data = [data];
          }
          _each(data, function(task) {
              var item = {
                  data: task,
                  callback: typeof callback === 'function' ? callback : null
              };

              if (pos) {
                q.tasks.unshift(item);
              } else {
                q.tasks.push(item);
              }

              if (q.saturated && q.tasks.length === concurrency) {
                  q.saturated();
              }
              async.setImmediate(q.process);
          });
        }

        var workers = 0;
        var q = {
            tasks: [],
            concurrency: concurrency,
            saturated: null,
            empty: null,
            drain: null,
            push: function (data, callback) {
              _insert(q, data, false, callback);
            },
            unshift: function (data, callback) {
              _insert(q, data, true, callback);
            },
            process: function () {
                if (workers < q.concurrency && q.tasks.length) {
                    var task = q.tasks.shift();
                    if (q.empty && q.tasks.length === 0) {
                        q.empty();
                    }
                    workers += 1;
                    var next = function () {
                        workers -= 1;
                        if (task.callback) {
                            task.callback.apply(task, arguments);
                        }
                        if (q.drain && q.tasks.length + workers === 0) {
                            q.drain();
                        }
                        q.process();
                    };
                    var cb = only_once(next);
                    worker(task.data, cb);
                }
            },
            length: function () {
                return q.tasks.length;
            },
            running: function () {
                return workers;
            }
        };
        return q;
    };

    async.cargo = function (worker, payload) {
        var working     = false,
            tasks       = [];

        var cargo = {
            tasks: tasks,
            payload: payload,
            saturated: null,
            empty: null,
            drain: null,
            push: function (data, callback) {
                if(data.constructor !== Array) {
                    data = [data];
                }
                _each(data, function(task) {
                    tasks.push({
                        data: task,
                        callback: typeof callback === 'function' ? callback : null
                    });
                    if (cargo.saturated && tasks.length === payload) {
                        cargo.saturated();
                    }
                });
                async.setImmediate(cargo.process);
            },
            process: function process() {
                if (working) return;
                if (tasks.length === 0) {
                    if(cargo.drain) cargo.drain();
                    return;
                }

                var ts = typeof payload === 'number'
                            ? tasks.splice(0, payload)
                            : tasks.splice(0);

                var ds = _map(ts, function (task) {
                    return task.data;
                });

                if(cargo.empty) cargo.empty();
                working = true;
                worker(ds, function () {
                    working = false;

                    var args = arguments;
                    _each(ts, function (data) {
                        if (data.callback) {
                            data.callback.apply(null, args);
                        }
                    });

                    process();
                });
            },
            length: function () {
                return tasks.length;
            },
            running: function () {
                return working;
            }
        };
        return cargo;
    };

    var _console_fn = function (name) {
        return function (fn) {
            var args = Array.prototype.slice.call(arguments, 1);
            fn.apply(null, args.concat([function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (typeof console !== 'undefined') {
                    if (err) {
                        if (console.error) {
                            console.error(err);
                        }
                    }
                    else if (console[name]) {
                        _each(args, function (x) {
                            console[name](x);
                        });
                    }
                }
            }]));
        };
    };
    async.log = _console_fn('log');
    async.dir = _console_fn('dir');
    /*async.info = _console_fn('info');
    async.warn = _console_fn('warn');
    async.error = _console_fn('error');*/

    async.memoize = function (fn, hasher) {
        var memo = {};
        var queues = {};
        hasher = hasher || function (x) {
            return x;
        };
        var memoized = function () {
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            var key = hasher.apply(null, args);
            if (key in memo) {
                callback.apply(null, memo[key]);
            }
            else if (key in queues) {
                queues[key].push(callback);
            }
            else {
                queues[key] = [callback];
                fn.apply(null, args.concat([function () {
                    memo[key] = arguments;
                    var q = queues[key];
                    delete queues[key];
                    for (var i = 0, l = q.length; i < l; i++) {
                      q[i].apply(null, arguments);
                    }
                }]));
            }
        };
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
    };

    async.unmemoize = function (fn) {
      return function () {
        return (fn.unmemoized || fn).apply(null, arguments);
      };
    };

    async.times = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.map(counter, iterator, callback);
    };

    async.timesSeries = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.mapSeries(counter, iterator, callback);
    };

    async.compose = function (/* functions... */) {
        var fns = Array.prototype.reverse.call(arguments);
        return function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            async.reduce(fns, args, function (newargs, fn, cb) {
                fn.apply(that, newargs.concat([function () {
                    var err = arguments[0];
                    var nextargs = Array.prototype.slice.call(arguments, 1);
                    cb(err, nextargs);
                }]))
            },
            function (err, results) {
                callback.apply(that, [err].concat(results));
            });
        };
    };

    var _applyEach = function (eachfn, fns /*args...*/) {
        var go = function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            return eachfn(fns, function (fn, cb) {
                fn.apply(that, args.concat([cb]));
            },
            callback);
        };
        if (arguments.length > 2) {
            var args = Array.prototype.slice.call(arguments, 2);
            return go.apply(this, args);
        }
        else {
            return go;
        }
    };
    async.applyEach = doParallel(_applyEach);
    async.applyEachSeries = doSeries(_applyEach);

    async.forever = function (fn, callback) {
        function next(err) {
            if (err) {
                if (callback) {
                    return callback(err);
                }
                throw err;
            }
            fn(next);
        }
        next();
    };

    // AMD / RequireJS
    if (typeof define !== 'undefined' && define.amd) {
        define([], function () {
            return async;
        });
    }
    // Node.js
    else if ( true && module.exports) {
        module.exports = async;
    }
    // included directly via <script> tag
    else {
        root.async = async;
    }

}());


/***/ }),

/***/ "./node_modules/electron-squirrel-startup/index.js":
/*!*********************************************************!*\
  !*** ./node_modules/electron-squirrel-startup/index.js ***!
  \*********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var path = __webpack_require__(/*! path */ "path");
var spawn = (__webpack_require__(/*! child_process */ "child_process").spawn);
var debug = __webpack_require__(/*! debug */ "./node_modules/electron-squirrel-startup/node_modules/debug/src/index.js")('electron-squirrel-startup');
var app = (__webpack_require__(/*! electron */ "electron").app);

var run = function(args, done) {
  var updateExe = path.resolve(path.dirname(process.execPath), '..', 'Update.exe');
  debug('Spawning `%s` with args `%s`', updateExe, args);
  spawn(updateExe, args, {
    detached: true
  }).on('close', done);
};

var check = function() {
  if (process.platform === 'win32') {
    var cmd = process.argv[1];
    debug('processing squirrel command `%s`', cmd);
    var target = path.basename(process.execPath);

    if (cmd === '--squirrel-install' || cmd === '--squirrel-updated') {
      run(['--createShortcut=' + target + ''], app.quit);
      return true;
    }
    if (cmd === '--squirrel-uninstall') {
      run(['--removeShortcut=' + target + ''], app.quit);
      return true;
    }
    if (cmd === '--squirrel-obsolete') {
      app.quit();
      return true;
    }
  }
  return false;
};

module.exports = check();


/***/ }),

/***/ "./node_modules/electron-squirrel-startup/node_modules/debug/src/browser.js":
/*!**********************************************************************************!*\
  !*** ./node_modules/electron-squirrel-startup/node_modules/debug/src/browser.js ***!
  \**********************************************************************************/
/***/ ((module, exports, __webpack_require__) => {

/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = __webpack_require__(/*! ./debug */ "./node_modules/electron-squirrel-startup/node_modules/debug/src/debug.js");
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = 'undefined' != typeof chrome
               && 'undefined' != typeof chrome.storage
                  ? chrome.storage.local
                  : localstorage();

/**
 * Colors.
 */

exports.colors = [
  'lightseagreen',
  'forestgreen',
  'goldenrod',
  'dodgerblue',
  'darkorchid',
  'crimson'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // NB: In an Electron preload script, document will be defined but not fully
  // initialized. Since we know we're in Chrome, we'll just detect this case
  // explicitly
  if (typeof window !== 'undefined' && window.process && window.process.type === 'renderer') {
    return true;
  }

  // is webkit? http://stackoverflow.com/a/16459606/376773
  // document is undefined in react-native: https://github.com/facebook/react-native/pull/1632
  return (typeof document !== 'undefined' && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (typeof window !== 'undefined' && window.console && (window.console.firebug || (window.console.exception && window.console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31) ||
    // double check webkit in userAgent just in case we are in a worker
    (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/));
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  try {
    return JSON.stringify(v);
  } catch (err) {
    return '[UnexpectedJSONParseError]: ' + err.message;
  }
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs(args) {
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return;

  var c = 'color: ' + this.color;
  args.splice(1, 0, c, 'color: inherit')

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-zA-Z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return 'object' === typeof console
    && console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      exports.storage.removeItem('debug');
    } else {
      exports.storage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = exports.storage.debug;
  } catch(e) {}

  // If debug isn't set in LS, and we're in Electron, try to load $DEBUG
  if (!r && typeof process !== 'undefined' && 'env' in process) {
    r = process.env.DEBUG;
  }

  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage() {
  try {
    return window.localStorage;
  } catch (e) {}
}


/***/ }),

/***/ "./node_modules/electron-squirrel-startup/node_modules/debug/src/debug.js":
/*!********************************************************************************!*\
  !*** ./node_modules/electron-squirrel-startup/node_modules/debug/src/debug.js ***!
  \********************************************************************************/
/***/ ((module, exports, __webpack_require__) => {


/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = createDebug.debug = createDebug['default'] = createDebug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = __webpack_require__(/*! ms */ "./node_modules/electron-squirrel-startup/node_modules/ms/index.js");

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
 */

exports.formatters = {};

/**
 * Previous log timestamp.
 */

var prevTime;

/**
 * Select a color.
 * @param {String} namespace
 * @return {Number}
 * @api private
 */

function selectColor(namespace) {
  var hash = 0, i;

  for (i in namespace) {
    hash  = ((hash << 5) - hash) + namespace.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  return exports.colors[Math.abs(hash) % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function createDebug(namespace) {

  function debug() {
    // disabled?
    if (!debug.enabled) return;

    var self = debug;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // turn the `arguments` into a proper Array
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %O
      args.unshift('%O');
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-zA-Z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    // apply env-specific formatting (colors, etc.)
    exports.formatArgs.call(self, args);

    var logFn = debug.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }

  debug.namespace = namespace;
  debug.enabled = exports.enabled(namespace);
  debug.useColors = exports.useColors();
  debug.color = selectColor(namespace);

  // env-specific initialization logic for debug instances
  if ('function' === typeof exports.init) {
    exports.init(debug);
  }

  return debug;
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  exports.names = [];
  exports.skips = [];

  var split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/);
  var len = split.length;

  for (var i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}


/***/ }),

/***/ "./node_modules/electron-squirrel-startup/node_modules/debug/src/index.js":
/*!********************************************************************************!*\
  !*** ./node_modules/electron-squirrel-startup/node_modules/debug/src/index.js ***!
  \********************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/**
 * Detect Electron renderer process, which is node, but we should
 * treat as a browser.
 */

if (typeof process !== 'undefined' && process.type === 'renderer') {
  module.exports = __webpack_require__(/*! ./browser.js */ "./node_modules/electron-squirrel-startup/node_modules/debug/src/browser.js");
} else {
  module.exports = __webpack_require__(/*! ./node.js */ "./node_modules/electron-squirrel-startup/node_modules/debug/src/node.js");
}


/***/ }),

/***/ "./node_modules/electron-squirrel-startup/node_modules/debug/src/node.js":
/*!*******************************************************************************!*\
  !*** ./node_modules/electron-squirrel-startup/node_modules/debug/src/node.js ***!
  \*******************************************************************************/
/***/ ((module, exports, __webpack_require__) => {

/**
 * Module dependencies.
 */

var tty = __webpack_require__(/*! tty */ "tty");
var util = __webpack_require__(/*! util */ "util");

/**
 * This is the Node.js implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = __webpack_require__(/*! ./debug */ "./node_modules/electron-squirrel-startup/node_modules/debug/src/debug.js");
exports.init = init;
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;

/**
 * Colors.
 */

exports.colors = [6, 2, 3, 4, 5, 1];

/**
 * Build up the default `inspectOpts` object from the environment variables.
 *
 *   $ DEBUG_COLORS=no DEBUG_DEPTH=10 DEBUG_SHOW_HIDDEN=enabled node script.js
 */

exports.inspectOpts = Object.keys(process.env).filter(function (key) {
  return /^debug_/i.test(key);
}).reduce(function (obj, key) {
  // camel-case
  var prop = key
    .substring(6)
    .toLowerCase()
    .replace(/_([a-z])/g, function (_, k) { return k.toUpperCase() });

  // coerce string value into JS value
  var val = process.env[key];
  if (/^(yes|on|true|enabled)$/i.test(val)) val = true;
  else if (/^(no|off|false|disabled)$/i.test(val)) val = false;
  else if (val === 'null') val = null;
  else val = Number(val);

  obj[prop] = val;
  return obj;
}, {});

/**
 * The file descriptor to write the `debug()` calls to.
 * Set the `DEBUG_FD` env variable to override with another value. i.e.:
 *
 *   $ DEBUG_FD=3 node script.js 3>debug.log
 */

var fd = parseInt(process.env.DEBUG_FD, 10) || 2;

if (1 !== fd && 2 !== fd) {
  util.deprecate(function(){}, 'except for stderr(2) and stdout(1), any other usage of DEBUG_FD is deprecated. Override debug.log if you want to use a different log function (https://git.io/debug_fd)')()
}

var stream = 1 === fd ? process.stdout :
             2 === fd ? process.stderr :
             createWritableStdioStream(fd);

/**
 * Is stdout a TTY? Colored output is enabled when `true`.
 */

function useColors() {
  return 'colors' in exports.inspectOpts
    ? Boolean(exports.inspectOpts.colors)
    : tty.isatty(fd);
}

/**
 * Map %o to `util.inspect()`, all on a single line.
 */

exports.formatters.o = function(v) {
  this.inspectOpts.colors = this.useColors;
  return util.inspect(v, this.inspectOpts)
    .split('\n').map(function(str) {
      return str.trim()
    }).join(' ');
};

/**
 * Map %o to `util.inspect()`, allowing multiple lines if needed.
 */

exports.formatters.O = function(v) {
  this.inspectOpts.colors = this.useColors;
  return util.inspect(v, this.inspectOpts);
};

/**
 * Adds ANSI color escape codes if enabled.
 *
 * @api public
 */

function formatArgs(args) {
  var name = this.namespace;
  var useColors = this.useColors;

  if (useColors) {
    var c = this.color;
    var prefix = '  \u001b[3' + c + ';1m' + name + ' ' + '\u001b[0m';

    args[0] = prefix + args[0].split('\n').join('\n' + prefix);
    args.push('\u001b[3' + c + 'm+' + exports.humanize(this.diff) + '\u001b[0m');
  } else {
    args[0] = new Date().toUTCString()
      + ' ' + name + ' ' + args[0];
  }
}

/**
 * Invokes `util.format()` with the specified arguments and writes to `stream`.
 */

function log() {
  return stream.write(util.format.apply(util, arguments) + '\n');
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  if (null == namespaces) {
    // If you set a process.env field to null or undefined, it gets cast to the
    // string 'null' or 'undefined'. Just delete instead.
    delete process.env.DEBUG;
  } else {
    process.env.DEBUG = namespaces;
  }
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  return process.env.DEBUG;
}

/**
 * Copied from `node/src/node.js`.
 *
 * XXX: It's lame that node doesn't expose this API out-of-the-box. It also
 * relies on the undocumented `tty_wrap.guessHandleType()` which is also lame.
 */

function createWritableStdioStream (fd) {
  var stream;
  var tty_wrap = process.binding('tty_wrap');

  // Note stream._type is used for test-module-load-list.js

  switch (tty_wrap.guessHandleType(fd)) {
    case 'TTY':
      stream = new tty.WriteStream(fd);
      stream._type = 'tty';

      // Hack to have stream not keep the event loop alive.
      // See https://github.com/joyent/node/issues/1726
      if (stream._handle && stream._handle.unref) {
        stream._handle.unref();
      }
      break;

    case 'FILE':
      var fs = __webpack_require__(/*! fs */ "fs");
      stream = new fs.SyncWriteStream(fd, { autoClose: false });
      stream._type = 'fs';
      break;

    case 'PIPE':
    case 'TCP':
      var net = __webpack_require__(/*! net */ "net");
      stream = new net.Socket({
        fd: fd,
        readable: false,
        writable: true
      });

      // FIXME Should probably have an option in net.Socket to create a
      // stream from an existing fd which is writable only. But for now
      // we'll just add this hack and set the `readable` member to false.
      // Test: ./node test/fixtures/echo.js < /etc/passwd
      stream.readable = false;
      stream.read = null;
      stream._type = 'pipe';

      // FIXME Hack to have stream not keep the event loop alive.
      // See https://github.com/joyent/node/issues/1726
      if (stream._handle && stream._handle.unref) {
        stream._handle.unref();
      }
      break;

    default:
      // Probably an error on in uv_guess_handle()
      throw new Error('Implement me. Unknown stream file type!');
  }

  // For supporting legacy API we put the FD here.
  stream.fd = fd;

  stream._isStdio = true;

  return stream;
}

/**
 * Init logic for `debug` instances.
 *
 * Create a new `inspectOpts` object in case `useColors` is set
 * differently for a particular `debug` instance.
 */

function init (debug) {
  debug.inspectOpts = {};

  var keys = Object.keys(exports.inspectOpts);
  for (var i = 0; i < keys.length; i++) {
    debug.inspectOpts[keys[i]] = exports.inspectOpts[keys[i]];
  }
}

/**
 * Enable namespaces listed in `process.env.DEBUG` initially.
 */

exports.enable(load());


/***/ }),

/***/ "./node_modules/electron-squirrel-startup/node_modules/ms/index.js":
/*!*************************************************************************!*\
  !*** ./node_modules/electron-squirrel-startup/node_modules/ms/index.js ***!
  \*************************************************************************/
/***/ ((module) => {

/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} [options]
 * @throws {Error} throw an error if val is not a non-empty string or a number
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options) {
  options = options || {};
  var type = typeof val;
  if (type === 'string' && val.length > 0) {
    return parse(val);
  } else if (type === 'number' && isNaN(val) === false) {
    return options.long ? fmtLong(val) : fmtShort(val);
  }
  throw new Error(
    'val is not a non-empty string or a valid number. val=' +
      JSON.stringify(val)
  );
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = String(str);
  if (str.length > 100) {
    return;
  }
  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(
    str
  );
  if (!match) {
    return;
  }
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
    default:
      return undefined;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtShort(ms) {
  if (ms >= d) {
    return Math.round(ms / d) + 'd';
  }
  if (ms >= h) {
    return Math.round(ms / h) + 'h';
  }
  if (ms >= m) {
    return Math.round(ms / m) + 'm';
  }
  if (ms >= s) {
    return Math.round(ms / s) + 's';
  }
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtLong(ms) {
  return plural(ms, d, 'day') ||
    plural(ms, h, 'hour') ||
    plural(ms, m, 'minute') ||
    plural(ms, s, 'second') ||
    ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) {
    return;
  }
  if (ms < n * 1.5) {
    return Math.floor(ms / n) + ' ' + name;
  }
  return Math.ceil(ms / n) + ' ' + name + 's';
}


/***/ }),

/***/ "./node_modules/fluent-ffmpeg/index.js":
/*!*********************************************!*\
  !*** ./node_modules/fluent-ffmpeg/index.js ***!
  \*********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = __webpack_require__(/*! ./lib/fluent-ffmpeg */ "./node_modules/fluent-ffmpeg/lib/fluent-ffmpeg.js");


/***/ }),

/***/ "./node_modules/fluent-ffmpeg/lib/capabilities.js":
/*!********************************************************!*\
  !*** ./node_modules/fluent-ffmpeg/lib/capabilities.js ***!
  \********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
/*jshint node:true*/


var fs = __webpack_require__(/*! fs */ "fs");
var path = __webpack_require__(/*! path */ "path");
var async = __webpack_require__(/*! async */ "./node_modules/async/lib/async.js");
var utils = __webpack_require__(/*! ./utils */ "./node_modules/fluent-ffmpeg/lib/utils.js");

/*
 *! Capability helpers
 */

var avCodecRegexp = /^\s*([D ])([E ])([VAS])([S ])([D ])([T ]) ([^ ]+) +(.*)$/;
var ffCodecRegexp = /^\s*([D\.])([E\.])([VAS])([I\.])([L\.])([S\.]) ([^ ]+) +(.*)$/;
var ffEncodersRegexp = /\(encoders:([^\)]+)\)/;
var ffDecodersRegexp = /\(decoders:([^\)]+)\)/;
var encodersRegexp = /^\s*([VAS\.])([F\.])([S\.])([X\.])([B\.])([D\.]) ([^ ]+) +(.*)$/;
var formatRegexp = /^\s*([D ])([E ])\s+([^ ]+)\s+(.*)$/;
var lineBreakRegexp = /\r\n|\r|\n/;
var filterRegexp = /^(?: [T\.][S\.][C\.] )?([^ ]+) +(AA?|VV?|\|)->(AA?|VV?|\|) +(.*)$/;

var cache = {};

module.exports = function(proto) {
  /**
   * Manually define the ffmpeg binary full path.
   *
   * @method FfmpegCommand#setFfmpegPath
   *
   * @param {String} ffmpegPath The full path to the ffmpeg binary.
   * @return FfmpegCommand
   */
  proto.setFfmpegPath = function(ffmpegPath) {
    cache.ffmpegPath = ffmpegPath;
    return this;
  };

  /**
   * Manually define the ffprobe binary full path.
   *
   * @method FfmpegCommand#setFfprobePath
   *
   * @param {String} ffprobePath The full path to the ffprobe binary.
   * @return FfmpegCommand
   */
  proto.setFfprobePath = function(ffprobePath) {
    cache.ffprobePath = ffprobePath;
    return this;
  };

  /**
   * Manually define the flvtool2/flvmeta binary full path.
   *
   * @method FfmpegCommand#setFlvtoolPath
   *
   * @param {String} flvtool The full path to the flvtool2 or flvmeta binary.
   * @return FfmpegCommand
   */
  proto.setFlvtoolPath = function(flvtool) {
    cache.flvtoolPath = flvtool;
    return this;
  };

  /**
   * Forget executable paths
   *
   * (only used for testing purposes)
   *
   * @method FfmpegCommand#_forgetPaths
   * @private
   */
  proto._forgetPaths = function() {
    delete cache.ffmpegPath;
    delete cache.ffprobePath;
    delete cache.flvtoolPath;
  };

  /**
   * Check for ffmpeg availability
   *
   * If the FFMPEG_PATH environment variable is set, try to use it.
   * If it is unset or incorrect, try to find ffmpeg in the PATH instead.
   *
   * @method FfmpegCommand#_getFfmpegPath
   * @param {Function} callback callback with signature (err, path)
   * @private
   */
  proto._getFfmpegPath = function(callback) {
    if ('ffmpegPath' in cache) {
      return callback(null, cache.ffmpegPath);
    }

    async.waterfall([
      // Try FFMPEG_PATH
      function(cb) {
        if (process.env.FFMPEG_PATH) {
          fs.exists(process.env.FFMPEG_PATH, function(exists) {
            if (exists) {
              cb(null, process.env.FFMPEG_PATH);
            } else {
              cb(null, '');
            }
          });
        } else {
          cb(null, '');
        }
      },

      // Search in the PATH
      function(ffmpeg, cb) {
        if (ffmpeg.length) {
          return cb(null, ffmpeg);
        }

        utils.which('ffmpeg', function(err, ffmpeg) {
          cb(err, ffmpeg);
        });
      }
    ], function(err, ffmpeg) {
      if (err) {
        callback(err);
      } else {
        callback(null, cache.ffmpegPath = (ffmpeg || ''));
      }
    });
  };


  /**
   * Check for ffprobe availability
   *
   * If the FFPROBE_PATH environment variable is set, try to use it.
   * If it is unset or incorrect, try to find ffprobe in the PATH instead.
   * If this still fails, try to find ffprobe in the same directory as ffmpeg.
   *
   * @method FfmpegCommand#_getFfprobePath
   * @param {Function} callback callback with signature (err, path)
   * @private
   */
  proto._getFfprobePath = function(callback) {
    var self = this;

    if ('ffprobePath' in cache) {
      return callback(null, cache.ffprobePath);
    }

    async.waterfall([
      // Try FFPROBE_PATH
      function(cb) {
        if (process.env.FFPROBE_PATH) {
          fs.exists(process.env.FFPROBE_PATH, function(exists) {
            cb(null, exists ? process.env.FFPROBE_PATH : '');
          });
        } else {
          cb(null, '');
        }
      },

      // Search in the PATH
      function(ffprobe, cb) {
        if (ffprobe.length) {
          return cb(null, ffprobe);
        }

        utils.which('ffprobe', function(err, ffprobe) {
          cb(err, ffprobe);
        });
      },

      // Search in the same directory as ffmpeg
      function(ffprobe, cb) {
        if (ffprobe.length) {
          return cb(null, ffprobe);
        }

        self._getFfmpegPath(function(err, ffmpeg) {
          if (err) {
            cb(err);
          } else if (ffmpeg.length) {
            var name = utils.isWindows ? 'ffprobe.exe' : 'ffprobe';
            var ffprobe = path.join(path.dirname(ffmpeg), name);
            fs.exists(ffprobe, function(exists) {
              cb(null, exists ? ffprobe : '');
            });
          } else {
            cb(null, '');
          }
        });
      }
    ], function(err, ffprobe) {
      if (err) {
        callback(err);
      } else {
        callback(null, cache.ffprobePath = (ffprobe || ''));
      }
    });
  };


  /**
   * Check for flvtool2/flvmeta availability
   *
   * If the FLVTOOL2_PATH or FLVMETA_PATH environment variable are set, try to use them.
   * If both are either unset or incorrect, try to find flvtool2 or flvmeta in the PATH instead.
   *
   * @method FfmpegCommand#_getFlvtoolPath
   * @param {Function} callback callback with signature (err, path)
   * @private
   */
   proto._getFlvtoolPath = function(callback) {
    if ('flvtoolPath' in cache) {
      return callback(null, cache.flvtoolPath);
    }

    async.waterfall([
      // Try FLVMETA_PATH
      function(cb) {
        if (process.env.FLVMETA_PATH) {
          fs.exists(process.env.FLVMETA_PATH, function(exists) {
            cb(null, exists ? process.env.FLVMETA_PATH : '');
          });
        } else {
          cb(null, '');
        }
      },

      // Try FLVTOOL2_PATH
      function(flvtool, cb) {
        if (flvtool.length) {
          return cb(null, flvtool);
        }

        if (process.env.FLVTOOL2_PATH) {
          fs.exists(process.env.FLVTOOL2_PATH, function(exists) {
            cb(null, exists ? process.env.FLVTOOL2_PATH : '');
          });
        } else {
          cb(null, '');
        }
      },

      // Search for flvmeta in the PATH
      function(flvtool, cb) {
        if (flvtool.length) {
          return cb(null, flvtool);
        }

        utils.which('flvmeta', function(err, flvmeta) {
          cb(err, flvmeta);
        });
      },

      // Search for flvtool2 in the PATH
      function(flvtool, cb) {
        if (flvtool.length) {
          return cb(null, flvtool);
        }

        utils.which('flvtool2', function(err, flvtool2) {
          cb(err, flvtool2);
        });
      },
    ], function(err, flvtool) {
      if (err) {
        callback(err);
      } else {
        callback(null, cache.flvtoolPath = (flvtool || ''));
      }
    });
  };


  /**
   * A callback passed to {@link FfmpegCommand#availableFilters}.
   *
   * @callback FfmpegCommand~filterCallback
   * @param {Error|null} err error object or null if no error happened
   * @param {Object} filters filter object with filter names as keys and the following
   *   properties for each filter:
   * @param {String} filters.description filter description
   * @param {String} filters.input input type, one of 'audio', 'video' and 'none'
   * @param {Boolean} filters.multipleInputs whether the filter supports multiple inputs
   * @param {String} filters.output output type, one of 'audio', 'video' and 'none'
   * @param {Boolean} filters.multipleOutputs whether the filter supports multiple outputs
   */

  /**
   * Query ffmpeg for available filters
   *
   * @method FfmpegCommand#availableFilters
   * @category Capabilities
   * @aliases getAvailableFilters
   *
   * @param {FfmpegCommand~filterCallback} callback callback function
   */
  proto.availableFilters =
  proto.getAvailableFilters = function(callback) {
    if ('filters' in cache) {
      return callback(null, cache.filters);
    }

    this._spawnFfmpeg(['-filters'], { captureStdout: true, stdoutLines: 0 }, function (err, stdoutRing) {
      if (err) {
        return callback(err);
      }

      var stdout = stdoutRing.get();
      var lines = stdout.split('\n');
      var data = {};
      var types = { A: 'audio', V: 'video', '|': 'none' };

      lines.forEach(function(line) {
        var match = line.match(filterRegexp);
        if (match) {
          data[match[1]] = {
            description: match[4],
            input: types[match[2].charAt(0)],
            multipleInputs: match[2].length > 1,
            output: types[match[3].charAt(0)],
            multipleOutputs: match[3].length > 1
          };
        }
      });

      callback(null, cache.filters = data);
    });
  };


  /**
   * A callback passed to {@link FfmpegCommand#availableCodecs}.
   *
   * @callback FfmpegCommand~codecCallback
   * @param {Error|null} err error object or null if no error happened
   * @param {Object} codecs codec object with codec names as keys and the following
   *   properties for each codec (more properties may be available depending on the
   *   ffmpeg version used):
   * @param {String} codecs.description codec description
   * @param {Boolean} codecs.canDecode whether the codec is able to decode streams
   * @param {Boolean} codecs.canEncode whether the codec is able to encode streams
   */

  /**
   * Query ffmpeg for available codecs
   *
   * @method FfmpegCommand#availableCodecs
   * @category Capabilities
   * @aliases getAvailableCodecs
   *
   * @param {FfmpegCommand~codecCallback} callback callback function
   */
  proto.availableCodecs =
  proto.getAvailableCodecs = function(callback) {
    if ('codecs' in cache) {
      return callback(null, cache.codecs);
    }

    this._spawnFfmpeg(['-codecs'], { captureStdout: true, stdoutLines: 0 }, function(err, stdoutRing) {
      if (err) {
        return callback(err);
      }

      var stdout = stdoutRing.get();
      var lines = stdout.split(lineBreakRegexp);
      var data = {};

      lines.forEach(function(line) {
        var match = line.match(avCodecRegexp);
        if (match && match[7] !== '=') {
          data[match[7]] = {
            type: { 'V': 'video', 'A': 'audio', 'S': 'subtitle' }[match[3]],
            description: match[8],
            canDecode: match[1] === 'D',
            canEncode: match[2] === 'E',
            drawHorizBand: match[4] === 'S',
            directRendering: match[5] === 'D',
            weirdFrameTruncation: match[6] === 'T'
          };
        }

        match = line.match(ffCodecRegexp);
        if (match && match[7] !== '=') {
          var codecData = data[match[7]] = {
            type: { 'V': 'video', 'A': 'audio', 'S': 'subtitle' }[match[3]],
            description: match[8],
            canDecode: match[1] === 'D',
            canEncode: match[2] === 'E',
            intraFrameOnly: match[4] === 'I',
            isLossy: match[5] === 'L',
            isLossless: match[6] === 'S'
          };

          var encoders = codecData.description.match(ffEncodersRegexp);
          encoders = encoders ? encoders[1].trim().split(' ') : [];

          var decoders = codecData.description.match(ffDecodersRegexp);
          decoders = decoders ? decoders[1].trim().split(' ') : [];

          if (encoders.length || decoders.length) {
            var coderData = {};
            utils.copy(codecData, coderData);
            delete coderData.canEncode;
            delete coderData.canDecode;

            encoders.forEach(function(name) {
              data[name] = {};
              utils.copy(coderData, data[name]);
              data[name].canEncode = true;
            });

            decoders.forEach(function(name) {
              if (name in data) {
                data[name].canDecode = true;
              } else {
                data[name] = {};
                utils.copy(coderData, data[name]);
                data[name].canDecode = true;
              }
            });
          }
        }
      });

      callback(null, cache.codecs = data);
    });
  };


  /**
   * A callback passed to {@link FfmpegCommand#availableEncoders}.
   *
   * @callback FfmpegCommand~encodersCallback
   * @param {Error|null} err error object or null if no error happened
   * @param {Object} encoders encoders object with encoder names as keys and the following
   *   properties for each encoder:
   * @param {String} encoders.description codec description
   * @param {Boolean} encoders.type "audio", "video" or "subtitle"
   * @param {Boolean} encoders.frameMT whether the encoder is able to do frame-level multithreading
   * @param {Boolean} encoders.sliceMT whether the encoder is able to do slice-level multithreading
   * @param {Boolean} encoders.experimental whether the encoder is experimental
   * @param {Boolean} encoders.drawHorizBand whether the encoder supports draw_horiz_band
   * @param {Boolean} encoders.directRendering whether the encoder supports direct encoding method 1
   */

  /**
   * Query ffmpeg for available encoders
   *
   * @method FfmpegCommand#availableEncoders
   * @category Capabilities
   * @aliases getAvailableEncoders
   *
   * @param {FfmpegCommand~encodersCallback} callback callback function
   */
  proto.availableEncoders =
  proto.getAvailableEncoders = function(callback) {
    if ('encoders' in cache) {
      return callback(null, cache.encoders);
    }

    this._spawnFfmpeg(['-encoders'], { captureStdout: true, stdoutLines: 0 }, function(err, stdoutRing) {
      if (err) {
        return callback(err);
      }

      var stdout = stdoutRing.get();
      var lines = stdout.split(lineBreakRegexp);
      var data = {};

      lines.forEach(function(line) {
        var match = line.match(encodersRegexp);
        if (match && match[7] !== '=') {
          data[match[7]] = {
            type: { 'V': 'video', 'A': 'audio', 'S': 'subtitle' }[match[1]],
            description: match[8],
            frameMT: match[2] === 'F',
            sliceMT: match[3] === 'S',
            experimental: match[4] === 'X',
            drawHorizBand: match[5] === 'B',
            directRendering: match[6] === 'D'
          };
        }
      });

      callback(null, cache.encoders = data);
    });
  };


  /**
   * A callback passed to {@link FfmpegCommand#availableFormats}.
   *
   * @callback FfmpegCommand~formatCallback
   * @param {Error|null} err error object or null if no error happened
   * @param {Object} formats format object with format names as keys and the following
   *   properties for each format:
   * @param {String} formats.description format description
   * @param {Boolean} formats.canDemux whether the format is able to demux streams from an input file
   * @param {Boolean} formats.canMux whether the format is able to mux streams into an output file
   */

  /**
   * Query ffmpeg for available formats
   *
   * @method FfmpegCommand#availableFormats
   * @category Capabilities
   * @aliases getAvailableFormats
   *
   * @param {FfmpegCommand~formatCallback} callback callback function
   */
  proto.availableFormats =
  proto.getAvailableFormats = function(callback) {
    if ('formats' in cache) {
      return callback(null, cache.formats);
    }

    // Run ffmpeg -formats
    this._spawnFfmpeg(['-formats'], { captureStdout: true, stdoutLines: 0 }, function (err, stdoutRing) {
      if (err) {
        return callback(err);
      }

      // Parse output
      var stdout = stdoutRing.get();
      var lines = stdout.split(lineBreakRegexp);
      var data = {};

      lines.forEach(function(line) {
        var match = line.match(formatRegexp);
        if (match) {
          match[3].split(',').forEach(function(format) {
            if (!(format in data)) {
              data[format] = {
                description: match[4],
                canDemux: false,
                canMux: false
              };
            }

            if (match[1] === 'D') {
              data[format].canDemux = true;
            }
            if (match[2] === 'E') {
              data[format].canMux = true;
            }
          });
        }
      });

      callback(null, cache.formats = data);
    });
  };


  /**
   * Check capabilities before executing a command
   *
   * Checks whether all used codecs and formats are indeed available
   *
   * @method FfmpegCommand#_checkCapabilities
   * @param {Function} callback callback with signature (err)
   * @private
   */
  proto._checkCapabilities = function(callback) {
    var self = this;
    async.waterfall([
      // Get available formats
      function(cb) {
        self.availableFormats(cb);
      },

      // Check whether specified formats are available
      function(formats, cb) {
        var unavailable;

        // Output format(s)
        unavailable = self._outputs
          .reduce(function(fmts, output) {
            var format = output.options.find('-f', 1);
            if (format) {
              if (!(format[0] in formats) || !(formats[format[0]].canMux)) {
                fmts.push(format);
              }
            }

            return fmts;
          }, []);

        if (unavailable.length === 1) {
          return cb(new Error('Output format ' + unavailable[0] + ' is not available'));
        } else if (unavailable.length > 1) {
          return cb(new Error('Output formats ' + unavailable.join(', ') + ' are not available'));
        }

        // Input format(s)
        unavailable = self._inputs
          .reduce(function(fmts, input) {
            var format = input.options.find('-f', 1);
            if (format) {
              if (!(format[0] in formats) || !(formats[format[0]].canDemux)) {
                fmts.push(format[0]);
              }
            }

            return fmts;
          }, []);

        if (unavailable.length === 1) {
          return cb(new Error('Input format ' + unavailable[0] + ' is not available'));
        } else if (unavailable.length > 1) {
          return cb(new Error('Input formats ' + unavailable.join(', ') + ' are not available'));
        }

        cb();
      },

      // Get available codecs
      function(cb) {
        self.availableEncoders(cb);
      },

      // Check whether specified codecs are available and add strict experimental options if needed
      function(encoders, cb) {
        var unavailable;

        // Audio codec(s)
        unavailable = self._outputs.reduce(function(cdcs, output) {
          var acodec = output.audio.find('-acodec', 1);
          if (acodec && acodec[0] !== 'copy') {
            if (!(acodec[0] in encoders) || encoders[acodec[0]].type !== 'audio') {
              cdcs.push(acodec[0]);
            }
          }

          return cdcs;
        }, []);

        if (unavailable.length === 1) {
          return cb(new Error('Audio codec ' + unavailable[0] + ' is not available'));
        } else if (unavailable.length > 1) {
          return cb(new Error('Audio codecs ' + unavailable.join(', ') + ' are not available'));
        }

        // Video codec(s)
        unavailable = self._outputs.reduce(function(cdcs, output) {
          var vcodec = output.video.find('-vcodec', 1);
          if (vcodec && vcodec[0] !== 'copy') {
            if (!(vcodec[0] in encoders) || encoders[vcodec[0]].type !== 'video') {
              cdcs.push(vcodec[0]);
            }
          }

          return cdcs;
        }, []);

        if (unavailable.length === 1) {
          return cb(new Error('Video codec ' + unavailable[0] + ' is not available'));
        } else if (unavailable.length > 1) {
          return cb(new Error('Video codecs ' + unavailable.join(', ') + ' are not available'));
        }

        cb();
      }
    ], callback);
  };
};


/***/ }),

/***/ "./node_modules/fluent-ffmpeg/lib/ffprobe.js":
/*!***************************************************!*\
  !*** ./node_modules/fluent-ffmpeg/lib/ffprobe.js ***!
  \***************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
/*jshint node:true, laxcomma:true*/


var spawn = (__webpack_require__(/*! child_process */ "child_process").spawn);


function legacyTag(key) { return key.match(/^TAG:/); }
function legacyDisposition(key) { return key.match(/^DISPOSITION:/); }

function parseFfprobeOutput(out) {
  var lines = out.split(/\r\n|\r|\n/);

  lines = lines.filter(function (line) {
    return line.length > 0;
  });

  var data = {
    streams: [],
    format: {},
    chapters: []
  };

  function parseBlock(name) {
    var data = {};

    var line = lines.shift();
    while (typeof line !== 'undefined') {
      if (line.toLowerCase() == '[/'+name+']') {
        return data;
      } else if (line.match(/^\[/)) {
        line = lines.shift();
        continue;
      }

      var kv = line.match(/^([^=]+)=(.*)$/);
      if (kv) {
        if (!(kv[1].match(/^TAG:/)) && kv[2].match(/^[0-9]+(\.[0-9]+)?$/)) {
          data[kv[1]] = Number(kv[2]);
        } else {
          data[kv[1]] = kv[2];
        }
      }

      line = lines.shift();
    }

    return data;
  }

  var line = lines.shift();
  while (typeof line !== 'undefined') {
    if (line.match(/^\[stream/i)) {
      var stream = parseBlock('stream');
      data.streams.push(stream);
    } else if (line.match(/^\[chapter/i)) {
      var chapter = parseBlock('chapter');
      data.chapters.push(chapter);
    } else if (line.toLowerCase() === '[format]') {
      data.format = parseBlock('format');
    }

    line = lines.shift();
  }

  return data;
}



module.exports = function(proto) {
  /**
   * A callback passed to the {@link FfmpegCommand#ffprobe} method.
   *
   * @callback FfmpegCommand~ffprobeCallback
   *
   * @param {Error|null} err error object or null if no error happened
   * @param {Object} ffprobeData ffprobe output data; this object
   *   has the same format as what the following command returns:
   *
   *     `ffprobe -print_format json -show_streams -show_format INPUTFILE`
   * @param {Array} ffprobeData.streams stream information
   * @param {Object} ffprobeData.format format information
   */

  /**
   * Run ffprobe on last specified input
   *
   * @method FfmpegCommand#ffprobe
   * @category Metadata
   *
   * @param {?Number} [index] 0-based index of input to probe (defaults to last input)
   * @param {?String[]} [options] array of output options to return
   * @param {FfmpegCommand~ffprobeCallback} callback callback function
   *
   */
  proto.ffprobe = function() {
    var input, index = null, options = [], callback;

    // the last argument should be the callback
    var callback = arguments[arguments.length - 1];

    var ended = false
    function handleCallback(err, data) {
      if (!ended) {
        ended = true;
        callback(err, data);
      }
    };

    // map the arguments to the correct variable names
    switch (arguments.length) {
      case 3:
        index = arguments[0];
        options = arguments[1];
        break;
      case 2:
        if (typeof arguments[0] === 'number') {
          index = arguments[0];
        } else if (Array.isArray(arguments[0])) {
          options = arguments[0];
        }
        break;
    }


    if (index === null) {
      if (!this._currentInput) {
        return handleCallback(new Error('No input specified'));
      }

      input = this._currentInput;
    } else {
      input = this._inputs[index];

      if (!input) {
        return handleCallback(new Error('Invalid input index'));
      }
    }

    // Find ffprobe
    this._getFfprobePath(function(err, path) {
      if (err) {
        return handleCallback(err);
      } else if (!path) {
        return handleCallback(new Error('Cannot find ffprobe'));
      }

      var stdout = '';
      var stdoutClosed = false;
      var stderr = '';
      var stderrClosed = false;

      // Spawn ffprobe
      var src = input.isStream ? 'pipe:0' : input.source;
      var ffprobe = spawn(path, ['-show_streams', '-show_format'].concat(options, src), {windowsHide: true});

      if (input.isStream) {
        // Skip errors on stdin. These get thrown when ffprobe is complete and
        // there seems to be no way hook in and close stdin before it throws.
        ffprobe.stdin.on('error', function(err) {
          if (['ECONNRESET', 'EPIPE', 'EOF'].indexOf(err.code) >= 0) { return; }
          handleCallback(err);
        });

        // Once ffprobe's input stream closes, we need no more data from the
        // input
        ffprobe.stdin.on('close', function() {
            input.source.pause();
            input.source.unpipe(ffprobe.stdin);
        });

        input.source.pipe(ffprobe.stdin);
      }

      ffprobe.on('error', callback);

      // Ensure we wait for captured streams to end before calling callback
      var exitError = null;
      function handleExit(err) {
        if (err) {
          exitError = err;
        }

        if (processExited && stdoutClosed && stderrClosed) {
          if (exitError) {
            if (stderr) {
              exitError.message += '\n' + stderr;
            }

            return handleCallback(exitError);
          }

          // Process output
          var data = parseFfprobeOutput(stdout);

          // Handle legacy output with "TAG:x" and "DISPOSITION:x" keys
          [data.format].concat(data.streams).forEach(function(target) {
            if (target) {
              var legacyTagKeys = Object.keys(target).filter(legacyTag);

              if (legacyTagKeys.length) {
                target.tags = target.tags || {};

                legacyTagKeys.forEach(function(tagKey) {
                  target.tags[tagKey.substr(4)] = target[tagKey];
                  delete target[tagKey];
                });
              }

              var legacyDispositionKeys = Object.keys(target).filter(legacyDisposition);

              if (legacyDispositionKeys.length) {
                target.disposition = target.disposition || {};

                legacyDispositionKeys.forEach(function(dispositionKey) {
                  target.disposition[dispositionKey.substr(12)] = target[dispositionKey];
                  delete target[dispositionKey];
                });
              }
            }
          });

          handleCallback(null, data);
        }
      }

      // Handle ffprobe exit
      var processExited = false;
      ffprobe.on('exit', function(code, signal) {
        processExited = true;

        if (code) {
          handleExit(new Error('ffprobe exited with code ' + code));
        } else if (signal) {
          handleExit(new Error('ffprobe was killed with signal ' + signal));
        } else {
          handleExit();
        }
      });

      // Handle stdout/stderr streams
      ffprobe.stdout.on('data', function(data) {
        stdout += data;
      });

      ffprobe.stdout.on('close', function() {
        stdoutClosed = true;
        handleExit();
      });

      ffprobe.stderr.on('data', function(data) {
        stderr += data;
      });

      ffprobe.stderr.on('close', function() {
        stderrClosed = true;
        handleExit();
      });
    });
  };
};


/***/ }),

/***/ "./node_modules/fluent-ffmpeg/lib/fluent-ffmpeg.js":
/*!*********************************************************!*\
  !*** ./node_modules/fluent-ffmpeg/lib/fluent-ffmpeg.js ***!
  \*********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
/*jshint node:true*/


var path = __webpack_require__(/*! path */ "path");
var util = __webpack_require__(/*! util */ "util");
var EventEmitter = (__webpack_require__(/*! events */ "events").EventEmitter);

var utils = __webpack_require__(/*! ./utils */ "./node_modules/fluent-ffmpeg/lib/utils.js");
var ARGLISTS = ['_global', '_audio', '_audioFilters', '_video', '_videoFilters', '_sizeFilters', '_complexFilters'];


/**
 * Create an ffmpeg command
 *
 * Can be called with or without the 'new' operator, and the 'input' parameter
 * may be specified as 'options.source' instead (or passed later with the
 * addInput method).
 *
 * @constructor
 * @param {String|ReadableStream} [input] input file path or readable stream
 * @param {Object} [options] command options
 * @param {Object} [options.logger=<no logging>] logger object with 'error', 'warning', 'info' and 'debug' methods
 * @param {Number} [options.niceness=0] ffmpeg process niceness, ignored on Windows
 * @param {Number} [options.priority=0] alias for `niceness`
 * @param {String} [options.presets="fluent-ffmpeg/lib/presets"] directory to load presets from
 * @param {String} [options.preset="fluent-ffmpeg/lib/presets"] alias for `presets`
 * @param {String} [options.stdoutLines=100] maximum lines of ffmpeg output to keep in memory, use 0 for unlimited
 * @param {Number} [options.timeout=<no timeout>] ffmpeg processing timeout in seconds
 * @param {String|ReadableStream} [options.source=<no input>] alias for the `input` parameter
 */
function FfmpegCommand(input, options) {
  // Make 'new' optional
  if (!(this instanceof FfmpegCommand)) {
    return new FfmpegCommand(input, options);
  }

  EventEmitter.call(this);

  if (typeof input === 'object' && !('readable' in input)) {
    // Options object passed directly
    options = input;
  } else {
    // Input passed first
    options = options || {};
    options.source = input;
  }

  // Add input if present
  this._inputs = [];
  if (options.source) {
    this.input(options.source);
  }

  // Add target-less output for backwards compatibility
  this._outputs = [];
  this.output();

  // Create argument lists
  var self = this;
  ['_global', '_complexFilters'].forEach(function(prop) {
    self[prop] = utils.args();
  });

  // Set default option values
  options.stdoutLines = 'stdoutLines' in options ? options.stdoutLines : 100;
  options.presets = options.presets || options.preset || __webpack_require__.ab + "presets";
  options.niceness = options.niceness || options.priority || 0;

  // Save options
  this.options = options;

  // Setup logger
  this.logger = options.logger || {
    debug: function() {},
    info: function() {},
    warn: function() {},
    error: function() {}
  };
}
util.inherits(FfmpegCommand, EventEmitter);
module.exports = FfmpegCommand;


/**
 * Clone an ffmpeg command
 *
 * This method is useful when you want to process the same input multiple times.
 * It returns a new FfmpegCommand instance with the exact same options.
 *
 * All options set _after_ the clone() call will only be applied to the instance
 * it has been called on.
 *
 * @example
 *   var command = ffmpeg('/path/to/source.avi')
 *     .audioCodec('libfaac')
 *     .videoCodec('libx264')
 *     .format('mp4');
 *
 *   command.clone()
 *     .size('320x200')
 *     .save('/path/to/output-small.mp4');
 *
 *   command.clone()
 *     .size('640x400')
 *     .save('/path/to/output-medium.mp4');
 *
 *   command.save('/path/to/output-original-size.mp4');
 *
 * @method FfmpegCommand#clone
 * @return FfmpegCommand
 */
FfmpegCommand.prototype.clone = function() {
  var clone = new FfmpegCommand();
  var self = this;

  // Clone options and logger
  clone.options = this.options;
  clone.logger = this.logger;

  // Clone inputs
  clone._inputs = this._inputs.map(function(input) {
    return {
      source: input.source,
      options: input.options.clone()
    };
  });

  // Create first output
  if ('target' in this._outputs[0]) {
    // We have outputs set, don't clone them and create first output
    clone._outputs = [];
    clone.output();
  } else {
    // No outputs set, clone first output options
    clone._outputs = [
      clone._currentOutput = {
        flags: {}
      }
    ];

    ['audio', 'audioFilters', 'video', 'videoFilters', 'sizeFilters', 'options'].forEach(function(key) {
      clone._currentOutput[key] = self._currentOutput[key].clone();
    });

    if (this._currentOutput.sizeData) {
      clone._currentOutput.sizeData = {};
      utils.copy(this._currentOutput.sizeData, clone._currentOutput.sizeData);
    }

    utils.copy(this._currentOutput.flags, clone._currentOutput.flags);
  }

  // Clone argument lists
  ['_global', '_complexFilters'].forEach(function(prop) {
    clone[prop] = self[prop].clone();
  });

  return clone;
};


/* Add methods from options submodules */

__webpack_require__(/*! ./options/inputs */ "./node_modules/fluent-ffmpeg/lib/options/inputs.js")(FfmpegCommand.prototype);
__webpack_require__(/*! ./options/audio */ "./node_modules/fluent-ffmpeg/lib/options/audio.js")(FfmpegCommand.prototype);
__webpack_require__(/*! ./options/video */ "./node_modules/fluent-ffmpeg/lib/options/video.js")(FfmpegCommand.prototype);
__webpack_require__(/*! ./options/videosize */ "./node_modules/fluent-ffmpeg/lib/options/videosize.js")(FfmpegCommand.prototype);
__webpack_require__(/*! ./options/output */ "./node_modules/fluent-ffmpeg/lib/options/output.js")(FfmpegCommand.prototype);
__webpack_require__(/*! ./options/custom */ "./node_modules/fluent-ffmpeg/lib/options/custom.js")(FfmpegCommand.prototype);
__webpack_require__(/*! ./options/misc */ "./node_modules/fluent-ffmpeg/lib/options/misc.js")(FfmpegCommand.prototype);


/* Add processor methods */

__webpack_require__(/*! ./processor */ "./node_modules/fluent-ffmpeg/lib/processor.js")(FfmpegCommand.prototype);


/* Add capabilities methods */

__webpack_require__(/*! ./capabilities */ "./node_modules/fluent-ffmpeg/lib/capabilities.js")(FfmpegCommand.prototype);

FfmpegCommand.setFfmpegPath = function(path) {
  (new FfmpegCommand()).setFfmpegPath(path);
};

FfmpegCommand.setFfprobePath = function(path) {
  (new FfmpegCommand()).setFfprobePath(path);
};

FfmpegCommand.setFlvtoolPath = function(path) {
  (new FfmpegCommand()).setFlvtoolPath(path);
};

FfmpegCommand.availableFilters =
FfmpegCommand.getAvailableFilters = function(callback) {
  (new FfmpegCommand()).availableFilters(callback);
};

FfmpegCommand.availableCodecs =
FfmpegCommand.getAvailableCodecs = function(callback) {
  (new FfmpegCommand()).availableCodecs(callback);
};

FfmpegCommand.availableFormats =
FfmpegCommand.getAvailableFormats = function(callback) {
  (new FfmpegCommand()).availableFormats(callback);
};

FfmpegCommand.availableEncoders =
FfmpegCommand.getAvailableEncoders = function(callback) {
  (new FfmpegCommand()).availableEncoders(callback);
};


/* Add ffprobe methods */

__webpack_require__(/*! ./ffprobe */ "./node_modules/fluent-ffmpeg/lib/ffprobe.js")(FfmpegCommand.prototype);

FfmpegCommand.ffprobe = function(file) {
  var instance = new FfmpegCommand(file);
  instance.ffprobe.apply(instance, Array.prototype.slice.call(arguments, 1));
};

/* Add processing recipes */

__webpack_require__(/*! ./recipes */ "./node_modules/fluent-ffmpeg/lib/recipes.js")(FfmpegCommand.prototype);


/***/ }),

/***/ "./node_modules/fluent-ffmpeg/lib/options/audio.js":
/*!*********************************************************!*\
  !*** ./node_modules/fluent-ffmpeg/lib/options/audio.js ***!
  \*********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
/*jshint node:true*/


var utils = __webpack_require__(/*! ../utils */ "./node_modules/fluent-ffmpeg/lib/utils.js");


/*
 *! Audio-related methods
 */

module.exports = function(proto) {
  /**
   * Disable audio in the output
   *
   * @method FfmpegCommand#noAudio
   * @category Audio
   * @aliases withNoAudio
   * @return FfmpegCommand
   */
  proto.withNoAudio =
  proto.noAudio = function() {
    this._currentOutput.audio.clear();
    this._currentOutput.audioFilters.clear();
    this._currentOutput.audio('-an');

    return this;
  };


  /**
   * Specify audio codec
   *
   * @method FfmpegCommand#audioCodec
   * @category Audio
   * @aliases withAudioCodec
   *
   * @param {String} codec audio codec name
   * @return FfmpegCommand
   */
  proto.withAudioCodec =
  proto.audioCodec = function(codec) {
    this._currentOutput.audio('-acodec', codec);

    return this;
  };


  /**
   * Specify audio bitrate
   *
   * @method FfmpegCommand#audioBitrate
   * @category Audio
   * @aliases withAudioBitrate
   *
   * @param {String|Number} bitrate audio bitrate in kbps (with an optional 'k' suffix)
   * @return FfmpegCommand
   */
  proto.withAudioBitrate =
  proto.audioBitrate = function(bitrate) {
    this._currentOutput.audio('-b:a', ('' + bitrate).replace(/k?$/, 'k'));
    return this;
  };


  /**
   * Specify audio channel count
   *
   * @method FfmpegCommand#audioChannels
   * @category Audio
   * @aliases withAudioChannels
   *
   * @param {Number} channels channel count
   * @return FfmpegCommand
   */
  proto.withAudioChannels =
  proto.audioChannels = function(channels) {
    this._currentOutput.audio('-ac', channels);
    return this;
  };


  /**
   * Specify audio frequency
   *
   * @method FfmpegCommand#audioFrequency
   * @category Audio
   * @aliases withAudioFrequency
   *
   * @param {Number} freq audio frequency in Hz
   * @return FfmpegCommand
   */
  proto.withAudioFrequency =
  proto.audioFrequency = function(freq) {
    this._currentOutput.audio('-ar', freq);
    return this;
  };


  /**
   * Specify audio quality
   *
   * @method FfmpegCommand#audioQuality
   * @category Audio
   * @aliases withAudioQuality
   *
   * @param {Number} quality audio quality factor
   * @return FfmpegCommand
   */
  proto.withAudioQuality =
  proto.audioQuality = function(quality) {
    this._currentOutput.audio('-aq', quality);
    return this;
  };


  /**
   * Specify custom audio filter(s)
   *
   * Can be called both with one or many filters, or a filter array.
   *
   * @example
   * command.audioFilters('filter1');
   *
   * @example
   * command.audioFilters('filter1', 'filter2=param1=value1:param2=value2');
   *
   * @example
   * command.audioFilters(['filter1', 'filter2']);
   *
   * @example
   * command.audioFilters([
   *   {
   *     filter: 'filter1'
   *   },
   *   {
   *     filter: 'filter2',
   *     options: 'param=value:param=value'
   *   }
   * ]);
   *
   * @example
   * command.audioFilters(
   *   {
   *     filter: 'filter1',
   *     options: ['value1', 'value2']
   *   },
   *   {
   *     filter: 'filter2',
   *     options: { param1: 'value1', param2: 'value2' }
   *   }
   * );
   *
   * @method FfmpegCommand#audioFilters
   * @aliases withAudioFilter,withAudioFilters,audioFilter
   * @category Audio
   *
   * @param {...String|String[]|Object[]} filters audio filter strings, string array or
   *   filter specification array, each with the following properties:
   * @param {String} filters.filter filter name
   * @param {String|String[]|Object} [filters.options] filter option string, array, or object
   * @return FfmpegCommand
   */
  proto.withAudioFilter =
  proto.withAudioFilters =
  proto.audioFilter =
  proto.audioFilters = function(filters) {
    if (arguments.length > 1) {
      filters = [].slice.call(arguments);
    }

    if (!Array.isArray(filters)) {
      filters = [filters];
    }

    this._currentOutput.audioFilters(utils.makeFilterStrings(filters));
    return this;
  };
};


/***/ }),

/***/ "./node_modules/fluent-ffmpeg/lib/options/custom.js":
/*!**********************************************************!*\
  !*** ./node_modules/fluent-ffmpeg/lib/options/custom.js ***!
  \**********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
/*jshint node:true*/


var utils = __webpack_require__(/*! ../utils */ "./node_modules/fluent-ffmpeg/lib/utils.js");


/*
 *! Custom options methods
 */

module.exports = function(proto) {
  /**
   * Add custom input option(s)
   *
   * When passing a single string or an array, each string containing two
   * words is split (eg. inputOptions('-option value') is supported) for
   * compatibility reasons.  This is not the case when passing more than
   * one argument.
   *
   * @example
   * command.inputOptions('option1');
   *
   * @example
   * command.inputOptions('option1', 'option2');
   *
   * @example
   * command.inputOptions(['option1', 'option2']);
   *
   * @method FfmpegCommand#inputOptions
   * @category Custom options
   * @aliases addInputOption,addInputOptions,withInputOption,withInputOptions,inputOption
   *
   * @param {...String} options option string(s) or string array
   * @return FfmpegCommand
   */
  proto.addInputOption =
  proto.addInputOptions =
  proto.withInputOption =
  proto.withInputOptions =
  proto.inputOption =
  proto.inputOptions = function(options) {
    if (!this._currentInput) {
      throw new Error('No input specified');
    }

    var doSplit = true;

    if (arguments.length > 1) {
      options = [].slice.call(arguments);
      doSplit = false;
    }

    if (!Array.isArray(options)) {
      options = [options];
    }

    this._currentInput.options(options.reduce(function(options, option) {
      var split = String(option).split(' ');

      if (doSplit && split.length === 2) {
        options.push(split[0], split[1]);
      } else {
        options.push(option);
      }

      return options;
    }, []));
    return this;
  };


  /**
   * Add custom output option(s)
   *
   * @example
   * command.outputOptions('option1');
   *
   * @example
   * command.outputOptions('option1', 'option2');
   *
   * @example
   * command.outputOptions(['option1', 'option2']);
   *
   * @method FfmpegCommand#outputOptions
   * @category Custom options
   * @aliases addOutputOption,addOutputOptions,addOption,addOptions,withOutputOption,withOutputOptions,withOption,withOptions,outputOption
   *
   * @param {...String} options option string(s) or string array
   * @return FfmpegCommand
   */
  proto.addOutputOption =
  proto.addOutputOptions =
  proto.addOption =
  proto.addOptions =
  proto.withOutputOption =
  proto.withOutputOptions =
  proto.withOption =
  proto.withOptions =
  proto.outputOption =
  proto.outputOptions = function(options) {
    var doSplit = true;

    if (arguments.length > 1) {
      options = [].slice.call(arguments);
      doSplit = false;
    }

    if (!Array.isArray(options)) {
      options = [options];
    }

    this._currentOutput.options(options.reduce(function(options, option) {
      var split = String(option).split(' ');

      if (doSplit && split.length === 2) {
        options.push(split[0], split[1]);
      } else {
        options.push(option);
      }

      return options;
    }, []));
    return this;
  };


  /**
   * Specify a complex filtergraph
   *
   * Calling this method will override any previously set filtergraph, but you can set
   * as many filters as needed in one call.
   *
   * @example <caption>Overlay an image over a video (using a filtergraph string)</caption>
   *   ffmpeg()
   *     .input('video.avi')
   *     .input('image.png')
   *     .complexFilter('[0:v][1:v]overlay[out]', ['out']);
   *
   * @example <caption>Overlay an image over a video (using a filter array)</caption>
   *   ffmpeg()
   *     .input('video.avi')
   *     .input('image.png')
   *     .complexFilter([{
   *       filter: 'overlay',
   *       inputs: ['0:v', '1:v'],
   *       outputs: ['out']
   *     }], ['out']);
   *
   * @example <caption>Split video into RGB channels and output a 3x1 video with channels side to side</caption>
   *  ffmpeg()
   *    .input('video.avi')
   *    .complexFilter([
   *      // Duplicate video stream 3 times into streams a, b, and c
   *      { filter: 'split', options: '3', outputs: ['a', 'b', 'c'] },
   *
   *      // Create stream 'red' by cancelling green and blue channels from stream 'a'
   *      { filter: 'lutrgb', options: { g: 0, b: 0 }, inputs: 'a', outputs: 'red' },
   *
   *      // Create stream 'green' by cancelling red and blue channels from stream 'b'
   *      { filter: 'lutrgb', options: { r: 0, b: 0 }, inputs: 'b', outputs: 'green' },
   *
   *      // Create stream 'blue' by cancelling red and green channels from stream 'c'
   *      { filter: 'lutrgb', options: { r: 0, g: 0 }, inputs: 'c', outputs: 'blue' },
   *
   *      // Pad stream 'red' to 3x width, keeping the video on the left, and name output 'padded'
   *      { filter: 'pad', options: { w: 'iw*3', h: 'ih' }, inputs: 'red', outputs: 'padded' },
   *
   *      // Overlay 'green' onto 'padded', moving it to the center, and name output 'redgreen'
   *      { filter: 'overlay', options: { x: 'w', y: 0 }, inputs: ['padded', 'green'], outputs: 'redgreen'},
   *
   *      // Overlay 'blue' onto 'redgreen', moving it to the right
   *      { filter: 'overlay', options: { x: '2*w', y: 0 }, inputs: ['redgreen', 'blue']},
   *    ]);
   *
   * @method FfmpegCommand#complexFilter
   * @category Custom options
   * @aliases filterGraph
   *
   * @param {String|Array} spec filtergraph string or array of filter specification
   *   objects, each having the following properties:
   * @param {String} spec.filter filter name
   * @param {String|Array} [spec.inputs] (array of) input stream specifier(s) for the filter,
   *   defaults to ffmpeg automatically choosing the first unused matching streams
   * @param {String|Array} [spec.outputs] (array of) output stream specifier(s) for the filter,
   *   defaults to ffmpeg automatically assigning the output to the output file
   * @param {Object|String|Array} [spec.options] filter options, can be omitted to not set any options
   * @param {Array} [map] (array of) stream specifier(s) from the graph to include in
   *   ffmpeg output, defaults to ffmpeg automatically choosing the first matching streams.
   * @return FfmpegCommand
   */
  proto.filterGraph =
  proto.complexFilter = function(spec, map) {
    this._complexFilters.clear();

    if (!Array.isArray(spec)) {
      spec = [spec];
    }

    this._complexFilters('-filter_complex', utils.makeFilterStrings(spec).join(';'));

    if (Array.isArray(map)) {
      var self = this;
      map.forEach(function(streamSpec) {
        self._complexFilters('-map', streamSpec.replace(utils.streamRegexp, '[$1]'));
      });
    } else if (typeof map === 'string') {
      this._complexFilters('-map', map.replace(utils.streamRegexp, '[$1]'));
    }

    return this;
  };
};


/***/ }),

/***/ "./node_modules/fluent-ffmpeg/lib/options/inputs.js":
/*!**********************************************************!*\
  !*** ./node_modules/fluent-ffmpeg/lib/options/inputs.js ***!
  \**********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
/*jshint node:true*/


var utils = __webpack_require__(/*! ../utils */ "./node_modules/fluent-ffmpeg/lib/utils.js");

/*
 *! Input-related methods
 */

module.exports = function(proto) {
  /**
   * Add an input to command
   *
   * Also switches "current input", that is the input that will be affected
   * by subsequent input-related methods.
   *
   * Note: only one stream input is supported for now.
   *
   * @method FfmpegCommand#input
   * @category Input
   * @aliases mergeAdd,addInput
   *
   * @param {String|Readable} source input file path or readable stream
   * @return FfmpegCommand
   */
  proto.mergeAdd =
  proto.addInput =
  proto.input = function(source) {
    var isFile = false;
    var isStream = false;

    if (typeof source !== 'string') {
      if (!('readable' in source) || !(source.readable)) {
        throw new Error('Invalid input');
      }

      var hasInputStream = this._inputs.some(function(input) {
        return input.isStream;
      });

      if (hasInputStream) {
        throw new Error('Only one input stream is supported');
      }

      isStream = true;
      source.pause();
    } else {
      var protocol = source.match(/^([a-z]{2,}):/i);
      isFile = !protocol || protocol[0] === 'file';
    }

    this._inputs.push(this._currentInput = {
      source: source,
      isFile: isFile,
      isStream: isStream,
      options: utils.args()
    });

    return this;
  };


  /**
   * Specify input format for the last specified input
   *
   * @method FfmpegCommand#inputFormat
   * @category Input
   * @aliases withInputFormat,fromFormat
   *
   * @param {String} format input format
   * @return FfmpegCommand
   */
  proto.withInputFormat =
  proto.inputFormat =
  proto.fromFormat = function(format) {
    if (!this._currentInput) {
      throw new Error('No input specified');
    }

    this._currentInput.options('-f', format);
    return this;
  };


  /**
   * Specify input FPS for the last specified input
   * (only valid for raw video formats)
   *
   * @method FfmpegCommand#inputFps
   * @category Input
   * @aliases withInputFps,withInputFPS,withFpsInput,withFPSInput,inputFPS,inputFps,fpsInput
   *
   * @param {Number} fps input FPS
   * @return FfmpegCommand
   */
  proto.withInputFps =
  proto.withInputFPS =
  proto.withFpsInput =
  proto.withFPSInput =
  proto.inputFPS =
  proto.inputFps =
  proto.fpsInput =
  proto.FPSInput = function(fps) {
    if (!this._currentInput) {
      throw new Error('No input specified');
    }

    this._currentInput.options('-r', fps);
    return this;
  };


  /**
   * Use native framerate for the last specified input
   *
   * @method FfmpegCommand#native
   * @category Input
   * @aliases nativeFramerate,withNativeFramerate
   *
   * @return FfmmegCommand
   */
  proto.nativeFramerate =
  proto.withNativeFramerate =
  proto.native = function() {
    if (!this._currentInput) {
      throw new Error('No input specified');
    }

    this._currentInput.options('-re');
    return this;
  };


  /**
   * Specify input seek time for the last specified input
   *
   * @method FfmpegCommand#seekInput
   * @category Input
   * @aliases setStartTime,seekTo
   *
   * @param {String|Number} seek seek time in seconds or as a '[hh:[mm:]]ss[.xxx]' string
   * @return FfmpegCommand
   */
  proto.setStartTime =
  proto.seekInput = function(seek) {
    if (!this._currentInput) {
      throw new Error('No input specified');
    }

    this._currentInput.options('-ss', seek);

    return this;
  };


  /**
   * Loop over the last specified input
   *
   * @method FfmpegCommand#loop
   * @category Input
   *
   * @param {String|Number} [duration] loop duration in seconds or as a '[[hh:]mm:]ss[.xxx]' string
   * @return FfmpegCommand
   */
  proto.loop = function(duration) {
    if (!this._currentInput) {
      throw new Error('No input specified');
    }

    this._currentInput.options('-loop', '1');

    if (typeof duration !== 'undefined') {
      this.duration(duration);
    }

    return this;
  };
};


/***/ }),

/***/ "./node_modules/fluent-ffmpeg/lib/options/misc.js":
/*!********************************************************!*\
  !*** ./node_modules/fluent-ffmpeg/lib/options/misc.js ***!
  \********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
/*jshint node:true*/


var path = __webpack_require__(/*! path */ "path");

/*
 *! Miscellaneous methods
 */

module.exports = function(proto) {
  /**
   * Use preset
   *
   * @method FfmpegCommand#preset
   * @category Miscellaneous
   * @aliases usingPreset
   *
   * @param {String|Function} preset preset name or preset function
   */
  proto.usingPreset =
  proto.preset = function(preset) {
    if (typeof preset === 'function') {
      preset(this);
    } else {
      try {
        var modulePath = path.join(this.options.presets, preset);
        var module = require(modulePath);

        if (typeof module.load === 'function') {
          module.load(this);
        } else {
          throw new Error('preset ' + modulePath + ' has no load() function');
        }
      } catch (err) {
        throw new Error('preset ' + modulePath + ' could not be loaded: ' + err.message);
      }
    }

    return this;
  };
};


/***/ }),

/***/ "./node_modules/fluent-ffmpeg/lib/options/output.js":
/*!**********************************************************!*\
  !*** ./node_modules/fluent-ffmpeg/lib/options/output.js ***!
  \**********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
/*jshint node:true*/


var utils = __webpack_require__(/*! ../utils */ "./node_modules/fluent-ffmpeg/lib/utils.js");


/*
 *! Output-related methods
 */

module.exports = function(proto) {
  /**
   * Add output
   *
   * @method FfmpegCommand#output
   * @category Output
   * @aliases addOutput
   *
   * @param {String|Writable} target target file path or writable stream
   * @param {Object} [pipeopts={}] pipe options (only applies to streams)
   * @return FfmpegCommand
   */
  proto.addOutput =
  proto.output = function(target, pipeopts) {
    var isFile = false;

    if (!target && this._currentOutput) {
      // No target is only allowed when called from constructor
      throw new Error('Invalid output');
    }

    if (target && typeof target !== 'string') {
      if (!('writable' in target) || !(target.writable)) {
        throw new Error('Invalid output');
      }
    } else if (typeof target === 'string') {
      var protocol = target.match(/^([a-z]{2,}):/i);
      isFile = !protocol || protocol[0] === 'file';
    }

    if (target && !('target' in this._currentOutput)) {
      // For backwards compatibility, set target for first output
      this._currentOutput.target = target;
      this._currentOutput.isFile = isFile;
      this._currentOutput.pipeopts = pipeopts || {};
    } else {
      if (target && typeof target !== 'string') {
        var hasOutputStream = this._outputs.some(function(output) {
          return typeof output.target !== 'string';
        });

        if (hasOutputStream) {
          throw new Error('Only one output stream is supported');
        }
      }

      this._outputs.push(this._currentOutput = {
        target: target,
        isFile: isFile,
        flags: {},
        pipeopts: pipeopts || {}
      });

      var self = this;
      ['audio', 'audioFilters', 'video', 'videoFilters', 'sizeFilters', 'options'].forEach(function(key) {
        self._currentOutput[key] = utils.args();
      });

      if (!target) {
        // Call from constructor: remove target key
        delete this._currentOutput.target;
      }
    }

    return this;
  };


  /**
   * Specify output seek time
   *
   * @method FfmpegCommand#seek
   * @category Input
   * @aliases seekOutput
   *
   * @param {String|Number} seek seek time in seconds or as a '[hh:[mm:]]ss[.xxx]' string
   * @return FfmpegCommand
   */
  proto.seekOutput =
  proto.seek = function(seek) {
    this._currentOutput.options('-ss', seek);
    return this;
  };


  /**
   * Set output duration
   *
   * @method FfmpegCommand#duration
   * @category Output
   * @aliases withDuration,setDuration
   *
   * @param {String|Number} duration duration in seconds or as a '[[hh:]mm:]ss[.xxx]' string
   * @return FfmpegCommand
   */
  proto.withDuration =
  proto.setDuration =
  proto.duration = function(duration) {
    this._currentOutput.options('-t', duration);
    return this;
  };


  /**
   * Set output format
   *
   * @method FfmpegCommand#format
   * @category Output
   * @aliases toFormat,withOutputFormat,outputFormat
   *
   * @param {String} format output format name
   * @return FfmpegCommand
   */
  proto.toFormat =
  proto.withOutputFormat =
  proto.outputFormat =
  proto.format = function(format) {
    this._currentOutput.options('-f', format);
    return this;
  };


  /**
   * Add stream mapping to output
   *
   * @method FfmpegCommand#map
   * @category Output
   *
   * @param {String} spec stream specification string, with optional square brackets
   * @return FfmpegCommand
   */
  proto.map = function(spec) {
    this._currentOutput.options('-map', spec.replace(utils.streamRegexp, '[$1]'));
    return this;
  };


  /**
   * Run flvtool2/flvmeta on output
   *
   * @method FfmpegCommand#flvmeta
   * @category Output
   * @aliases updateFlvMetadata
   *
   * @return FfmpegCommand
   */
  proto.updateFlvMetadata =
  proto.flvmeta = function() {
    this._currentOutput.flags.flvmeta = true;
    return this;
  };
};


/***/ }),

/***/ "./node_modules/fluent-ffmpeg/lib/options/video.js":
/*!*********************************************************!*\
  !*** ./node_modules/fluent-ffmpeg/lib/options/video.js ***!
  \*********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
/*jshint node:true*/


var utils = __webpack_require__(/*! ../utils */ "./node_modules/fluent-ffmpeg/lib/utils.js");


/*
 *! Video-related methods
 */

module.exports = function(proto) {
  /**
   * Disable video in the output
   *
   * @method FfmpegCommand#noVideo
   * @category Video
   * @aliases withNoVideo
   *
   * @return FfmpegCommand
   */
  proto.withNoVideo =
  proto.noVideo = function() {
    this._currentOutput.video.clear();
    this._currentOutput.videoFilters.clear();
    this._currentOutput.video('-vn');

    return this;
  };


  /**
   * Specify video codec
   *
   * @method FfmpegCommand#videoCodec
   * @category Video
   * @aliases withVideoCodec
   *
   * @param {String} codec video codec name
   * @return FfmpegCommand
   */
  proto.withVideoCodec =
  proto.videoCodec = function(codec) {
    this._currentOutput.video('-vcodec', codec);
    return this;
  };


  /**
   * Specify video bitrate
   *
   * @method FfmpegCommand#videoBitrate
   * @category Video
   * @aliases withVideoBitrate
   *
   * @param {String|Number} bitrate video bitrate in kbps (with an optional 'k' suffix)
   * @param {Boolean} [constant=false] enforce constant bitrate
   * @return FfmpegCommand
   */
  proto.withVideoBitrate =
  proto.videoBitrate = function(bitrate, constant) {
    bitrate = ('' + bitrate).replace(/k?$/, 'k');

    this._currentOutput.video('-b:v', bitrate);
    if (constant) {
      this._currentOutput.video(
        '-maxrate', bitrate,
        '-minrate', bitrate,
        '-bufsize', '3M'
      );
    }

    return this;
  };


  /**
   * Specify custom video filter(s)
   *
   * Can be called both with one or many filters, or a filter array.
   *
   * @example
   * command.videoFilters('filter1');
   *
   * @example
   * command.videoFilters('filter1', 'filter2=param1=value1:param2=value2');
   *
   * @example
   * command.videoFilters(['filter1', 'filter2']);
   *
   * @example
   * command.videoFilters([
   *   {
   *     filter: 'filter1'
   *   },
   *   {
   *     filter: 'filter2',
   *     options: 'param=value:param=value'
   *   }
   * ]);
   *
   * @example
   * command.videoFilters(
   *   {
   *     filter: 'filter1',
   *     options: ['value1', 'value2']
   *   },
   *   {
   *     filter: 'filter2',
   *     options: { param1: 'value1', param2: 'value2' }
   *   }
   * );
   *
   * @method FfmpegCommand#videoFilters
   * @category Video
   * @aliases withVideoFilter,withVideoFilters,videoFilter
   *
   * @param {...String|String[]|Object[]} filters video filter strings, string array or
   *   filter specification array, each with the following properties:
   * @param {String} filters.filter filter name
   * @param {String|String[]|Object} [filters.options] filter option string, array, or object
   * @return FfmpegCommand
   */
  proto.withVideoFilter =
  proto.withVideoFilters =
  proto.videoFilter =
  proto.videoFilters = function(filters) {
    if (arguments.length > 1) {
      filters = [].slice.call(arguments);
    }

    if (!Array.isArray(filters)) {
      filters = [filters];
    }

    this._currentOutput.videoFilters(utils.makeFilterStrings(filters));

    return this;
  };


  /**
   * Specify output FPS
   *
   * @method FfmpegCommand#fps
   * @category Video
   * @aliases withOutputFps,withOutputFPS,withFpsOutput,withFPSOutput,withFps,withFPS,outputFPS,outputFps,fpsOutput,FPSOutput,FPS
   *
   * @param {Number} fps output FPS
   * @return FfmpegCommand
   */
  proto.withOutputFps =
  proto.withOutputFPS =
  proto.withFpsOutput =
  proto.withFPSOutput =
  proto.withFps =
  proto.withFPS =
  proto.outputFPS =
  proto.outputFps =
  proto.fpsOutput =
  proto.FPSOutput =
  proto.fps =
  proto.FPS = function(fps) {
    this._currentOutput.video('-r', fps);
    return this;
  };


  /**
   * Only transcode a certain number of frames
   *
   * @method FfmpegCommand#frames
   * @category Video
   * @aliases takeFrames,withFrames
   *
   * @param {Number} frames frame count
   * @return FfmpegCommand
   */
  proto.takeFrames =
  proto.withFrames =
  proto.frames = function(frames) {
    this._currentOutput.video('-vframes', frames);
    return this;
  };
};


/***/ }),

/***/ "./node_modules/fluent-ffmpeg/lib/options/videosize.js":
/*!*************************************************************!*\
  !*** ./node_modules/fluent-ffmpeg/lib/options/videosize.js ***!
  \*************************************************************/
/***/ ((module) => {

"use strict";
/*jshint node:true*/


/*
 *! Size helpers
 */


/**
 * Return filters to pad video to width*height,
 *
 * @param {Number} width output width
 * @param {Number} height output height
 * @param {Number} aspect video aspect ratio (without padding)
 * @param {Number} color padding color
 * @return scale/pad filters
 * @private
 */
function getScalePadFilters(width, height, aspect, color) {
  /*
    let a be the input aspect ratio, A be the requested aspect ratio

    if a > A, padding is done on top and bottom
    if a < A, padding is done on left and right
   */

  return [
    /*
      In both cases, we first have to scale the input to match the requested size.
      When using computed width/height, we truncate them to multiples of 2
     */
    {
      filter: 'scale',
      options: {
        w: 'if(gt(a,' + aspect + '),' + width + ',trunc(' + height + '*a/2)*2)',
        h: 'if(lt(a,' + aspect + '),' + height + ',trunc(' + width + '/a/2)*2)'
      }
    },

    /*
      Then we pad the scaled input to match the target size
      (here iw and ih refer to the padding input, i.e the scaled output)
     */

    {
      filter: 'pad',
      options: {
        w: width,
        h: height,
        x: 'if(gt(a,' + aspect + '),0,(' + width + '-iw)/2)',
        y: 'if(lt(a,' + aspect + '),0,(' + height + '-ih)/2)',
        color: color
      }
    }
  ];
}


/**
 * Recompute size filters
 *
 * @param {Object} output
 * @param {String} key newly-added parameter name ('size', 'aspect' or 'pad')
 * @param {String} value newly-added parameter value
 * @return filter string array
 * @private
 */
function createSizeFilters(output, key, value) {
  // Store parameters
  var data = output.sizeData = output.sizeData || {};
  data[key] = value;

  if (!('size' in data)) {
    // No size requested, keep original size
    return [];
  }

  // Try to match the different size string formats
  var fixedSize = data.size.match(/([0-9]+)x([0-9]+)/);
  var fixedWidth = data.size.match(/([0-9]+)x\?/);
  var fixedHeight = data.size.match(/\?x([0-9]+)/);
  var percentRatio = data.size.match(/\b([0-9]{1,3})%/);
  var width, height, aspect;

  if (percentRatio) {
    var ratio = Number(percentRatio[1]) / 100;
    return [{
      filter: 'scale',
      options: {
        w: 'trunc(iw*' + ratio + '/2)*2',
        h: 'trunc(ih*' + ratio + '/2)*2'
      }
    }];
  } else if (fixedSize) {
    // Round target size to multiples of 2
    width = Math.round(Number(fixedSize[1]) / 2) * 2;
    height = Math.round(Number(fixedSize[2]) / 2) * 2;

    aspect = width / height;

    if (data.pad) {
      return getScalePadFilters(width, height, aspect, data.pad);
    } else {
      // No autopad requested, rescale to target size
      return [{ filter: 'scale', options: { w: width, h: height }}];
    }
  } else if (fixedWidth || fixedHeight) {
    if ('aspect' in data) {
      // Specified aspect ratio
      width = fixedWidth ? fixedWidth[1] : Math.round(Number(fixedHeight[1]) * data.aspect);
      height = fixedHeight ? fixedHeight[1] : Math.round(Number(fixedWidth[1]) / data.aspect);

      // Round to multiples of 2
      width = Math.round(width / 2) * 2;
      height = Math.round(height / 2) * 2;

      if (data.pad) {
        return getScalePadFilters(width, height, data.aspect, data.pad);
      } else {
        // No autopad requested, rescale to target size
        return [{ filter: 'scale', options: { w: width, h: height }}];
      }
    } else {
      // Keep input aspect ratio

      if (fixedWidth) {
        return [{
          filter: 'scale',
          options: {
            w: Math.round(Number(fixedWidth[1]) / 2) * 2,
            h: 'trunc(ow/a/2)*2'
          }
        }];
      } else {
        return [{
          filter: 'scale',
          options: {
            w: 'trunc(oh*a/2)*2',
            h: Math.round(Number(fixedHeight[1]) / 2) * 2
          }
        }];
      }
    }
  } else {
    throw new Error('Invalid size specified: ' + data.size);
  }
}


/*
 *! Video size-related methods
 */

module.exports = function(proto) {
  /**
   * Keep display aspect ratio
   *
   * This method is useful when converting an input with non-square pixels to an output format
   * that does not support non-square pixels.  It rescales the input so that the display aspect
   * ratio is the same.
   *
   * @method FfmpegCommand#keepDAR
   * @category Video size
   * @aliases keepPixelAspect,keepDisplayAspect,keepDisplayAspectRatio
   *
   * @return FfmpegCommand
   */
  proto.keepPixelAspect = // Only for compatibility, this is not about keeping _pixel_ aspect ratio
  proto.keepDisplayAspect =
  proto.keepDisplayAspectRatio =
  proto.keepDAR = function() {
    return this.videoFilters([
      {
        filter: 'scale',
        options: {
          w: 'if(gt(sar,1),iw*sar,iw)',
          h: 'if(lt(sar,1),ih/sar,ih)'
        }
      },
      {
        filter: 'setsar',
        options: '1'
      }
    ]);
  };


  /**
   * Set output size
   *
   * The 'size' parameter can have one of 4 forms:
   * - 'X%': rescale to xx % of the original size
   * - 'WxH': specify width and height
   * - 'Wx?': specify width and compute height from input aspect ratio
   * - '?xH': specify height and compute width from input aspect ratio
   *
   * Note: both dimensions will be truncated to multiples of 2.
   *
   * @method FfmpegCommand#size
   * @category Video size
   * @aliases withSize,setSize
   *
   * @param {String} size size string, eg. '33%', '320x240', '320x?', '?x240'
   * @return FfmpegCommand
   */
  proto.withSize =
  proto.setSize =
  proto.size = function(size) {
    var filters = createSizeFilters(this._currentOutput, 'size', size);

    this._currentOutput.sizeFilters.clear();
    this._currentOutput.sizeFilters(filters);

    return this;
  };


  /**
   * Set output aspect ratio
   *
   * @method FfmpegCommand#aspect
   * @category Video size
   * @aliases withAspect,withAspectRatio,setAspect,setAspectRatio,aspectRatio
   *
   * @param {String|Number} aspect aspect ratio (number or 'X:Y' string)
   * @return FfmpegCommand
   */
  proto.withAspect =
  proto.withAspectRatio =
  proto.setAspect =
  proto.setAspectRatio =
  proto.aspect =
  proto.aspectRatio = function(aspect) {
    var a = Number(aspect);
    if (isNaN(a)) {
      var match = aspect.match(/^(\d+):(\d+)$/);
      if (match) {
        a = Number(match[1]) / Number(match[2]);
      } else {
        throw new Error('Invalid aspect ratio: ' + aspect);
      }
    }

    var filters = createSizeFilters(this._currentOutput, 'aspect', a);

    this._currentOutput.sizeFilters.clear();
    this._currentOutput.sizeFilters(filters);

    return this;
  };


  /**
   * Enable auto-padding the output
   *
   * @method FfmpegCommand#autopad
   * @category Video size
   * @aliases applyAutopadding,applyAutoPadding,applyAutopad,applyAutoPad,withAutopadding,withAutoPadding,withAutopad,withAutoPad,autoPad
   *
   * @param {Boolean} [pad=true] enable/disable auto-padding
   * @param {String} [color='black'] pad color
   */
  proto.applyAutopadding =
  proto.applyAutoPadding =
  proto.applyAutopad =
  proto.applyAutoPad =
  proto.withAutopadding =
  proto.withAutoPadding =
  proto.withAutopad =
  proto.withAutoPad =
  proto.autoPad =
  proto.autopad = function(pad, color) {
    // Allow autopad(color)
    if (typeof pad === 'string') {
      color = pad;
      pad = true;
    }

    // Allow autopad() and autopad(undefined, color)
    if (typeof pad === 'undefined') {
      pad = true;
    }

    var filters = createSizeFilters(this._currentOutput, 'pad', pad ? color || 'black' : false);

    this._currentOutput.sizeFilters.clear();
    this._currentOutput.sizeFilters(filters);

    return this;
  };
};


/***/ }),

/***/ "./node_modules/fluent-ffmpeg/lib/processor.js":
/*!*****************************************************!*\
  !*** ./node_modules/fluent-ffmpeg/lib/processor.js ***!
  \*****************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
/*jshint node:true*/


var spawn = (__webpack_require__(/*! child_process */ "child_process").spawn);
var path = __webpack_require__(/*! path */ "path");
var fs = __webpack_require__(/*! fs */ "fs");
var async = __webpack_require__(/*! async */ "./node_modules/async/lib/async.js");
var utils = __webpack_require__(/*! ./utils */ "./node_modules/fluent-ffmpeg/lib/utils.js");

/*
 *! Processor methods
 */


/**
 * Run ffprobe asynchronously and store data in command
 *
 * @param {FfmpegCommand} command
 * @private
 */
function runFfprobe(command) {
  const inputProbeIndex = 0;
  if (command._inputs[inputProbeIndex].isStream) {
    // Don't probe input streams as this will consume them
    return;
  }
  command.ffprobe(inputProbeIndex, function(err, data) {
    command._ffprobeData = data;
  });
}


module.exports = function(proto) {
  /**
   * Emitted just after ffmpeg has been spawned.
   *
   * @event FfmpegCommand#start
   * @param {String} command ffmpeg command line
   */

  /**
   * Emitted when ffmpeg reports progress information
   *
   * @event FfmpegCommand#progress
   * @param {Object} progress progress object
   * @param {Number} progress.frames number of frames transcoded
   * @param {Number} progress.currentFps current processing speed in frames per second
   * @param {Number} progress.currentKbps current output generation speed in kilobytes per second
   * @param {Number} progress.targetSize current output file size
   * @param {String} progress.timemark current video timemark
   * @param {Number} [progress.percent] processing progress (may not be available depending on input)
   */

  /**
   * Emitted when ffmpeg outputs to stderr
   *
   * @event FfmpegCommand#stderr
   * @param {String} line stderr output line
   */

  /**
   * Emitted when ffmpeg reports input codec data
   *
   * @event FfmpegCommand#codecData
   * @param {Object} codecData codec data object
   * @param {String} codecData.format input format name
   * @param {String} codecData.audio input audio codec name
   * @param {String} codecData.audio_details input audio codec parameters
   * @param {String} codecData.video input video codec name
   * @param {String} codecData.video_details input video codec parameters
   */

  /**
   * Emitted when an error happens when preparing or running a command
   *
   * @event FfmpegCommand#error
   * @param {Error} error error object, with optional properties 'inputStreamError' / 'outputStreamError' for errors on their respective streams
   * @param {String|null} stdout ffmpeg stdout, unless outputting to a stream
   * @param {String|null} stderr ffmpeg stderr
   */

  /**
   * Emitted when a command finishes processing
   *
   * @event FfmpegCommand#end
   * @param {Array|String|null} [filenames|stdout] generated filenames when taking screenshots, ffmpeg stdout when not outputting to a stream, null otherwise
   * @param {String|null} stderr ffmpeg stderr
   */


  /**
   * Spawn an ffmpeg process
   *
   * The 'options' argument may contain the following keys:
   * - 'niceness': specify process niceness, ignored on Windows (default: 0)
   * - `cwd`: change working directory
   * - 'captureStdout': capture stdout and pass it to 'endCB' as its 2nd argument (default: false)
   * - 'stdoutLines': override command limit (default: use command limit)
   *
   * The 'processCB' callback, if present, is called as soon as the process is created and
   * receives a nodejs ChildProcess object.  It may not be called at all if an error happens
   * before spawning the process.
   *
   * The 'endCB' callback is called either when an error occurs or when the ffmpeg process finishes.
   *
   * @method FfmpegCommand#_spawnFfmpeg
   * @param {Array} args ffmpeg command line argument list
   * @param {Object} [options] spawn options (see above)
   * @param {Function} [processCB] callback called with process object and stdout/stderr ring buffers when process has been created
   * @param {Function} endCB callback called with error (if applicable) and stdout/stderr ring buffers when process finished
   * @private
   */
  proto._spawnFfmpeg = function(args, options, processCB, endCB) {
    // Enable omitting options
    if (typeof options === 'function') {
      endCB = processCB;
      processCB = options;
      options = {};
    }

    // Enable omitting processCB
    if (typeof endCB === 'undefined') {
      endCB = processCB;
      processCB = function() {};
    }

    var maxLines = 'stdoutLines' in options ? options.stdoutLines : this.options.stdoutLines;

    // Find ffmpeg
    this._getFfmpegPath(function(err, command) {
      if (err) {
        return endCB(err);
      } else if (!command || command.length === 0) {
        return endCB(new Error('Cannot find ffmpeg'));
      }

      // Apply niceness
      if (options.niceness && options.niceness !== 0 && !utils.isWindows) {
        args.unshift('-n', options.niceness, command);
        command = 'nice';
      }

      var stdoutRing = utils.linesRing(maxLines);
      var stdoutClosed = false;

      var stderrRing = utils.linesRing(maxLines);
      var stderrClosed = false;

      // Spawn process
      var ffmpegProc = spawn(command, args, options);

      if (ffmpegProc.stderr) {
        ffmpegProc.stderr.setEncoding('utf8');
      }

      ffmpegProc.on('error', function(err) {
        endCB(err);
      });

      // Ensure we wait for captured streams to end before calling endCB
      var exitError = null;
      function handleExit(err) {
        if (err) {
          exitError = err;
        }

        if (processExited && (stdoutClosed || !options.captureStdout) && stderrClosed) {
          endCB(exitError, stdoutRing, stderrRing);
        }
      }

      // Handle process exit
      var processExited = false;
      ffmpegProc.on('exit', function(code, signal) {
        processExited = true;

        if (signal) {
          handleExit(new Error('ffmpeg was killed with signal ' + signal));
        } else if (code) {
          handleExit(new Error('ffmpeg exited with code ' + code));
        } else {
          handleExit();
        }
      });

      // Capture stdout if specified
      if (options.captureStdout) {
        ffmpegProc.stdout.on('data', function(data) {
          stdoutRing.append(data);
        });

        ffmpegProc.stdout.on('close', function() {
          stdoutRing.close();
          stdoutClosed = true;
          handleExit();
        });
      }

      // Capture stderr if specified
      ffmpegProc.stderr.on('data', function(data) {
        stderrRing.append(data);
      });

      ffmpegProc.stderr.on('close', function() {
        stderrRing.close();
        stderrClosed = true;
        handleExit();
      });

      // Call process callback
      processCB(ffmpegProc, stdoutRing, stderrRing);
    });
  };


  /**
   * Build the argument list for an ffmpeg command
   *
   * @method FfmpegCommand#_getArguments
   * @return argument list
   * @private
   */
  proto._getArguments = function() {
    var complexFilters = this._complexFilters.get();

    var fileOutput = this._outputs.some(function(output) {
      return output.isFile;
    });

    return [].concat(
        // Inputs and input options
        this._inputs.reduce(function(args, input) {
          var source = (typeof input.source === 'string') ? input.source : 'pipe:0';

          // For each input, add input options, then '-i <source>'
          return args.concat(
            input.options.get(),
            ['-i', source]
          );
        }, []),

        // Global options
        this._global.get(),

        // Overwrite if we have file outputs
        fileOutput ? ['-y'] : [],

        // Complex filters
        complexFilters,

        // Outputs, filters and output options
        this._outputs.reduce(function(args, output) {
          var sizeFilters = utils.makeFilterStrings(output.sizeFilters.get());
          var audioFilters = output.audioFilters.get();
          var videoFilters = output.videoFilters.get().concat(sizeFilters);
          var outputArg;

          if (!output.target) {
            outputArg = [];
          } else if (typeof output.target === 'string') {
            outputArg = [output.target];
          } else {
            outputArg = ['pipe:1'];
          }

          return args.concat(
            output.audio.get(),
            audioFilters.length ? ['-filter:a', audioFilters.join(',')] : [],
            output.video.get(),
            videoFilters.length ? ['-filter:v', videoFilters.join(',')] : [],
            output.options.get(),
            outputArg
          );
        }, [])
      );
  };


  /**
   * Prepare execution of an ffmpeg command
   *
   * Checks prerequisites for the execution of the command (codec/format availability, flvtool...),
   * then builds the argument list for ffmpeg and pass them to 'callback'.
   *
   * @method FfmpegCommand#_prepare
   * @param {Function} callback callback with signature (err, args)
   * @param {Boolean} [readMetadata=false] read metadata before processing
   * @private
   */
  proto._prepare = function(callback, readMetadata) {
    var self = this;

    async.waterfall([
      // Check codecs and formats
      function(cb) {
        self._checkCapabilities(cb);
      },

      // Read metadata if required
      function(cb) {
        if (!readMetadata) {
          return cb();
        }

        self.ffprobe(0, function(err, data) {
          if (!err) {
            self._ffprobeData = data;
          }

          cb();
        });
      },

      // Check for flvtool2/flvmeta if necessary
      function(cb) {
        var flvmeta = self._outputs.some(function(output) {
          // Remove flvmeta flag on non-file output
          if (output.flags.flvmeta && !output.isFile) {
            self.logger.warn('Updating flv metadata is only supported for files');
            output.flags.flvmeta = false;
          }

          return output.flags.flvmeta;
        });

        if (flvmeta) {
          self._getFlvtoolPath(function(err) {
            cb(err);
          });
        } else {
          cb();
        }
      },

      // Build argument list
      function(cb) {
        var args;
        try {
          args = self._getArguments();
        } catch(e) {
          return cb(e);
        }

        cb(null, args);
      },

      // Add "-strict experimental" option where needed
      function(args, cb) {
        self.availableEncoders(function(err, encoders) {
          for (var i = 0; i < args.length; i++) {
            if (args[i] === '-acodec' || args[i] === '-vcodec') {
              i++;

              if ((args[i] in encoders) && encoders[args[i]].experimental) {
                args.splice(i + 1, 0, '-strict', 'experimental');
                i += 2;
              }
            }
          }

          cb(null, args);
        });
      }
    ], callback);

    if (!readMetadata) {
      // Read metadata as soon as 'progress' listeners are added

      if (this.listeners('progress').length > 0) {
        // Read metadata in parallel
        runFfprobe(this);
      } else {
        // Read metadata as soon as the first 'progress' listener is added
        this.once('newListener', function(event) {
          if (event === 'progress') {
            runFfprobe(this);
          }
        });
      }
    }
  };


  /**
   * Run ffmpeg command
   *
   * @method FfmpegCommand#run
   * @category Processing
   * @aliases exec,execute
   */
  proto.exec =
  proto.execute =
  proto.run = function() {
    var self = this;

    // Check if at least one output is present
    var outputPresent = this._outputs.some(function(output) {
      return 'target' in output;
    });

    if (!outputPresent) {
      throw new Error('No output specified');
    }

    // Get output stream if any
    var outputStream = this._outputs.filter(function(output) {
      return typeof output.target !== 'string';
    })[0];

    // Get input stream if any
    var inputStream = this._inputs.filter(function(input) {
      return typeof input.source !== 'string';
    })[0];

    // Ensure we send 'end' or 'error' only once
    var ended = false;
    function emitEnd(err, stdout, stderr) {
      if (!ended) {
        ended = true;

        if (err) {
          self.emit('error', err, stdout, stderr);
        } else {
          self.emit('end', stdout, stderr);
        }
      }
    }

    self._prepare(function(err, args) {
      if (err) {
        return emitEnd(err);
      }

      // Run ffmpeg
      self._spawnFfmpeg(
        args,
        {
          captureStdout: !outputStream,
          niceness: self.options.niceness,
          cwd: self.options.cwd,
          windowsHide: true
        }, 

        function processCB(ffmpegProc, stdoutRing, stderrRing) {
          self.ffmpegProc = ffmpegProc;
          self.emit('start', 'ffmpeg ' + args.join(' '));

          // Pipe input stream if any
          if (inputStream) {
            inputStream.source.on('error', function(err) {
              var reportingErr = new Error('Input stream error: ' + err.message);
              reportingErr.inputStreamError = err;
              emitEnd(reportingErr);
              ffmpegProc.kill();
            });

            inputStream.source.resume();
            inputStream.source.pipe(ffmpegProc.stdin);

            // Set stdin error handler on ffmpeg (prevents nodejs catching the error, but
            // ffmpeg will fail anyway, so no need to actually handle anything)
            ffmpegProc.stdin.on('error', function() {});
          }

          // Setup timeout if requested
          if (self.options.timeout) {
            self.processTimer = setTimeout(function() {
              var msg = 'process ran into a timeout (' + self.options.timeout + 's)';

              emitEnd(new Error(msg), stdoutRing.get(), stderrRing.get());
              ffmpegProc.kill();
            }, self.options.timeout * 1000);
          }


          if (outputStream) {
            // Pipe ffmpeg stdout to output stream
            ffmpegProc.stdout.pipe(outputStream.target, outputStream.pipeopts);

            // Handle output stream events
            outputStream.target.on('close', function() {
              self.logger.debug('Output stream closed, scheduling kill for ffmpeg process');

              // Don't kill process yet, to give a chance to ffmpeg to
              // terminate successfully first  This is necessary because
              // under load, the process 'exit' event sometimes happens
              // after the output stream 'close' event.
              setTimeout(function() {
                emitEnd(new Error('Output stream closed'));
                ffmpegProc.kill();
              }, 20);
            });

            outputStream.target.on('error', function(err) {
              self.logger.debug('Output stream error, killing ffmpeg process');
              var reportingErr = new Error('Output stream error: ' + err.message);
              reportingErr.outputStreamError = err;
              emitEnd(reportingErr, stdoutRing.get(), stderrRing.get());
              ffmpegProc.kill('SIGKILL');
            });
          }

          // Setup stderr handling
          if (stderrRing) {

            // 'stderr' event
            if (self.listeners('stderr').length) {
              stderrRing.callback(function(line) {
                self.emit('stderr', line);
              });
            }

            // 'codecData' event
            if (self.listeners('codecData').length) {
              var codecDataSent = false;
              var codecObject = {};

              stderrRing.callback(function(line) {
                if (!codecDataSent)
                  codecDataSent = utils.extractCodecData(self, line, codecObject);
              });
            }

            // 'progress' event
            if (self.listeners('progress').length) {
              stderrRing.callback(function(line) {
                utils.extractProgress(self, line);
              });
            }
          }
        },

        function endCB(err, stdoutRing, stderrRing) {
          clearTimeout(self.processTimer);
          delete self.ffmpegProc;

          if (err) {
            if (err.message.match(/ffmpeg exited with code/)) {
              // Add ffmpeg error message
              err.message += ': ' + utils.extractError(stderrRing.get());
            }

            emitEnd(err, stdoutRing.get(), stderrRing.get());
          } else {
            // Find out which outputs need flv metadata
            var flvmeta = self._outputs.filter(function(output) {
              return output.flags.flvmeta;
            });

            if (flvmeta.length) {
              self._getFlvtoolPath(function(err, flvtool) {
                if (err) {
                  return emitEnd(err);
                }

                async.each(
                  flvmeta,
                  function(output, cb) {
                    spawn(flvtool, ['-U', output.target], {windowsHide: true})
                      .on('error', function(err) {
                        cb(new Error('Error running ' + flvtool + ' on ' + output.target + ': ' + err.message));
                      })
                      .on('exit', function(code, signal) {
                        if (code !== 0 || signal) {
                          cb(
                            new Error(flvtool + ' ' +
                              (signal ? 'received signal ' + signal
                                      : 'exited with code ' + code)) +
                              ' when running on ' + output.target
                          );
                        } else {
                          cb();
                        }
                      });
                  },
                  function(err) {
                    if (err) {
                      emitEnd(err);
                    } else {
                      emitEnd(null, stdoutRing.get(), stderrRing.get());
                    }
                  }
                );
              });
            } else {
              emitEnd(null, stdoutRing.get(), stderrRing.get());
            }
          }
        }
      );
    });

    return this;
  };


  /**
   * Renice current and/or future ffmpeg processes
   *
   * Ignored on Windows platforms.
   *
   * @method FfmpegCommand#renice
   * @category Processing
   *
   * @param {Number} [niceness=0] niceness value between -20 (highest priority) and 20 (lowest priority)
   * @return FfmpegCommand
   */
  proto.renice = function(niceness) {
    if (!utils.isWindows) {
      niceness = niceness || 0;

      if (niceness < -20 || niceness > 20) {
        this.logger.warn('Invalid niceness value: ' + niceness + ', must be between -20 and 20');
      }

      niceness = Math.min(20, Math.max(-20, niceness));
      this.options.niceness = niceness;

      if (this.ffmpegProc) {
        var logger = this.logger;
        var pid = this.ffmpegProc.pid;
        var renice = spawn('renice', [niceness, '-p', pid], {windowsHide: true});

        renice.on('error', function(err) {
          logger.warn('could not renice process ' + pid + ': ' + err.message);
        });

        renice.on('exit', function(code, signal) {
          if (signal) {
            logger.warn('could not renice process ' + pid + ': renice was killed by signal ' + signal);
          } else if (code) {
            logger.warn('could not renice process ' + pid + ': renice exited with ' + code);
          } else {
            logger.info('successfully reniced process ' + pid + ' to ' + niceness + ' niceness');
          }
        });
      }
    }

    return this;
  };


  /**
   * Kill current ffmpeg process, if any
   *
   * @method FfmpegCommand#kill
   * @category Processing
   *
   * @param {String} [signal=SIGKILL] signal name
   * @return FfmpegCommand
   */
  proto.kill = function(signal) {
    if (!this.ffmpegProc) {
      this.logger.warn('No running ffmpeg process, cannot send signal');
    } else {
      this.ffmpegProc.kill(signal || 'SIGKILL');
    }

    return this;
  };
};


/***/ }),

/***/ "./node_modules/fluent-ffmpeg/lib/recipes.js":
/*!***************************************************!*\
  !*** ./node_modules/fluent-ffmpeg/lib/recipes.js ***!
  \***************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
/*jshint node:true*/


var fs = __webpack_require__(/*! fs */ "fs");
var path = __webpack_require__(/*! path */ "path");
var PassThrough = (__webpack_require__(/*! stream */ "stream").PassThrough);
var async = __webpack_require__(/*! async */ "./node_modules/async/lib/async.js");
var utils = __webpack_require__(/*! ./utils */ "./node_modules/fluent-ffmpeg/lib/utils.js");


/*
 * Useful recipes for commands
 */

module.exports = function recipes(proto) {
  /**
   * Execute ffmpeg command and save output to a file
   *
   * @method FfmpegCommand#save
   * @category Processing
   * @aliases saveToFile
   *
   * @param {String} output file path
   * @return FfmpegCommand
   */
  proto.saveToFile =
  proto.save = function(output) {
    this.output(output).run();
    return this;
  };


  /**
   * Execute ffmpeg command and save output to a stream
   *
   * If 'stream' is not specified, a PassThrough stream is created and returned.
   * 'options' will be used when piping ffmpeg output to the output stream
   * (@see http://nodejs.org/api/stream.html#stream_readable_pipe_destination_options)
   *
   * @method FfmpegCommand#pipe
   * @category Processing
   * @aliases stream,writeToStream
   *
   * @param {stream.Writable} [stream] output stream
   * @param {Object} [options={}] pipe options
   * @return Output stream
   */
  proto.writeToStream =
  proto.pipe =
  proto.stream = function(stream, options) {
    if (stream && !('writable' in stream)) {
      options = stream;
      stream = undefined;
    }

    if (!stream) {
      if (process.version.match(/v0\.8\./)) {
        throw new Error('PassThrough stream is not supported on node v0.8');
      }

      stream = new PassThrough();
    }

    this.output(stream, options).run();
    return stream;
  };


  /**
   * Generate images from a video
   *
   * Note: this method makes the command emit a 'filenames' event with an array of
   * the generated image filenames.
   *
   * @method FfmpegCommand#screenshots
   * @category Processing
   * @aliases takeScreenshots,thumbnail,thumbnails,screenshot
   *
   * @param {Number|Object} [config=1] screenshot count or configuration object with
   *   the following keys:
   * @param {Number} [config.count] number of screenshots to take; using this option
   *   takes screenshots at regular intervals (eg. count=4 would take screens at 20%, 40%,
   *   60% and 80% of the video length).
   * @param {String} [config.folder='.'] output folder
   * @param {String} [config.filename='tn.png'] output filename pattern, may contain the following
   *   tokens:
   *   - '%s': offset in seconds
   *   - '%w': screenshot width
   *   - '%h': screenshot height
   *   - '%r': screenshot resolution (same as '%wx%h')
   *   - '%f': input filename
   *   - '%b': input basename (filename w/o extension)
   *   - '%i': index of screenshot in timemark array (can be zero-padded by using it like `%000i`)
   * @param {Number[]|String[]} [config.timemarks] array of timemarks to take screenshots
   *   at; each timemark may be a number of seconds, a '[[hh:]mm:]ss[.xxx]' string or a
   *   'XX%' string.  Overrides 'count' if present.
   * @param {Number[]|String[]} [config.timestamps] alias for 'timemarks'
   * @param {Boolean} [config.fastSeek] use fast seek (less accurate)
   * @param {String} [config.size] screenshot size, with the same syntax as {@link FfmpegCommand#size}
   * @param {String} [folder] output folder (legacy alias for 'config.folder')
   * @return FfmpegCommand
   */
  proto.takeScreenshots =
  proto.thumbnail =
  proto.thumbnails =
  proto.screenshot =
  proto.screenshots = function(config, folder) {
    var self = this;
    var source = this._currentInput.source;
    config = config || { count: 1 };

    // Accept a number of screenshots instead of a config object
    if (typeof config === 'number') {
      config = {
        count: config
      };
    }

    // Accept a second 'folder' parameter instead of config.folder
    if (!('folder' in config)) {
      config.folder = folder || '.';
    }

    // Accept 'timestamps' instead of 'timemarks'
    if ('timestamps' in config) {
      config.timemarks = config.timestamps;
    }

    // Compute timemarks from count if not present
    if (!('timemarks' in config)) {
      if (!config.count) {
        throw new Error('Cannot take screenshots: neither a count nor a timemark list are specified');
      }

      var interval = 100 / (1 + config.count);
      config.timemarks = [];
      for (var i = 0; i < config.count; i++) {
        config.timemarks.push((interval * (i + 1)) + '%');
      }
    }

    // Parse size option
    if ('size' in config) {
      var fixedSize = config.size.match(/^(\d+)x(\d+)$/);
      var fixedWidth = config.size.match(/^(\d+)x\?$/);
      var fixedHeight = config.size.match(/^\?x(\d+)$/);
      var percentSize = config.size.match(/^(\d+)%$/);

      if (!fixedSize && !fixedWidth && !fixedHeight && !percentSize) {
        throw new Error('Invalid size parameter: ' + config.size);
      }
    }

    // Metadata helper
    var metadata;
    function getMetadata(cb) {
      if (metadata) {
        cb(null, metadata);
      } else {
        self.ffprobe(function(err, meta) {
          metadata = meta;
          cb(err, meta);
        });
      }
    }

    async.waterfall([
      // Compute percent timemarks if any
      function computeTimemarks(next) {
        if (config.timemarks.some(function(t) { return ('' + t).match(/^[\d.]+%$/); })) {
          if (typeof source !== 'string') {
            return next(new Error('Cannot compute screenshot timemarks with an input stream, please specify fixed timemarks'));
          }

          getMetadata(function(err, meta) {
            if (err) {
              next(err);
            } else {
              // Select video stream with the highest resolution
              var vstream = meta.streams.reduce(function(biggest, stream) {
                if (stream.codec_type === 'video' && stream.width * stream.height > biggest.width * biggest.height) {
                  return stream;
                } else {
                  return biggest;
                }
              }, { width: 0, height: 0 });

              if (vstream.width === 0) {
                return next(new Error('No video stream in input, cannot take screenshots'));
              }

              var duration = Number(vstream.duration);
              if (isNaN(duration)) {
                duration = Number(meta.format.duration);
              }

              if (isNaN(duration)) {
                return next(new Error('Could not get input duration, please specify fixed timemarks'));
              }

              config.timemarks = config.timemarks.map(function(mark) {
                if (('' + mark).match(/^([\d.]+)%$/)) {
                  return duration * parseFloat(mark) / 100;
                } else {
                  return mark;
                }
              });

              next();
            }
          });
        } else {
          next();
        }
      },

      // Turn all timemarks into numbers and sort them
      function normalizeTimemarks(next) {
        config.timemarks = config.timemarks.map(function(mark) {
          return utils.timemarkToSeconds(mark);
        }).sort(function(a, b) { return a - b; });

        next();
      },

      // Add '_%i' to pattern when requesting multiple screenshots and no variable token is present
      function fixPattern(next) {
        var pattern = config.filename || 'tn.png';

        if (pattern.indexOf('.') === -1) {
          pattern += '.png';
        }

        if (config.timemarks.length > 1 && !pattern.match(/%(s|0*i)/)) {
          var ext = path.extname(pattern);
          pattern = path.join(path.dirname(pattern), path.basename(pattern, ext) + '_%i' + ext);
        }

        next(null, pattern);
      },

      // Replace filename tokens (%f, %b) in pattern
      function replaceFilenameTokens(pattern, next) {
        if (pattern.match(/%[bf]/)) {
          if (typeof source !== 'string') {
            return next(new Error('Cannot replace %f or %b when using an input stream'));
          }

          pattern = pattern
            .replace(/%f/g, path.basename(source))
            .replace(/%b/g, path.basename(source, path.extname(source)));
        }

        next(null, pattern);
      },

      // Compute size if needed
      function getSize(pattern, next) {
        if (pattern.match(/%[whr]/)) {
          if (fixedSize) {
            return next(null, pattern, fixedSize[1], fixedSize[2]);
          }

          getMetadata(function(err, meta) {
            if (err) {
              return next(new Error('Could not determine video resolution to replace %w, %h or %r'));
            }

            var vstream = meta.streams.reduce(function(biggest, stream) {
              if (stream.codec_type === 'video' && stream.width * stream.height > biggest.width * biggest.height) {
                return stream;
              } else {
                return biggest;
              }
            }, { width: 0, height: 0 });

            if (vstream.width === 0) {
              return next(new Error('No video stream in input, cannot replace %w, %h or %r'));
            }

            var width = vstream.width;
            var height = vstream.height;

            if (fixedWidth) {
              height = height * Number(fixedWidth[1]) / width;
              width = Number(fixedWidth[1]);
            } else if (fixedHeight) {
              width = width * Number(fixedHeight[1]) / height;
              height = Number(fixedHeight[1]);
            } else if (percentSize) {
              width = width * Number(percentSize[1]) / 100;
              height = height * Number(percentSize[1]) / 100;
            }

            next(null, pattern, Math.round(width / 2) * 2, Math.round(height / 2) * 2);
          });
        } else {
          next(null, pattern, -1, -1);
        }
      },

      // Replace size tokens (%w, %h, %r) in pattern
      function replaceSizeTokens(pattern, width, height, next) {
        pattern = pattern
          .replace(/%r/g, '%wx%h')
          .replace(/%w/g, width)
          .replace(/%h/g, height);

        next(null, pattern);
      },

      // Replace variable tokens in pattern (%s, %i) and generate filename list
      function replaceVariableTokens(pattern, next) {
        var filenames = config.timemarks.map(function(t, i) {
          return pattern
            .replace(/%s/g, utils.timemarkToSeconds(t))
            .replace(/%(0*)i/g, function(match, padding) {
              var idx = '' + (i + 1);
              return padding.substr(0, Math.max(0, padding.length + 1 - idx.length)) + idx;
            });
        });

        self.emit('filenames', filenames);
        next(null, filenames);
      },

      // Create output directory
      function createDirectory(filenames, next) {
        fs.exists(config.folder, function(exists) {
          if (!exists) {
            fs.mkdir(config.folder, function(err) {
              if (err) {
                next(err);
              } else {
                next(null, filenames);
              }
            });
          } else {
            next(null, filenames);
          }
        });
      }
    ], function runCommand(err, filenames) {
      if (err) {
        return self.emit('error', err);
      }

      var count = config.timemarks.length;
      var split;
      var filters = [split = {
        filter: 'split',
        options: count,
        outputs: []
      }];

      if ('size' in config) {
        // Set size to generate size filters
        self.size(config.size);

        // Get size filters and chain them with 'sizeN' stream names
        var sizeFilters =  self._currentOutput.sizeFilters.get().map(function(f, i) {
          if (i > 0) {
            f.inputs = 'size' + (i - 1);
          }

          f.outputs = 'size' + i;

          return f;
        });

        // Input last size filter output into split filter
        split.inputs = 'size' + (sizeFilters.length - 1);

        // Add size filters in front of split filter
        filters = sizeFilters.concat(filters);

        // Remove size filters
        self._currentOutput.sizeFilters.clear();
      }

      var first = 0;
      for (var i = 0; i < count; i++) {
        var stream = 'screen' + i;
        split.outputs.push(stream);

        if (i === 0) {
          first = config.timemarks[i];
          self.seekInput(first);
        }

        self.output(path.join(config.folder, filenames[i]))
          .frames(1)
          .map(stream);

        if (i > 0) {
          self.seek(config.timemarks[i] - first);
        }
      }

      self.complexFilter(filters);
      self.run();
    });

    return this;
  };


  /**
   * Merge (concatenate) inputs to a single file
   *
   * @method FfmpegCommand#concat
   * @category Processing
   * @aliases concatenate,mergeToFile
   *
   * @param {String|Writable} target output file or writable stream
   * @param {Object} [options] pipe options (only used when outputting to a writable stream)
   * @return FfmpegCommand
   */
  proto.mergeToFile =
  proto.concatenate =
  proto.concat = function(target, options) {
    // Find out which streams are present in the first non-stream input
    var fileInput = this._inputs.filter(function(input) {
      return !input.isStream;
    })[0];

    var self = this;
    this.ffprobe(this._inputs.indexOf(fileInput), function(err, data) {
      if (err) {
        return self.emit('error', err);
      }

      var hasAudioStreams = data.streams.some(function(stream) {
        return stream.codec_type === 'audio';
      });

      var hasVideoStreams = data.streams.some(function(stream) {
        return stream.codec_type === 'video';
      });

      // Setup concat filter and start processing
      self.output(target, options)
        .complexFilter({
          filter: 'concat',
          options: {
            n: self._inputs.length,
            v: hasVideoStreams ? 1 : 0,
            a: hasAudioStreams ? 1 : 0
          }
        })
        .run();
    });

    return this;
  };
};


/***/ }),

/***/ "./node_modules/fluent-ffmpeg/lib/utils.js":
/*!*************************************************!*\
  !*** ./node_modules/fluent-ffmpeg/lib/utils.js ***!
  \*************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
/*jshint node:true*/


var exec = (__webpack_require__(/*! child_process */ "child_process").exec);
var isWindows = (__webpack_require__(/*! os */ "os").platform)().match(/win(32|64)/);
var which = __webpack_require__(/*! which */ "./node_modules/fluent-ffmpeg/node_modules/which/which.js");

var nlRegexp = /\r\n|\r|\n/g;
var streamRegexp = /^\[?(.*?)\]?$/;
var filterEscapeRegexp = /[,]/;
var whichCache = {};

/**
 * Parse progress line from ffmpeg stderr
 *
 * @param {String} line progress line
 * @return progress object
 * @private
 */
function parseProgressLine(line) {
  var progress = {};

  // Remove all spaces after = and trim
  line  = line.replace(/=\s+/g, '=').trim();
  var progressParts = line.split(' ');

  // Split every progress part by "=" to get key and value
  for(var i = 0; i < progressParts.length; i++) {
    var progressSplit = progressParts[i].split('=', 2);
    var key = progressSplit[0];
    var value = progressSplit[1];

    // This is not a progress line
    if(typeof value === 'undefined')
      return null;

    progress[key] = value;
  }

  return progress;
}


var utils = module.exports = {
  isWindows: isWindows,
  streamRegexp: streamRegexp,


  /**
   * Copy an object keys into another one
   *
   * @param {Object} source source object
   * @param {Object} dest destination object
   * @private
   */
  copy: function(source, dest) {
    Object.keys(source).forEach(function(key) {
      dest[key] = source[key];
    });
  },


  /**
   * Create an argument list
   *
   * Returns a function that adds new arguments to the list.
   * It also has the following methods:
   * - clear() empties the argument list
   * - get() returns the argument list
   * - find(arg, count) finds 'arg' in the list and return the following 'count' items, or undefined if not found
   * - remove(arg, count) remove 'arg' in the list as well as the following 'count' items
   *
   * @private
   */
  args: function() {
    var list = [];

    // Append argument(s) to the list
    var argfunc = function() {
      if (arguments.length === 1 && Array.isArray(arguments[0])) {
        list = list.concat(arguments[0]);
      } else {
        list = list.concat([].slice.call(arguments));
      }
    };

    // Clear argument list
    argfunc.clear = function() {
      list = [];
    };

    // Return argument list
    argfunc.get = function() {
      return list;
    };

    // Find argument 'arg' in list, and if found, return an array of the 'count' items that follow it
    argfunc.find = function(arg, count) {
      var index = list.indexOf(arg);
      if (index !== -1) {
        return list.slice(index + 1, index + 1 + (count || 0));
      }
    };

    // Find argument 'arg' in list, and if found, remove it as well as the 'count' items that follow it
    argfunc.remove = function(arg, count) {
      var index = list.indexOf(arg);
      if (index !== -1) {
        list.splice(index, (count || 0) + 1);
      }
    };

    // Clone argument list
    argfunc.clone = function() {
      var cloned = utils.args();
      cloned(list);
      return cloned;
    };

    return argfunc;
  },


  /**
   * Generate filter strings
   *
   * @param {String[]|Object[]} filters filter specifications. When using objects,
   *   each must have the following properties:
   * @param {String} filters.filter filter name
   * @param {String|Array} [filters.inputs] (array of) input stream specifier(s) for the filter,
   *   defaults to ffmpeg automatically choosing the first unused matching streams
   * @param {String|Array} [filters.outputs] (array of) output stream specifier(s) for the filter,
   *   defaults to ffmpeg automatically assigning the output to the output file
   * @param {Object|String|Array} [filters.options] filter options, can be omitted to not set any options
   * @return String[]
   * @private
   */
  makeFilterStrings: function(filters) {
    return filters.map(function(filterSpec) {
      if (typeof filterSpec === 'string') {
        return filterSpec;
      }

      var filterString = '';

      // Filter string format is:
      // [input1][input2]...filter[output1][output2]...
      // The 'filter' part can optionaly have arguments:
      //   filter=arg1:arg2:arg3
      //   filter=arg1=v1:arg2=v2:arg3=v3

      // Add inputs
      if (Array.isArray(filterSpec.inputs)) {
        filterString += filterSpec.inputs.map(function(streamSpec) {
          return streamSpec.replace(streamRegexp, '[$1]');
        }).join('');
      } else if (typeof filterSpec.inputs === 'string') {
        filterString += filterSpec.inputs.replace(streamRegexp, '[$1]');
      }

      // Add filter
      filterString += filterSpec.filter;

      // Add options
      if (filterSpec.options) {
        if (typeof filterSpec.options === 'string' || typeof filterSpec.options === 'number') {
          // Option string
          filterString += '=' + filterSpec.options;
        } else if (Array.isArray(filterSpec.options)) {
          // Option array (unnamed options)
          filterString += '=' + filterSpec.options.map(function(option) {
            if (typeof option === 'string' && option.match(filterEscapeRegexp)) {
              return '\'' + option + '\'';
            } else {
              return option;
            }
          }).join(':');
        } else if (Object.keys(filterSpec.options).length) {
          // Option object (named options)
          filterString += '=' + Object.keys(filterSpec.options).map(function(option) {
            var value = filterSpec.options[option];

            if (typeof value === 'string' && value.match(filterEscapeRegexp)) {
              value = '\'' + value + '\'';
            }

            return option + '=' + value;
          }).join(':');
        }
      }

      // Add outputs
      if (Array.isArray(filterSpec.outputs)) {
        filterString += filterSpec.outputs.map(function(streamSpec) {
          return streamSpec.replace(streamRegexp, '[$1]');
        }).join('');
      } else if (typeof filterSpec.outputs === 'string') {
        filterString += filterSpec.outputs.replace(streamRegexp, '[$1]');
      }

      return filterString;
    });
  },


  /**
   * Search for an executable
   *
   * Uses 'which' or 'where' depending on platform
   *
   * @param {String} name executable name
   * @param {Function} callback callback with signature (err, path)
   * @private
   */
  which: function(name, callback) {
    if (name in whichCache) {
      return callback(null, whichCache[name]);
    }

    which(name, function(err, result){
      if (err) {
        // Treat errors as not found
        return callback(null, whichCache[name] = '');
      }
      callback(null, whichCache[name] = result);
    });
  },


  /**
   * Convert a [[hh:]mm:]ss[.xxx] timemark into seconds
   *
   * @param {String} timemark timemark string
   * @return Number
   * @private
   */
  timemarkToSeconds: function(timemark) {
    if (typeof timemark === 'number') {
      return timemark;
    }

    if (timemark.indexOf(':') === -1 && timemark.indexOf('.') >= 0) {
      return Number(timemark);
    }

    var parts = timemark.split(':');

    // add seconds
    var secs = Number(parts.pop());

    if (parts.length) {
      // add minutes
      secs += Number(parts.pop()) * 60;
    }

    if (parts.length) {
      // add hours
      secs += Number(parts.pop()) * 3600;
    }

    return secs;
  },


  /**
   * Extract codec data from ffmpeg stderr and emit 'codecData' event if appropriate
   * Call it with an initially empty codec object once with each line of stderr output until it returns true
   *
   * @param {FfmpegCommand} command event emitter
   * @param {String} stderrLine ffmpeg stderr output line
   * @param {Object} codecObject object used to accumulate codec data between calls
   * @return {Boolean} true if codec data is complete (and event was emitted), false otherwise
   * @private
   */
  extractCodecData: function(command, stderrLine, codecsObject) {
    var inputPattern = /Input #[0-9]+, ([^ ]+),/;
    var durPattern = /Duration\: ([^,]+)/;
    var audioPattern = /Audio\: (.*)/;
    var videoPattern = /Video\: (.*)/;

    if (!('inputStack' in codecsObject)) {
      codecsObject.inputStack = [];
      codecsObject.inputIndex = -1;
      codecsObject.inInput = false;
    }

    var inputStack = codecsObject.inputStack;
    var inputIndex = codecsObject.inputIndex;
    var inInput = codecsObject.inInput;

    var format, dur, audio, video;

    if (format = stderrLine.match(inputPattern)) {
      inInput = codecsObject.inInput = true;
      inputIndex = codecsObject.inputIndex = codecsObject.inputIndex + 1;

      inputStack[inputIndex] = { format: format[1], audio: '', video: '', duration: '' };
    } else if (inInput && (dur = stderrLine.match(durPattern))) {
      inputStack[inputIndex].duration = dur[1];
    } else if (inInput && (audio = stderrLine.match(audioPattern))) {
      audio = audio[1].split(', ');
      inputStack[inputIndex].audio = audio[0];
      inputStack[inputIndex].audio_details = audio;
    } else if (inInput && (video = stderrLine.match(videoPattern))) {
      video = video[1].split(', ');
      inputStack[inputIndex].video = video[0];
      inputStack[inputIndex].video_details = video;
    } else if (/Output #\d+/.test(stderrLine)) {
      inInput = codecsObject.inInput = false;
    } else if (/Stream mapping:|Press (\[q\]|ctrl-c) to stop/.test(stderrLine)) {
      command.emit.apply(command, ['codecData'].concat(inputStack));
      return true;
    }

    return false;
  },


  /**
   * Extract progress data from ffmpeg stderr and emit 'progress' event if appropriate
   *
   * @param {FfmpegCommand} command event emitter
   * @param {String} stderrLine ffmpeg stderr data
   * @private
   */
  extractProgress: function(command, stderrLine) {
    var progress = parseProgressLine(stderrLine);

    if (progress) {
      // build progress report object
      var ret = {
        frames: parseInt(progress.frame, 10),
        currentFps: parseInt(progress.fps, 10),
        currentKbps: progress.bitrate ? parseFloat(progress.bitrate.replace('kbits/s', '')) : 0,
        targetSize: parseInt(progress.size || progress.Lsize, 10),
        timemark: progress.time
      };

      // calculate percent progress using duration
      if (command._ffprobeData && command._ffprobeData.format && command._ffprobeData.format.duration) {
        var duration = Number(command._ffprobeData.format.duration);
        if (!isNaN(duration))
          ret.percent = (utils.timemarkToSeconds(ret.timemark) / duration) * 100;
      }
      command.emit('progress', ret);
    }
  },


  /**
   * Extract error message(s) from ffmpeg stderr
   *
   * @param {String} stderr ffmpeg stderr data
   * @return {String}
   * @private
   */
  extractError: function(stderr) {
    // Only return the last stderr lines that don't start with a space or a square bracket
    return stderr.split(nlRegexp).reduce(function(messages, message) {
      if (message.charAt(0) === ' ' || message.charAt(0) === '[') {
        return [];
      } else {
        messages.push(message);
        return messages;
      }
    }, []).join('\n');
  },


  /**
   * Creates a line ring buffer object with the following methods:
   * - append(str) : appends a string or buffer
   * - get() : returns the whole string
   * - close() : prevents further append() calls and does a last call to callbacks
   * - callback(cb) : calls cb for each line (incl. those already in the ring)
   *
   * @param {Number} maxLines maximum number of lines to store (<= 0 for unlimited)
   */
  linesRing: function(maxLines) {
    var cbs = [];
    var lines = [];
    var current = null;
    var closed = false
    var max = maxLines - 1;

    function emit(line) {
      cbs.forEach(function(cb) { cb(line); });
    }

    return {
      callback: function(cb) {
        lines.forEach(function(l) { cb(l); });
        cbs.push(cb);
      },

      append: function(str) {
        if (closed) return;
        if (str instanceof Buffer) str = '' + str;
        if (!str || str.length === 0) return;

        var newLines = str.split(nlRegexp);

        if (newLines.length === 1) {
          if (current !== null) {
            current = current + newLines.shift();
          } else {
            current = newLines.shift();
          }
        } else {
          if (current !== null) {
            current = current + newLines.shift();
            emit(current);
            lines.push(current);
          }

          current = newLines.pop();

          newLines.forEach(function(l) {
            emit(l);
            lines.push(l);
          });

          if (max > -1 && lines.length > max) {
            lines.splice(0, lines.length - max);
          }
        }
      },

      get: function() {
        if (current !== null) {
          return lines.concat([current]).join('\n');
        } else {
          return lines.join('\n');
        }
      },

      close: function() {
        if (closed) return;

        if (current !== null) {
          emit(current);
          lines.push(current);

          if (max > -1 && lines.length > max) {
            lines.shift();
          }

          current = null;
        }

        closed = true;
      }
    };
  }
};


/***/ }),

/***/ "./node_modules/fluent-ffmpeg/node_modules/which/which.js":
/*!****************************************************************!*\
  !*** ./node_modules/fluent-ffmpeg/node_modules/which/which.js ***!
  \****************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = which
which.sync = whichSync

var isWindows = process.platform === 'win32' ||
    process.env.OSTYPE === 'cygwin' ||
    process.env.OSTYPE === 'msys'

var path = __webpack_require__(/*! path */ "path")
var COLON = isWindows ? ';' : ':'
var isexe = __webpack_require__(/*! isexe */ "./node_modules/isexe/index.js")

function getNotFoundError (cmd) {
  var er = new Error('not found: ' + cmd)
  er.code = 'ENOENT'

  return er
}

function getPathInfo (cmd, opt) {
  var colon = opt.colon || COLON
  var pathEnv = opt.path || process.env.PATH || ''
  var pathExt = ['']

  pathEnv = pathEnv.split(colon)

  var pathExtExe = ''
  if (isWindows) {
    pathEnv.unshift(process.cwd())
    pathExtExe = (opt.pathExt || process.env.PATHEXT || '.EXE;.CMD;.BAT;.COM')
    pathExt = pathExtExe.split(colon)


    // Always test the cmd itself first.  isexe will check to make sure
    // it's found in the pathExt set.
    if (cmd.indexOf('.') !== -1 && pathExt[0] !== '')
      pathExt.unshift('')
  }

  // If it has a slash, then we don't bother searching the pathenv.
  // just check the file itself, and that's it.
  if (cmd.match(/\//) || isWindows && cmd.match(/\\/))
    pathEnv = ['']

  return {
    env: pathEnv,
    ext: pathExt,
    extExe: pathExtExe
  }
}

function which (cmd, opt, cb) {
  if (typeof opt === 'function') {
    cb = opt
    opt = {}
  }

  var info = getPathInfo(cmd, opt)
  var pathEnv = info.env
  var pathExt = info.ext
  var pathExtExe = info.extExe
  var found = []

  ;(function F (i, l) {
    if (i === l) {
      if (opt.all && found.length)
        return cb(null, found)
      else
        return cb(getNotFoundError(cmd))
    }

    var pathPart = pathEnv[i]
    if (pathPart.charAt(0) === '"' && pathPart.slice(-1) === '"')
      pathPart = pathPart.slice(1, -1)

    var p = path.join(pathPart, cmd)
    if (!pathPart && (/^\.[\\\/]/).test(cmd)) {
      p = cmd.slice(0, 2) + p
    }
    ;(function E (ii, ll) {
      if (ii === ll) return F(i + 1, l)
      var ext = pathExt[ii]
      isexe(p + ext, { pathExt: pathExtExe }, function (er, is) {
        if (!er && is) {
          if (opt.all)
            found.push(p + ext)
          else
            return cb(null, p + ext)
        }
        return E(ii + 1, ll)
      })
    })(0, pathExt.length)
  })(0, pathEnv.length)
}

function whichSync (cmd, opt) {
  opt = opt || {}

  var info = getPathInfo(cmd, opt)
  var pathEnv = info.env
  var pathExt = info.ext
  var pathExtExe = info.extExe
  var found = []

  for (var i = 0, l = pathEnv.length; i < l; i ++) {
    var pathPart = pathEnv[i]
    if (pathPart.charAt(0) === '"' && pathPart.slice(-1) === '"')
      pathPart = pathPart.slice(1, -1)

    var p = path.join(pathPart, cmd)
    if (!pathPart && /^\.[\\\/]/.test(cmd)) {
      p = cmd.slice(0, 2) + p
    }
    for (var j = 0, ll = pathExt.length; j < ll; j ++) {
      var cur = p + pathExt[j]
      var is
      try {
        is = isexe.sync(cur, { pathExt: pathExtExe })
        if (is) {
          if (opt.all)
            found.push(cur)
          else
            return cur
        }
      } catch (ex) {}
    }
  }

  if (opt.all && found.length)
    return found

  if (opt.nothrow)
    return null

  throw getNotFoundError(cmd)
}


/***/ }),

/***/ "./node_modules/isexe/index.js":
/*!*************************************!*\
  !*** ./node_modules/isexe/index.js ***!
  \*************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var fs = __webpack_require__(/*! fs */ "fs")
var core
if (process.platform === 'win32' || global.TESTING_WINDOWS) {
  core = __webpack_require__(/*! ./windows.js */ "./node_modules/isexe/windows.js")
} else {
  core = __webpack_require__(/*! ./mode.js */ "./node_modules/isexe/mode.js")
}

module.exports = isexe
isexe.sync = sync

function isexe (path, options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = {}
  }

  if (!cb) {
    if (typeof Promise !== 'function') {
      throw new TypeError('callback not provided')
    }

    return new Promise(function (resolve, reject) {
      isexe(path, options || {}, function (er, is) {
        if (er) {
          reject(er)
        } else {
          resolve(is)
        }
      })
    })
  }

  core(path, options || {}, function (er, is) {
    // ignore EACCES because that just means we aren't allowed to run it
    if (er) {
      if (er.code === 'EACCES' || options && options.ignoreErrors) {
        er = null
        is = false
      }
    }
    cb(er, is)
  })
}

function sync (path, options) {
  // my kingdom for a filtered catch
  try {
    return core.sync(path, options || {})
  } catch (er) {
    if (options && options.ignoreErrors || er.code === 'EACCES') {
      return false
    } else {
      throw er
    }
  }
}


/***/ }),

/***/ "./node_modules/isexe/mode.js":
/*!************************************!*\
  !*** ./node_modules/isexe/mode.js ***!
  \************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = isexe
isexe.sync = sync

var fs = __webpack_require__(/*! fs */ "fs")

function isexe (path, options, cb) {
  fs.stat(path, function (er, stat) {
    cb(er, er ? false : checkStat(stat, options))
  })
}

function sync (path, options) {
  return checkStat(fs.statSync(path), options)
}

function checkStat (stat, options) {
  return stat.isFile() && checkMode(stat, options)
}

function checkMode (stat, options) {
  var mod = stat.mode
  var uid = stat.uid
  var gid = stat.gid

  var myUid = options.uid !== undefined ?
    options.uid : process.getuid && process.getuid()
  var myGid = options.gid !== undefined ?
    options.gid : process.getgid && process.getgid()

  var u = parseInt('100', 8)
  var g = parseInt('010', 8)
  var o = parseInt('001', 8)
  var ug = u | g

  var ret = (mod & o) ||
    (mod & g) && gid === myGid ||
    (mod & u) && uid === myUid ||
    (mod & ug) && myUid === 0

  return ret
}


/***/ }),

/***/ "./node_modules/isexe/windows.js":
/*!***************************************!*\
  !*** ./node_modules/isexe/windows.js ***!
  \***************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = isexe
isexe.sync = sync

var fs = __webpack_require__(/*! fs */ "fs")

function checkPathExt (path, options) {
  var pathext = options.pathExt !== undefined ?
    options.pathExt : process.env.PATHEXT

  if (!pathext) {
    return true
  }

  pathext = pathext.split(';')
  if (pathext.indexOf('') !== -1) {
    return true
  }
  for (var i = 0; i < pathext.length; i++) {
    var p = pathext[i].toLowerCase()
    if (p && path.substr(-p.length).toLowerCase() === p) {
      return true
    }
  }
  return false
}

function checkStat (stat, path, options) {
  if (!stat.isSymbolicLink() && !stat.isFile()) {
    return false
  }
  return checkPathExt(path, options)
}

function isexe (path, options, cb) {
  fs.stat(path, function (er, stat) {
    cb(er, er ? false : checkStat(stat, path, options))
  })
}

function sync (path, options) {
  return checkStat(fs.statSync(path), path, options)
}


/***/ }),

/***/ "child_process":
/*!********************************!*\
  !*** external "child_process" ***!
  \********************************/
/***/ ((module) => {

"use strict";
module.exports = require("child_process");

/***/ }),

/***/ "electron":
/*!***************************!*\
  !*** external "electron" ***!
  \***************************/
/***/ ((module) => {

"use strict";
module.exports = require("electron");

/***/ }),

/***/ "events":
/*!*************************!*\
  !*** external "events" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("events");

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ "net":
/*!**********************!*\
  !*** external "net" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("net");

/***/ }),

/***/ "node:fs":
/*!**************************!*\
  !*** external "node:fs" ***!
  \**************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:fs");

/***/ }),

/***/ "node:path":
/*!****************************!*\
  !*** external "node:path" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:path");

/***/ }),

/***/ "os":
/*!*********************!*\
  !*** external "os" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = require("os");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ }),

/***/ "stream":
/*!*************************!*\
  !*** external "stream" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("stream");

/***/ }),

/***/ "tty":
/*!**********************!*\
  !*** external "tty" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("tty");

/***/ }),

/***/ "util":
/*!***********************!*\
  !*** external "util" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("util");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!*********************!*\
  !*** ./src/main.js ***!
  \*********************/
const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  session,
  protocol
} = __webpack_require__(/*! electron */ "electron");
const fs = __webpack_require__(/*! node:fs */ "node:fs");
const path = __webpack_require__(/*! node:path */ "node:path");

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (__webpack_require__(/*! electron-squirrel-startup */ "./node_modules/electron-squirrel-startup/index.js")) {
  app.quit();
}
let mainWindow;

// Register custom protocol before app is ready
protocol.registerSchemesAsPrivileged([{
  scheme: 'local-media',
  privileges: {
    standard: true,
    secure: true,
    stream: true,
    supportFetchAPI: true,
    corsEnabled: true
  }
}]);
const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      preload: '/Users/ethan/Desktop/Github/Gauntlet/ClipForge/ClipForge/.webpack/renderer/main_window/preload.js',
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Configure CSP to allow loading local media files
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = {
      ...details.responseHeaders
    };
    // Remove any existing CSP header regardless of case to avoid duplicates
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === 'content-security-policy') {
        delete headers[key];
      }
    }
    const csp = "default-src 'self' 'unsafe-inline' data:; " + "media-src 'self' local-media: file: data: blob:; " + "img-src 'self' local-media: file: data: blob:; " + "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " + "style-src 'self' 'unsafe-inline';";
    headers['Content-Security-Policy'] = [csp];
    if (details.resourceType === 'mainFrame') {
      console.log('[CSP] Applied CSP to mainFrame:', csp);
    }
    callback({
      responseHeaders: headers
    });
  });

  // and load the index.html of the app.
  mainWindow.loadURL('http://localhost:3000/main_window/index.html');

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// Import fileManager and mediaProcessor
const fileManager = __webpack_require__(/*! ../electron/fileManager */ "./electron/fileManager.js");
const mediaProcessor = __webpack_require__(/*! ../electron/mediaProcessor */ "./electron/mediaProcessor.js");

// Register IPC handlers
ipcMain.handle('read-metadata', async (event, filePath) => {
  try {
    console.log('[IPC] read-metadata request received for:', filePath);
    const metadata = await fileManager.getMetadata(filePath);
    console.log('[IPC] Metadata extracted successfully, returning to renderer');
    return {
      success: true,
      data: metadata
    };
  } catch (err) {
    console.error('[IPC] Error reading metadata:', {
      errorType: err.message,
      userMessage: err.userMessage,
      filePath
    });

    // Return error info to renderer instead of throwing
    // This gives the UI more control over error handling
    return {
      success: false,
      error: {
        type: err.message || 'UNKNOWN_ERROR',
        message: err.userMessage || 'Failed to read video file',
        details: err.details || err.message
      }
    };
  }
});
ipcMain.handle('select-file', async event => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [{
      name: 'Videos',
      extensions: ['mp4', 'mov', 'webm']
    }, {
      name: 'All Files',
      extensions: ['*']
    }]
  });
  if (result.canceled) {
    return [];
  } else {
    return result.filePaths;
  }
});
ipcMain.handle('export-timeline', async (event, {
  clips,
  outputPath
}) => {
  try {
    console.log('[IPC] export-timeline request received', {
      clipsCount: clips.length,
      outputPath
    });
    await mediaProcessor.exportTimeline(clips, outputPath, progress => {
      // Send progress updates to renderer
      mainWindow.webContents.send('export-progress', progress);
    });
    console.log('[IPC] Export completed successfully');
    return {
      success: true,
      outputPath
    };
  } catch (err) {
    console.error('[IPC] Export failed:', {
      errorType: err.message,
      userMessage: err.userMessage,
      outputPath
    });

    // Return error info to renderer instead of throwing
    return {
      success: false,
      error: {
        type: err.message || 'EXPORT_FAILED',
        message: err.userMessage || 'Export failed',
        details: err.details || err.message
      }
    };
  }
});
ipcMain.handle('select-save-location', async () => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Video As',
      defaultPath: 'ClipForge_Export.mp4',
      filters: [{
        name: 'MP4 Video',
        extensions: ['mp4']
      }, {
        name: 'All Files',
        extensions: ['*']
      }]
    });
    if (result.canceled) {
      return {
        canceled: true
      };
    }
    return {
      canceled: false,
      filePath: result.filePath
    };
  } catch (err) {
    console.error('[IPC] Save dialog error:', err);
    return {
      canceled: true,
      error: err.message
    };
  }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Register handler for local-media:// protocol
  try {
    protocol.registerFileProtocol('local-media', (request, callback) => {
      const url = request.url || '';
      const filePath = decodeURIComponent(url.replace('local-media://', ''));
      const exists = fs.existsSync(filePath);
      console.log('[Protocol][local-media] Request', {
        url,
        filePath,
        exists
      });
      if (!exists) {
        console.error('[Protocol][local-media] File does not exist', filePath);
      }
      callback({
        path: filePath
      });
    });
    console.log('[Protocol][local-media] Protocol registered');
  } catch (e) {
    console.error('[Protocol][local-media] Registration failed', e);
  }

  // Test FFmpeg availability
  try {
    const ffmpeg = __webpack_require__(/*! fluent-ffmpeg */ "./node_modules/fluent-ffmpeg/index.js");
    const {
      getFFmpegPath,
      getFFprobePath
    } = __webpack_require__(/*! ../electron/utils/ffmpegPath */ "./electron/utils/ffmpegPath.js");
    const ffmpegPath = getFFmpegPath();
    const ffprobePath = getFFprobePath();
    console.log('[FFmpeg] Resolved binary paths', {
      ffmpegPath,
      ffprobePath
    });
    ffmpeg.setFfmpegPath(ffmpegPath);
    ffmpeg.setFfprobePath(ffprobePath);
    console.log('[FFmpeg] Paths configured successfully');

    // Quick test
    ffmpeg.getAvailableFormats((err, formats) => {
      if (err) {
        console.error('[FFmpeg] Availability check failed', {
          message: err.message,
          code: err.code,
          errno: err.errno,
          path: err.path,
          spawnargs: err.spawnargs
        });
        return;
      }
      const totalFormats = Object.keys(formats).length;
      const sample = Object.keys(formats).slice(0, 5);
      console.log('[FFmpeg] Formats available', totalFormats);
      console.debug('[FFmpeg] Sample formats', sample);
    });
  } catch (err) {
    console.error('[FFmpeg] Setup failed', {
      message: err.message,
      stack: err.stack,
      code: err.code
    });
  }
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
})();

module.exports = __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=index.js.map