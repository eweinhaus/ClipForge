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

// Track types
export const TRACK_TYPES = {
  MAIN: 'main',
  OVERLAY: 'overlay',
  AUDIO: 'audio',
};

// Track configuration
export const TRACK_CONFIG = [
  {
    id: 'main',
    label: 'Video 1',
    type: TRACK_TYPES.MAIN,
    color: '#4a90e2',
    height: 80,
    acceptsVideo: true,
    acceptsAudio: true,
  },
  {
    id: 'overlay',
    label: 'Video 2 (PiP)',
    type: TRACK_TYPES.OVERLAY,
    color: '#e67e22',
    height: 80,
    acceptsVideo: true,
    acceptsAudio: false,
  },
  {
    id: 'audio',
    label: 'Audio',
    type: TRACK_TYPES.AUDIO,
    color: '#2ecc71',
    height: 60,
    acceptsVideo: false,
    acceptsAudio: true,
  },
];

// Default track heights
export const TRACK_HEIGHTS = {
  DEFAULT: 80,
  AUDIO: 60,
  MIN: 40,
  MAX: 120,
};

// Overlay position presets for PiP
export const OVERLAY_POSITIONS = {
  TOP_LEFT: { x: 20, y: 20 },
  TOP_RIGHT: { x: 'W-w-20', y: 20 },
  BOTTOM_LEFT: { x: 20, y: 'H-h-20' },
  BOTTOM_RIGHT: { x: 'W-w-20', y: 'H-h-20' },
  CENTER: { x: '(W-w)/2', y: '(H-h)/2' },
};

// Default overlay settings
export const DEFAULT_OVERLAY_SETTINGS = {
  position: 'BOTTOM_RIGHT',
  scale: 0.25, // 25% of main video size
  opacity: 1.0,
};

