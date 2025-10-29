const path = require('path');
const { getFFmpeg } = require('./utils/ffmpegConfig');
const fs = require('fs');
const os = require('os');

// Get configured FFmpeg instance
console.log('[FileManager] Module loading, getting FFmpeg instance...');
const ffmpeg = getFFmpeg();
console.log('[FileManager] FFmpeg instance obtained:', typeof ffmpeg);

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
  return new Promise((_, reject) => 
    setTimeout(() => reject(new Error('TIMEOUT')), ms)
  );
}

/**
 * Extract metadata from video file using ffprobe
 * @param {string} filePath - Absolute path to video file
 * @returns {Promise<Object>} Video metadata
 */
async function extractMetadata(filePath) {
  return new Promise((resolve, reject) => {
    console.log('[Metadata] ========== Starting metadata extraction ==========');
    console.log('[Metadata] File path:', filePath);
    console.log('[Metadata] FFmpeg instance:', typeof ffmpeg);
    console.log('[Metadata] FFmpeg methods available:', Object.getOwnPropertyNames(ffmpeg).slice(0, 10));
    console.debug('[Metadata] Starting ffprobe for', filePath);
    
    // Try using ffprobe with explicit path as a fallback
    const { getFfprobeBinaryPath } = require('./utils/ffmpegPath');
    const ffprobePath = getFfprobeBinaryPath();
    console.log('[Metadata] Using FFprobe path:', ffprobePath);
    
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) {
        console.error('[Metadata] FFmpeg ffprobe failed, trying direct spawn fallback...', err.message);
        
        // Fallback to direct spawn if fluent-ffmpeg fails
        const { spawn } = require('child_process');
        const ffprobeArgs = [
          '-v', 'quiet',
          '-print_format', 'json',
          '-show_format',
          '-show_streams',
          filePath
        ];
        
        console.log('[Metadata] Trying direct spawn with args:', ffprobeArgs);
        const child = spawn(ffprobePath, ffprobeArgs);
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        child.on('close', (code) => {
          if (code === 0) {
            try {
              const data = JSON.parse(stdout);
              console.log('[Metadata] Direct spawn succeeded');
              
              // Find video stream
              const videoStream = data.streams.find(s => s.codec_type === 'video');
              if (!videoStream) {
                console.warn('[Metadata] No video stream found in file');
                const error = new Error(ERROR_TYPES.CORRUPT_VIDEO);
                error.userMessage = 'No video stream found in file';
                reject(error);
                return;
              }
              
              console.debug('[Metadata] Direct spawn ffprobe succeeded, video stream found', {
                codec: videoStream.codec_name,
                resolution: `${videoStream.width}x${videoStream.height}`,
                duration: data.format.duration
              });
              
              resolve({
                duration: parseFloat(data.format.duration) || 0,
                width: videoStream.width || 0,
                height: videoStream.height || 0,
                codec: videoStream.codec_name || 'unknown',
                bitrate: parseInt(data.format.bit_rate) || 0,
              });
            } catch (parseErr) {
              console.error('[Metadata] Failed to parse direct spawn output:', parseErr);
              const error = new Error(ERROR_TYPES.FFMPEG_ERROR);
              error.userMessage = 'Failed to parse video metadata';
              error.details = parseErr.message;
              reject(error);
            }
          } else {
            console.error('[Metadata] Direct spawn also failed with code:', code);
            console.error('[Metadata] stderr:', stderr);
            
            const errorMsg = stderr || err.message || '';
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
            
            console.error('[Metadata] Both methods failed', {
              errorType,
              userMessage,
              rawMessage: errorMsg,
              fluentError: err.message,
              spawnCode: code
            });
            
            const error = new Error(errorType);
            error.userMessage = userMessage;
            error.details = errorMsg;
            error.raw = err;
            reject(error);
          }
        });
        
        child.on('error', (spawnErr) => {
          console.error('[Metadata] Direct spawn error:', spawnErr);
          const error = new Error(ERROR_TYPES.FFMPEG_ERROR);
          error.userMessage = 'Failed to execute FFprobe';
          error.details = spawnErr.message;
          reject(error);
        });
        
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
        bitrate: parseInt(data.format.bit_rate) || 0,
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
    console.debug('[Thumbnail] Attempting screenshot', { filePath, timestamp });
    const tempPath = path.join(os.tmpdir(), `thumb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`);
    
    ffmpeg(filePath)
      .on('start', (cmdLine) => {
        console.debug('[Thumbnail] ffmpeg command started', { timestamp, cmdLine });
      })
      .on('stderr', (line) => {
        console.debug('[Thumbnail][stderr]', line.trim());
      })
      .screenshots({
        timestamps: [timestamp],
        filename: path.basename(tempPath),
        folder: path.dirname(tempPath),
        size: '320x180'
      })
      .on('end', () => {
        try {
          console.debug('[Thumbnail] Screenshot succeeded', { tempPath });
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
      })
      .on('error', (err) => {
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
      console.warn('[Thumbnail] Failed attempt, trying next timestamp', { timestamp, reason: err.message });
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
      console.warn('[Metadata] Permission denied when accessing file', { filePath, err });
      throw new Error(ERROR_TYPES.PERMISSION_DENIED);
    }

    // Extract metadata with timeout
    const metadataPromise = extractMetadata(filePath);
    const metadata = await Promise.race([
      metadataPromise,
      timeout(30000) // 30 second timeout
    ]);

    console.debug('[Metadata] Core data extracted', metadata);

    // Generate thumbnail with timeout
    const thumbnailPromise = generateThumbnail(filePath);
    const thumbnail = await Promise.race([
      thumbnailPromise,
      timeout(30000) // 30 second timeout
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

module.exports = { getMetadata };
