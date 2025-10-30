const { 
  getResolutionDimensions, 
  getBitrateSettings, 
  generateScaleFilter 
} = require('../mediaProcessor');

describe('MediaProcessor Helper Functions', () => {
  describe('getResolutionDimensions', () => {
    test('should return correct dimensions for 720p', () => {
      const result = getResolutionDimensions('720p');
      expect(result).toEqual({ width: 1280, height: 720 });
    });

    test('should return correct dimensions for 1080p', () => {
      const result = getResolutionDimensions('1080p');
      expect(result).toEqual({ width: 1920, height: 1080 });
    });

    test('should return correct dimensions for 480p', () => {
      const result = getResolutionDimensions('480p');
      expect(result).toEqual({ width: 854, height: 480 });
    });

    test('should return null for source resolution', () => {
      const result = getResolutionDimensions('source');
      expect(result).toBeNull();
    });

    test('should return null for invalid resolution', () => {
      const result = getResolutionDimensions('invalid');
      expect(result).toBeNull();
    });
  });

  describe('getBitrateSettings', () => {
    test('should return correct bitrates for 720p high quality', () => {
      const result = getBitrateSettings('720p', 'high');
      expect(result).toEqual({
        videoBitrate: 5000,
        maxRate: 6250,
        bufferSize: 12500
      });
    });

    test('should return correct bitrates for 1080p medium quality', () => {
      const result = getBitrateSettings('1080p', 'medium');
      expect(result).toEqual({
        videoBitrate: 5600, // 8000 * 0.7
        maxRate: 7000,      // 10000 * 0.7
        bufferSize: 14000   // 20000 * 0.7
      });
    });

    test('should return correct bitrates for 480p low quality', () => {
      const result = getBitrateSettings('480p', 'low');
      expect(result).toEqual({
        videoBitrate: 1000, // 2000 * 0.5
        maxRate: 1250,      // 2500 * 0.5
        bufferSize: 2500    // 5000 * 0.5
      });
    });

    test('should use default quality multiplier for invalid quality', () => {
      const result = getBitrateSettings('720p', 'invalid');
      expect(result).toEqual({
        videoBitrate: 5000,
        maxRate: 6250,
        bufferSize: 12500
      });
    });

    test('should fallback to source resolution for invalid resolution', () => {
      const result = getBitrateSettings('invalid', 'high');
      expect(result).toEqual({
        videoBitrate: 5000,
        maxRate: 6250,
        bufferSize: 12500
      });
    });
  });

  describe('generateScaleFilter', () => {
    test('should generate correct scale filter for 720p', () => {
      const result = generateScaleFilter({ width: 1280, height: 720 });
      expect(result).toBe('scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2');
    });

    test('should generate correct scale filter for 1080p', () => {
      const result = generateScaleFilter({ width: 1920, height: 1080 });
      expect(result).toBe('scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2');
    });

    test('should return null for null input', () => {
      const result = generateScaleFilter(null);
      expect(result).toBeNull();
    });

    test('should return null for undefined input', () => {
      const result = generateScaleFilter(undefined);
      expect(result).toBeNull();
    });
  });
});
