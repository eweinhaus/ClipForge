/**
 * Timeline utility functions for professional editing features
 */

/**
 * Convert time in seconds to pixels based on zoom level
 * @param {number} timeSeconds - Time in seconds
 * @param {number} zoomLevel - Current zoom level (0.25, 0.5, 1, 2, 4)
 * @param {number} pixelsPerSecond - Base pixels per second (default: 50)
 * @returns {number} Width in pixels
 */
export function timeToPx(timeSeconds, zoomLevel = 1, pixelsPerSecond = 50) {
  return Math.round(timeSeconds * pixelsPerSecond * zoomLevel * 100) / 100;
}

/**
 * Convert pixels to time in seconds based on zoom level
 * @param {number} pixels - Width in pixels
 * @param {number} zoomLevel - Current zoom level (0.25, 0.5, 1, 2, 4)
 * @param {number} pixelsPerSecond - Base pixels per second (default: 50)
 * @returns {number} Time in seconds
 */
export function pxToTime(pixels, zoomLevel = 1, pixelsPerSecond = 50) {
  return Math.round((pixels / (pixelsPerSecond * zoomLevel)) * 100) / 100;
}

/**
 * Snap time to nearest grid interval
 * @param {number} timeSeconds - Time in seconds
 * @param {boolean} snapToGrid - Whether snapping is enabled
 * @param {number} gridInterval - Grid interval in seconds (default: 1)
 * @returns {number} Snapped time in seconds
 */
export function snap(timeSeconds, snapToGrid = true, gridInterval = 1) {
  if (!snapToGrid) return timeSeconds;
  return Math.round(timeSeconds / gridInterval) * gridInterval;
}

/**
 * Validate trim range
 * @param {number} trimStart - Start time in seconds
 * @param {number} trimEnd - End time in seconds
 * @param {number} duration - Total duration in seconds
 * @param {number} minDuration - Minimum duration in seconds (default: 0.25)
 * @returns {object} Validation result with isValid and message
 */
export function validateTrimRange(trimStart, trimEnd, duration, minDuration = 0.25) {
  if (trimStart < 0) {
    return { isValid: false, message: 'Trim start cannot be negative' };
  }
  
  if (trimEnd > duration) {
    return { isValid: false, message: 'Trim end cannot exceed clip duration' };
  }
  
  if (trimStart >= trimEnd) {
    return { isValid: false, message: 'Trim start must be less than trim end' };
  }
  
  const trimmedDuration = trimEnd - trimStart;
  if (trimmedDuration < minDuration) {
    return { isValid: false, message: `Minimum duration is ${minDuration}s` };
  }
  
  return { isValid: true, message: 'Valid trim range' };
}

/**
 * Format timecode for tooltips (HH:MM:SS.FF)
 * @param {number} timeSeconds - Time in seconds
 * @returns {string} Formatted timecode
 */
export function formatTimecode(timeSeconds) {
  if (timeSeconds < 0) return '00:00:00.00';
  
  const hours = Math.floor(timeSeconds / 3600);
  const minutes = Math.floor((timeSeconds % 3600) / 60);
  const seconds = Math.floor(timeSeconds % 60);
  const frames = Math.floor((timeSeconds % 1) * 100);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${frames.toString().padStart(2, '0')}`;
}

/**
 * Throttle function for performance optimization
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Debounce function for performance optimization
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Calculate zoom level to fit timeline content in viewport
 * @param {number} totalDuration - Total duration of all clips in seconds
 * @param {number} viewportWidth - Available viewport width in pixels
 * @param {number} pixelsPerSecond - Base pixels per second (default: 50)
 * @param {number} padding - Padding to leave on sides (default: 100)
 * @returns {number} Optimal zoom level
 */
export function calculateFitZoom(totalDuration, viewportWidth, pixelsPerSecond = 50, padding = 100) {
  if (totalDuration <= 0 || viewportWidth <= 0) return 1;
  
  const availableWidth = viewportWidth - padding;
  const optimalZoom = availableWidth / (totalDuration * pixelsPerSecond);
  
  // Clamp to valid zoom levels
  const zoomLevels = [0.25, 0.5, 1, 2, 4];
  const clampedZoom = Math.max(0.25, Math.min(4, optimalZoom));
  
  // Find closest valid zoom level
  return zoomLevels.reduce((prev, curr) => 
    Math.abs(curr - clampedZoom) < Math.abs(prev - clampedZoom) ? curr : prev
  );
}
