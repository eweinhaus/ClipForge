import { formatDuration, formatResolution, formatFileSize, ellipsize, formatTrimmedDuration } from '../formatters';

describe('formatters', () => {
  describe('formatDuration', () => {
    test('formats seconds correctly', () => {
      expect(formatDuration(0)).toBe('0:00');
      expect(formatDuration(30)).toBe('0:30');
      expect(formatDuration(65)).toBe('1:05');
      expect(formatDuration(3661)).toBe('1:01:01');
    });

    test('handles negative values', () => {
      expect(formatDuration(-5)).toBe('0:00');
    });

    test('handles undefined/null values', () => {
      expect(formatDuration(undefined)).toBe('0:00');
      expect(formatDuration(null)).toBe('0:00');
    });
  });

  describe('formatResolution', () => {
    test('formats resolution correctly', () => {
      expect(formatResolution(1920, 1080)).toBe('1920 × 1080');
      expect(formatResolution(1280, 720)).toBe('1280 × 720');
    });

    test('handles missing values', () => {
      expect(formatResolution(0, 0)).toBe('Unknown');
      expect(formatResolution(null, null)).toBe('Unknown');
      expect(formatResolution(undefined, undefined)).toBe('Unknown');
    });
  });

  describe('formatFileSize', () => {
    test('formats file sizes correctly', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1048576)).toBe('1.0 MB');
      expect(formatFileSize(1073741824)).toBe('1.0 GB');
    });

    test('handles edge cases', () => {
      expect(formatFileSize(null)).toBe('0 B');
      expect(formatFileSize(undefined)).toBe('0 B');
    });
  });

  describe('ellipsize', () => {
    test('ellipsizes long text', () => {
      expect(ellipsize('short', 10)).toBe('short');
      expect(ellipsize('very long filename that exceeds limit', 20)).toBe('very long filename...');
    });

    test('uses default max length', () => {
      expect(ellipsize('this is a very long string that should be ellipsized')).toBe('this is a very long...');
    });

    test('handles edge cases', () => {
      expect(ellipsize('', 10)).toBe('');
      expect(ellipsize(null, 10)).toBe('');
      expect(ellipsize(undefined, 10)).toBe('');
      expect(ellipsize(123, 10)).toBe(''); // Non-string input
    });
  });

  describe('formatTrimmedDuration', () => {
    test('calculates trimmed duration correctly', () => {
      expect(formatTrimmedDuration(0, 10)).toBe('0:10');
      expect(formatTrimmedDuration(5, 15)).toBe('0:10');
      expect(formatTrimmedDuration(0, 65)).toBe('1:05');
    });

    test('handles edge cases', () => {
      expect(formatTrimmedDuration(0, 0)).toBe('0:00');
      expect(formatTrimmedDuration(10, 5)).toBe('0:00'); // Invalid range
      expect(formatTrimmedDuration(null, 10)).toBe('0:00'); // Invalid input
      expect(formatTrimmedDuration(5, null)).toBe('0:00'); // Invalid input
      expect(formatTrimmedDuration('5', '10')).toBe('0:00'); // Non-number input
    });
  });
});
