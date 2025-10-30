const ffmpeg = require('fluent-ffmpeg');
const { getFfmpegBinaryPath, getFfprobeBinaryPath } = require('./utils/ffmpegPath');
const fs = require('fs');
const path = require('path');
const os = require('os');

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
  return new Promise((_, reject) => 
    setTimeout(() => reject(new Error('TIMEOUT')), ms)
  );
}

/**
 * Extract trimmed segment from a clip with resolution normalization
 * @param {Object} clip - Clip object with filePath, trimStart, trimEnd
 * @param {string} outputPath - Path for the trimmed segment
 * @param {Object} targetResolution - Target resolution {width, height}
 * @param {Object} bitrateSettings - Bitrate settings {videoBitrate, maxRate, bufferSize}
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<void>}
 */
async function extractTrimmedSegment(clip, outputPath, targetResolution, bitrateSettings, onProgress) {
  return new Promise((resolve, reject) => {
    const trimDuration = clip.trimEnd - clip.trimStart;
    let lastProgress = 0;
    
    console.log(`[Export] Extracting segment: ${clip.fileName} (${clip.trimStart}s - ${clip.trimEnd}s)`);
    
    ffmpeg(clip.filePath)
      .on('start', (cmdLine) => {
        console.log('[Export] FFmpeg command:', cmdLine);
      })
      .on('stderr', (line) => {
        console.debug('[Export][stderr]', line.trim());
      })
      .on('progress', (progress) => {
        const percent = Math.min(Math.round(progress.percent || 0), 100);
        // Only report meaningful progress increases
        if (percent > lastProgress + 2) {
          lastProgress = percent;
          onProgress(percent);
        }
      })
      .on('end', () => {
        console.log('[Export] Segment extraction complete:', outputPath);
        resolve();
      })
      .on('error', (err) => {
        console.error('[Export] Segment extraction failed:', err.message);
        reject(err);
      })
      // Use input seeking for accuracy, then output seeking for precision
      .seekInput(clip.trimStart)
      .setDuration(trimDuration)
      // Video filter: scale + pad + reset PTS to start at 0
      .outputOptions([
        '-vf', 
        generateScaleFilter(targetResolution) + ',setpts=PTS-STARTPTS'
      ])
      // Audio filter: reset PTS to start at 0 and ensure sync
      .outputOptions(['-af', 'asetpts=PTS-STARTPTS'])
      // Video encoding with bitrate settings
      .outputOptions([
        '-c:v', 'libx264', 
        '-preset', 'fast', 
        '-b:v', `${bitrateSettings.videoBitrate}k`,
        '-maxrate', `${bitrateSettings.maxRate}k`,
        '-bufsize', `${bitrateSettings.bufferSize}k`
      ])
      // Audio: use PCM (no encoder delay) to avoid priming/gaps between segments
      .outputOptions(['-c:a', 'pcm_s16le', '-ar', '48000', '-ac', '2'])
      // Force constant frame rate at 30fps
      .outputOptions(['-r', '30', '-vsync', 'cfr'])
      // Generate proper timestamps and fix any A/V sync issues
      .outputOptions(['-fflags', '+genpts', '-async', '1'])
      // Ensure proper stream mapping
      .outputOptions(['-map', '0:v:0', '-map', '0:a:0?'])
      .output(outputPath)
      .run();
  });
}


/**
 * Concatenate segments into final output using filter_complex
 * This approach is more robust than concat demuxer for segments with different properties
 * @param {string[]} segmentPaths - Array of segment file paths
 * @param {string} outputPath - Final output path
 * @param {Object} bitrateSettings - Bitrate settings {videoBitrate, maxRate, bufferSize}
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<void>}
 */
async function concatenateSegments(segmentPaths, outputPath, bitrateSettings, onProgress) {
  return new Promise((resolve, reject) => {
    let lastProgress = 0;
    
    // Build filter_complex for concatenation
    // Since segments are already normalized, we just concatenate them directly
    const filterComplex = segmentPaths.map((_, index) => `[${index}:v][${index}:a]`).join('') +
      `concat=n=${segmentPaths.length}:v=1:a=1[vcat][acat]`;
    
    console.log('[Export] Using filter_complex concatenation');
    console.log('[Export] Filter:', filterComplex);
    console.log('[Export] Segments to concatenate:', segmentPaths.length);
    
    let ffmpegCmd = ffmpeg();
    
    // Add all segment inputs
    segmentPaths.forEach(segmentPath => {
      ffmpegCmd = ffmpegCmd.input(segmentPath);
    });
    
    ffmpegCmd
      .on('start', (cmdLine) => {
        console.log('[Export] Concat command:', cmdLine);
        // Report initial progress when concatenation starts
        onProgress(0);
      })
      .on('stderr', (line) => {
        console.debug('[Export][concat stderr]', line.trim());
      })
      .on('progress', (progress) => {
        const percent = Math.min(Math.round(progress.percent || 0), 100); // Cap at 100%
        // Only report progress if it's a meaningful increase (at least 3%)
        if (percent > lastProgress + 2) {
          lastProgress = percent;
          onProgress(percent);
        }
      })
      .on('end', () => {
        console.log('[Export] Concatenation complete');
        // Ensure we report 100% completion
        onProgress(100);
        resolve();
      })
      .on('error', (err) => {
        console.error('[Export] Concatenation failed:', err.message);
        reject(err);
      })
      .complexFilter(filterComplex)
      // Map concatenated outputs
      .outputOptions(['-map', '[vcat]', '-map', '[acat]'])
      // Final encode: h264 + AAC with bitrate settings
      .outputOptions([
        '-c:v', 'libx264', 
        '-preset', 'fast', 
        '-b:v', `${bitrateSettings.videoBitrate}k`,
        '-maxrate', `${bitrateSettings.maxRate}k`,
        '-bufsize', `${bitrateSettings.bufferSize}k`
      ])
      .outputOptions(['-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2'])
      .outputOptions(['-r', '30'])
      // Ensure proper timing and avoid any PTS issues
      .outputOptions(['-fflags', '+genpts', '-async', '1'])
      .output(outputPath)
      .run();
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
 * Get resolution dimensions for a given resolution preset
 * @param {string} resolution - Resolution preset ('source', '720p', '1080p', '480p')
 * @returns {Object} Resolution dimensions {width, height}
 */
function getResolutionDimensions(resolution) {
  switch (resolution) {
    case '720p': return { width: 1280, height: 720 };
    case '1080p': return { width: 1920, height: 1080 };
    case '480p': return { width: 854, height: 480 };
    case 'source': return null; // Will be determined from clips
    default: return null;
  }
}

/**
 * Get bitrate settings for a given resolution and quality
 * @param {string} resolution - Resolution preset
 * @param {string} quality - Quality preset ('high', 'medium', 'low')
 * @returns {Object} Bitrate settings {videoBitrate, maxRate, bufferSize}
 */
function getBitrateSettings(resolution, quality) {
  const qualityMultipliers = {
    high: 1.0,
    medium: 0.7,
    low: 0.5
  };
  
  const multiplier = qualityMultipliers[quality] || 1.0;
  
  // Base bitrates for different resolutions
  const baseBitrates = {
    '480p': { video: 2000, maxRate: 2500, bufferSize: 5000 },
    '720p': { video: 5000, maxRate: 6250, bufferSize: 12500 },
    '1080p': { video: 8000, maxRate: 10000, bufferSize: 20000 },
    'source': { video: 5000, maxRate: 6250, bufferSize: 12500 } // Default fallback
  };
  
  const base = baseBitrates[resolution] || baseBitrates['source'];
  
  return {
    videoBitrate: Math.round(base.video * multiplier),
    maxRate: Math.round(base.maxRate * multiplier),
    bufferSize: Math.round(base.bufferSize * multiplier)
  };
}

/**
 * Generate FFmpeg scale filter for resolution conversion
 * @param {Object} targetResolution - Target resolution {width, height}
 * @returns {string} FFmpeg scale filter string
 */
function generateScaleFilter(targetResolution) {
  if (!targetResolution) return null;
  
  const { width, height } = targetResolution;
  return `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`;
}

/**
 * Export timeline to MP4
 * @param {Array} clips - Array of clip objects
 * @param {string} outputPath - Output file path
 * @param {Function} onProgress - Progress callback (0-100)
 * @param {Object} options - Export options {resolution, quality}
 * @returns {Promise<string>} Output path on success
 */
async function exportTimeline(clips, outputPath, onProgress = () => {}, options = {}) {
  if (!clips || clips.length === 0) {
    throw new Error('INVALID_CLIPS');
  }

  const { resolution = 'source', quality = 'high' } = options;
  
  console.log('[Export] ========== Starting timeline export ==========');
  console.log('[Export] Clips count:', clips.length);
  console.log('[Export] Output path:', outputPath);
  console.log('[Export] Resolution:', resolution);
  console.log('[Export] Quality:', quality);

  // Sort clips by order
  const sortedClips = [...clips].sort((a, b) => a.order - b.order);
  console.log('[Export] Sorted clips by order:', sortedClips.map(c => ({ name: c.fileName, order: c.order })));

  // Determine target resolution
  let targetResolution;
  if (resolution === 'source') {
    // Use the highest resolution among all clips
    targetResolution = sortedClips.reduce((max, clip) => {
      const clipPixels = clip.width * clip.height;
      const maxPixels = max.width * max.height;
      return clipPixels > maxPixels ? { width: clip.width, height: clip.height } : max;
    }, { width: sortedClips[0].width, height: sortedClips[0].height });
  } else {
    // Use the specified resolution preset
    targetResolution = getResolutionDimensions(resolution);
  }
  
  console.log('[Export] Target resolution:', targetResolution);

  // Get bitrate settings
  const bitrateSettings = getBitrateSettings(resolution, quality);
  console.log('[Export] Bitrate settings:', bitrateSettings);

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
      const segmentStartProgress = 5 + (50 * i / sortedClips.length);
      const segmentEndProgress = 5 + (50 * (i + 1) / sortedClips.length);
      
      await Promise.race([
        extractTrimmedSegment(clip, segmentPath, targetResolution, bitrateSettings, (segmentPercent) => {
          // Map segment progress to overall progress
          const mappedProgress = segmentStartProgress + (segmentPercent * (segmentEndProgress - segmentStartProgress) / 100);
          onProgress(Math.round(mappedProgress));
        }),
        timeout(60000) // 60 second timeout per segment
      ]);
      
      segmentPaths.push(segmentPath);
      
      // Ensure we reach the end of this segment's progress range
      onProgress(Math.round(segmentEndProgress));
    }

    // Step 2: Concatenate segments using filter_complex
    console.log('[Export] Step 2: Concatenating segments...');
    onProgress(55);
    await Promise.race([
      concatenateSegments(segmentPaths, outputPath, bitrateSettings, (percent) => {
        // Map 0-100% to 55-90% (35% range for better granularity)
        const mappedProgress = Math.min(55 + (percent * 0.35), 90);
        onProgress(Math.round(mappedProgress));
      }),
      timeout(300000) // 5 minute timeout for concatenation
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
  exportTimeline,
  getResolutionDimensions,
  getBitrateSettings,
  generateScaleFilter
};
