/**
 * Format duration in seconds to human-readable time string
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted time (MM:SS or H:MM:SS)
 */
export function formatDuration(seconds) {
  // Handle invalid values (NaN, Infinity, negative, or falsy)
  if (!seconds || !isFinite(seconds) || seconds < 0) return '0:00';
  
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format resolution to readable string
 * @param {number} width - Video width in pixels
 * @param {number} height - Video height in pixels
 * @returns {string} Formatted resolution (e.g., "1920 × 1080")
 */
export function formatResolution(width, height) {
  if (!width || !height) return 'Unknown';
  return `${width} × ${height}`;
}

/**
 * Format file size in bytes to human-readable string
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted size (e.g., "1.5 MB")
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`;
}

/**
 * Ellipsize text to fit within specified length
 * @param {string} text - Text to ellipsize
 * @param {number} maxLength - Maximum length before ellipsis
 * @returns {string} Ellipsized text
 */
export function ellipsize(text, maxLength = 20) {
  if (!text || typeof text !== 'string') return '';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

/**
 * Format trimmed duration for display
 * @param {number} trimStart - Start trim point in seconds
 * @param {number} trimEnd - End trim point in seconds
 * @returns {string} Formatted trimmed duration
 */
export function formatTrimmedDuration(trimStart, trimEnd) {
  if (typeof trimStart !== 'number' || typeof trimEnd !== 'number') {
    return '0:00';
  }
  const duration = Math.max(0, trimEnd - trimStart);
  return formatDuration(duration);
}

