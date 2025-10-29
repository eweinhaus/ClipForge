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
 * @returns {Promise<void>}
 */
async function extractTrimmedSegment(clip, outputPath, targetResolution, onProgress) {
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
        `scale=${targetResolution.width}:${targetResolution.height}:force_original_aspect_ratio=decrease,pad=${targetResolution.width}:${targetResolution.height}:(ow-iw)/2:(oh-ih)/2,setpts=PTS-STARTPTS`
      ])
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
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<void>}
 */
async function concatenateSegments(segmentPaths, outputPath, onProgress) {
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
      // Final encode: h264 + AAC (one-time encoding, avoids AAC priming between clips)
      .outputOptions(['-c:v', 'libx264', '-preset', 'fast', '-crf', '23'])
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
 * Composite overlay track onto main track using FFmpeg
 * @param {string} mainPath - Path to main track video
 * @param {string} overlayPath - Path to overlay track video
 * @param {string} outputPath - Final output path
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<void>}
 */
async function compositeTracks(mainPath, overlayPath, outputPath, onProgress) {
  return new Promise((resolve, reject) => {
    let lastProgress = 0;
    
    console.log('[Export] Compositing overlay onto main track...');
    
    ffmpeg()
      .input(mainPath)
      .input(overlayPath)
      .on('start', (cmdLine) => {
        console.log('[Export] Composite command:', cmdLine);
        onProgress(0);
      })
      .on('stderr', (line) => {
        console.debug('[Export][composite stderr]', line.trim());
      })
      .on('progress', (progress) => {
        const percent = Math.min(Math.round(progress.percent || 0), 100);
        if (percent > lastProgress + 2) {
          lastProgress = percent;
          onProgress(percent);
        }
      })
      .on('end', () => {
        console.log('[Export] Compositing complete');
        onProgress(100);
        resolve();
      })
      .on('error', (err) => {
        console.error('[Export] Compositing failed:', err.message);
        reject(err);
      })
      .complexFilter([
        // Scale overlay to 25% size (240x180 for 1080p main)
        '[1]scale=320:240[pip]',
        // Composite overlay in bottom-right corner
        '[0][pip]overlay=W-w-10:H-h-10'
      ])
      .outputOptions(['-c:v', 'libx264', '-preset', 'fast', '-crf', '23'])
      .outputOptions(['-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2'])
      .outputOptions(['-r', '30'])
      .outputOptions(['-fflags', '+genpts', '-async', '1'])
      .output(outputPath)
      .run();
  });
}

/**
 * Export timeline to MP4 with multi-track support
 * @param {Array} clips - Array of clip objects
 * @param {string} outputPath - Output file path
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Promise<string>} Output path on success
 */
async function exportTimeline(clips, outputPath, onProgress = () => {}) {
  if (!clips || clips.length === 0) {
    throw new Error('INVALID_CLIPS');
  }

  console.log('[Export] ========== Starting multi-track timeline export ==========');
  console.log('[Export] Clips count:', clips.length);
  console.log('[Export] Output path:', outputPath);

  // Separate clips by track
  const mainClips = clips.filter(clip => clip.track === 'main' || !clip.track).sort((a, b) => a.order - b.order);
  const overlayClips = clips.filter(clip => clip.track === 'overlay').sort((a, b) => a.order - b.order);
  
  console.log('[Export] Main track clips:', mainClips.length);
  console.log('[Export] Overlay track clips:', overlayClips.length);

  // Determine target resolution (use the highest resolution among main track clips)
  const allMainClips = mainClips.length > 0 ? mainClips : clips;
  const targetResolution = allMainClips.reduce((max, clip) => {
    const clipPixels = clip.width * clip.height;
    const maxPixels = max.width * max.height;
    return clipPixels > maxPixels ? { width: clip.width, height: clip.height } : max;
  }, { width: allMainClips[0].width, height: allMainClips[0].height });
  
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

    // Step 1: Process main track clips
    console.log('[Export] Step 1: Processing main track...');
    onProgress(5);
    let mainTrackPath = null;
    
    if (mainClips.length > 0) {
      const mainSegmentPaths = [];
      
      for (let i = 0; i < mainClips.length; i++) {
        const clip = mainClips[i];
        const segmentPath = path.join(tempDir, `main_segment_${i}_${Date.now()}.mkv`);
        tempFiles.push(segmentPath);
        
        console.log(`[Export] Processing main clip ${i + 1}/${mainClips.length}: ${clip.fileName}`);
        
        const segmentStartProgress = 5 + (30 * i / mainClips.length);
        const segmentEndProgress = 5 + (30 * (i + 1) / mainClips.length);
        
        await Promise.race([
          extractTrimmedSegment(clip, segmentPath, targetResolution, (segmentPercent) => {
            const mappedProgress = segmentStartProgress + (segmentPercent * (segmentEndProgress - segmentStartProgress) / 100);
            onProgress(Math.round(mappedProgress));
          }),
          timeout(60000)
        ]);
        
        mainSegmentPaths.push(segmentPath);
        onProgress(Math.round(segmentEndProgress));
      }
      
      // Concatenate main track segments
      mainTrackPath = path.join(tempDir, `main_track_${Date.now()}.mp4`);
      tempFiles.push(mainTrackPath);
      
      await Promise.race([
        concatenateSegments(mainSegmentPaths, mainTrackPath, (percent) => {
          const mappedProgress = 35 + (percent * 0.15); // 35-50%
          onProgress(Math.round(mappedProgress));
        }),
        timeout(300000)
      ]);
    }
    
    // Step 2: Process overlay track clips
    console.log('[Export] Step 2: Processing overlay track...');
    onProgress(50);
    let overlayTrackPath = null;
    
    if (overlayClips.length > 0) {
      const overlaySegmentPaths = [];
      
      for (let i = 0; i < overlayClips.length; i++) {
        const clip = overlayClips[i];
        const segmentPath = path.join(tempDir, `overlay_segment_${i}_${Date.now()}.mkv`);
        tempFiles.push(segmentPath);
        
        console.log(`[Export] Processing overlay clip ${i + 1}/${overlayClips.length}: ${clip.fileName}`);
        
        const segmentStartProgress = 50 + (20 * i / overlayClips.length);
        const segmentEndProgress = 50 + (20 * (i + 1) / overlayClips.length);
        
        await Promise.race([
          extractTrimmedSegment(clip, segmentPath, targetResolution, (segmentPercent) => {
            const mappedProgress = segmentStartProgress + (segmentPercent * (segmentEndProgress - segmentStartProgress) / 100);
            onProgress(Math.round(mappedProgress));
          }),
          timeout(60000)
        ]);
        
        overlaySegmentPaths.push(segmentPath);
        onProgress(Math.round(segmentEndProgress));
      }
      
      // Concatenate overlay track segments
      overlayTrackPath = path.join(tempDir, `overlay_track_${Date.now()}.mp4`);
      tempFiles.push(overlayTrackPath);
      
      await Promise.race([
        concatenateSegments(overlaySegmentPaths, overlayTrackPath, (percent) => {
          const mappedProgress = 70 + (percent * 0.15); // 70-85%
          onProgress(Math.round(mappedProgress));
        }),
        timeout(300000)
      ]);
    }
    
    // Step 3: Composite tracks or copy main track
    console.log('[Export] Step 3: Finalizing export...');
    onProgress(85);
    
    if (overlayTrackPath && mainTrackPath) {
      // Composite overlay onto main
      await Promise.race([
        compositeTracks(mainTrackPath, overlayTrackPath, outputPath, (percent) => {
          const mappedProgress = 85 + (percent * 0.15); // 85-100%
          onProgress(Math.round(mappedProgress));
        }),
        timeout(300000)
      ]);
    } else if (mainTrackPath) {
      // Just copy main track to output
      fs.copyFileSync(mainTrackPath, outputPath);
      onProgress(100);
    } else {
      throw new Error('INVALID_CLIPS');
    }
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

module.exports = { exportTimeline };
