const { validateVolume, validateAudioObject, migrateClipAudio } = require('../validators');

describe('Audio Validation Utilities', () => {
  describe('validateVolume', () => {
    test('should clamp volume between 0 and 1', () => {
      expect(validateVolume(0.5)).toBe(0.5);
      expect(validateVolume(1.0)).toBe(1.0);
      expect(validateVolume(0)).toBe(0);
    });

    test('should clamp negative values to 0', () => {
      expect(validateVolume(-5)).toBe(0);
      expect(validateVolume(-0.1)).toBe(0);
    });

    test('should clamp values above 1 to 1', () => {
      expect(validateVolume(150)).toBe(1);
      expect(validateVolume(1.5)).toBe(1);
    });

    test('should handle invalid values by returning default', () => {
      expect(validateVolume(NaN)).toBe(1.0);
      expect(validateVolume('invalid')).toBe(1.0);
      expect(validateVolume(null)).toBe(1.0);
      expect(validateVolume(undefined)).toBe(1.0);
    });
  });

  describe('validateAudioObject', () => {
    test('should return default audio object for invalid input', () => {
      expect(validateAudioObject(null)).toEqual({
        volume: 1.0,
        isMuted: false
      });
      expect(validateAudioObject(undefined)).toEqual({
        volume: 1.0,
        isMuted: false
      });
      expect(validateAudioObject('invalid')).toEqual({
        volume: 1.0,
        isMuted: false
      });
    });

    test('should validate and clamp volume in audio object', () => {
      expect(validateAudioObject({ volume: 0.5, isMuted: false })).toEqual({
        volume: 0.5,
        isMuted: false
      });
      expect(validateAudioObject({ volume: 1.5, isMuted: false })).toEqual({
        volume: 1.0,
        isMuted: false
      });
      expect(validateAudioObject({ volume: -0.1, isMuted: false })).toEqual({
        volume: 0,
        isMuted: false
      });
    });

    test('should convert isMuted to boolean', () => {
      expect(validateAudioObject({ volume: 1.0, isMuted: true })).toEqual({
        volume: 1.0,
        isMuted: true
      });
      expect(validateAudioObject({ volume: 1.0, isMuted: 0 })).toEqual({
        volume: 1.0,
        isMuted: false
      });
      expect(validateAudioObject({ volume: 1.0, isMuted: 1 })).toEqual({
        volume: 1.0,
        isMuted: true
      });
    });
  });

  describe('migrateClipAudio', () => {
    test('should migrate old clip structure to new audio object', () => {
      const oldClip = {
        id: 'test',
        fileName: 'test.mp4',
        audioVolume: 0.7,
        isMuted: true
      };

      const migratedClip = migrateClipAudio(oldClip);
      expect(migratedClip.audio).toEqual({
        volume: 0.7,
        isMuted: true
      });
      expect(migratedClip.audioVolume).toBeUndefined();
      expect(migratedClip.isMuted).toBeUndefined();
    });

    test('should validate existing audio object', () => {
      const clipWithAudio = {
        id: 'test',
        fileName: 'test.mp4',
        audio: {
          volume: 1.5, // Should be clamped to 1.0
          isMuted: 'true' // Should be converted to boolean
        }
      };

      const migratedClip = migrateClipAudio(clipWithAudio);
      expect(migratedClip.audio).toEqual({
        volume: 1.0,
        isMuted: true
      });
    });

    test('should handle clips with no audio properties', () => {
      const clipWithoutAudio = {
        id: 'test',
        fileName: 'test.mp4'
      };

      const migratedClip = migrateClipAudio(clipWithoutAudio);
      expect(migratedClip.audio).toEqual({
        volume: 1.0,
        isMuted: false
      });
    });

    test('should handle null/undefined clips', () => {
      expect(migrateClipAudio(null)).toBe(null);
      expect(migrateClipAudio(undefined)).toBe(undefined);
    });
  });
});
