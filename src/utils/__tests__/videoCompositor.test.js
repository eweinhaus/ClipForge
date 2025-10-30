/**
 * Unit tests for videoCompositor utility
 */

const { 
  PIP_POSITIONS, 
  PIP_SIZES, 
  calculatePipOverlay, 
  validatePipSettings 
} = require('../videoCompositor');

describe('videoCompositor', () => {
  describe('PIP_POSITIONS', () => {
    test('should have all expected position values', () => {
      expect(PIP_POSITIONS.TOP_LEFT).toBe('top-left');
      expect(PIP_POSITIONS.TOP_RIGHT).toBe('top-right');
      expect(PIP_POSITIONS.BOTTOM_LEFT).toBe('bottom-left');
      expect(PIP_POSITIONS.BOTTOM_RIGHT).toBe('bottom-right');
    });
  });

  describe('PIP_SIZES', () => {
    test('should have expected size values', () => {
      expect(PIP_SIZES.SMALL).toBe(0.2);
      expect(PIP_SIZES.MEDIUM).toBe(0.3);
      expect(PIP_SIZES.LARGE).toBe(0.4);
    });
  });

  describe('calculatePipOverlay', () => {
    const screenWidth = 1920;
    const screenHeight = 1080;

    test('should calculate bottom-right position correctly', () => {
      const result = calculatePipOverlay(screenWidth, screenHeight, PIP_POSITIONS.BOTTOM_RIGHT, PIP_SIZES.MEDIUM);
      
      expect(result.x).toBeGreaterThan(screenWidth / 2); // Right side
      expect(result.y).toBeGreaterThan(screenHeight / 2); // Bottom side
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
    });

    test('should calculate top-left position correctly', () => {
      const result = calculatePipOverlay(screenWidth, screenHeight, PIP_POSITIONS.TOP_LEFT, PIP_SIZES.SMALL);
      
      expect(result.x).toBeLessThan(screenWidth / 2); // Left side
      expect(result.y).toBeLessThan(screenHeight / 2); // Top side
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
    });

    test('should maintain 16:9 aspect ratio', () => {
      const result = calculatePipOverlay(screenWidth, screenHeight, PIP_POSITIONS.BOTTOM_RIGHT, PIP_SIZES.LARGE);
      const aspectRatio = result.width / result.height;
      
      expect(aspectRatio).toBeCloseTo(16 / 9, 1);
    });

    test('should respect padding', () => {
      const padding = 50;
      const result = calculatePipOverlay(screenWidth, screenHeight, PIP_POSITIONS.BOTTOM_RIGHT, PIP_SIZES.MEDIUM, padding);
      
      expect(result.x).toBeLessThanOrEqual(screenWidth - result.width - padding);
      expect(result.y).toBeLessThanOrEqual(screenHeight - result.height - padding);
    });

    test('should scale down if height exceeds size constraint', () => {
      const result = calculatePipOverlay(800, 600, PIP_POSITIONS.BOTTOM_RIGHT, 0.8); // 80% of 600 = 480
      
      // Should be constrained by height, not width
      expect(result.height).toBeLessThanOrEqual(480);
      expect(result.width).toBeLessThanOrEqual(result.height * (16 / 9));
    });

    test('should handle different screen aspect ratios', () => {
      // Test with square screen
      const squareResult = calculatePipOverlay(1024, 1024, PIP_POSITIONS.BOTTOM_RIGHT, PIP_SIZES.MEDIUM);
      expect(squareResult.width).toBeGreaterThan(0);
      expect(squareResult.height).toBeGreaterThan(0);
      
      // Test with ultra-wide screen
      const wideResult = calculatePipOverlay(2560, 1440, PIP_POSITIONS.BOTTOM_RIGHT, PIP_SIZES.MEDIUM);
      expect(wideResult.width).toBeGreaterThan(0);
      expect(wideResult.height).toBeGreaterThan(0);
    });
  });

  describe('validatePipSettings', () => {
    test('should validate correct settings', () => {
      const validSettings = {
        position: PIP_POSITIONS.BOTTOM_RIGHT,
        size: PIP_SIZES.MEDIUM,
        opacity: 0.9
      };
      
      const result = validatePipSettings(validSettings);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject invalid position', () => {
      const invalidSettings = {
        position: 'invalid-position',
        size: PIP_SIZES.MEDIUM,
        opacity: 0.9
      };
      
      const result = validatePipSettings(invalidSettings);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid PiP position');
    });

    test('should reject invalid size', () => {
      const invalidSettings = {
        position: PIP_POSITIONS.BOTTOM_RIGHT,
        size: 1.5, // Too large
        opacity: 0.9
      };
      
      const result = validatePipSettings(invalidSettings);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('PiP size must be between 0.1 and 0.8');
    });

    test('should reject size too small', () => {
      const invalidSettings = {
        position: PIP_POSITIONS.BOTTOM_RIGHT,
        size: 0.05, // Too small
        opacity: 0.9
      };
      
      const result = validatePipSettings(invalidSettings);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('PiP size must be between 0.1 and 0.8');
    });

    test('should reject invalid opacity', () => {
      const invalidSettings = {
        position: PIP_POSITIONS.BOTTOM_RIGHT,
        size: PIP_SIZES.MEDIUM,
        opacity: 1.5 // Too high
      };
      
      const result = validatePipSettings(invalidSettings);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('PiP opacity must be between 0.1 and 1.0');
    });

    test('should reject opacity too low', () => {
      const invalidSettings = {
        position: PIP_POSITIONS.BOTTOM_RIGHT,
        size: PIP_SIZES.MEDIUM,
        opacity: 0.05 // Too low
      };
      
      const result = validatePipSettings(invalidSettings);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('PiP opacity must be between 0.1 and 1.0');
    });

    test('should handle multiple validation errors', () => {
      const invalidSettings = {
        position: 'invalid',
        size: 2.0,
        opacity: 2.0
      };
      
      const result = validatePipSettings(invalidSettings);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });

    test('should handle missing properties', () => {
      const invalidSettings = {
        // Missing all properties
      };
      
      const result = validatePipSettings(invalidSettings);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
