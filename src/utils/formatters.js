/**
 * Format duration in seconds to human-readable time string
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted time (MM:SS or H:MM:SS)
 */
export function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '0:00';
  
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

