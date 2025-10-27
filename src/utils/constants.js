/**
 * Application constants and configuration
 */

// Supported video formats
export const SUPPORTED_FORMATS = ['mp4', 'mov', 'webm'];
export const SUPPORTED_MIME_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

// Error messages
export const ERROR_MESSAGES = {
  INVALID_FORMAT: 'Unsupported file format. Please use MP4, MOV, or WebM.',
  FILE_NOT_FOUND: 'File not found. It may have been moved or deleted.',
  PERMISSION_DENIED: 'Permission denied. Check file permissions in System Preferences.',
  CORRUPT_VIDEO: 'Video file is corrupted or incomplete. Try re-downloading or re-exporting the file.',
  FFMPEG_ERROR: 'Error processing video. The file may be corrupted or in an unsupported codec.',
  TIMEOUT: 'Video processing timed out. File may be too large or corrupted.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  UNKNOWN: 'An unexpected error occurred. Please try again.',
};

// Timeouts (in milliseconds)
export const TIMEOUTS = {
  METADATA_EXTRACTION: 30000, // 30 seconds
  THUMBNAIL_GENERATION: 30000, // 30 seconds
  EXPORT: 600000, // 10 minutes
};

// Thumbnail settings
export const THUMBNAIL = {
  WIDTH: 320,
  HEIGHT: 180,
  QUALITY: 80,
  TIMESTAMPS: ['00:00:01', '00:00:00', '00:00:05'], // Fallback timestamps
};

// Export presets (for future use)
export const EXPORT_PRESETS = {
  SOURCE: { name: 'Source Quality', scale: null },
  HD_1080: { name: '1080p', scale: '1920:1080' },
  HD_720: { name: '720p', scale: '1280:720' },
  SD_480: { name: '480p', scale: '854:480' },
};

