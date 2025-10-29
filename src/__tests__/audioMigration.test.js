/**
 * Test audio migration for legacy clips
 * Validates that clips without audio data get proper defaults
 */

const { migrateClipAudio } = require('../utils/validators');

describe('Audio Migration', () => {
  test('migrates legacy clip without audio field', () => {
    const legacyClip = {
      id: 'test-clip',
      fileName: 'test.mp4',
      filePath: '/path/to/test.mp4',
      duration: 10,
      width: 1280,
      height: 720,
      trimStart: 0,
      trimEnd: 10,
      order: 0,
      track: 'main'
      // No audio field
    };

    const migrated = migrateClipAudio(legacyClip);

    expect(migrated.audio).toEqual({
      volume: 1,
      isMuted: false
    });
    expect(migrated.id).toBe('test-clip'); // Other fields preserved
  });

  test('preserves existing audio data', () => {
    const clipWithAudio = {
      id: 'test-clip',
      fileName: 'test.mp4',
      filePath: '/path/to/test.mp4',
      duration: 10,
      width: 1280,
      height: 720,
      trimStart: 0,
      trimEnd: 10,
      order: 0,
      track: 'main',
      audio: {
        volume: 0.5,
        isMuted: true
      }
    };

    const migrated = migrateClipAudio(clipWithAudio);

    expect(migrated.audio).toEqual({
      volume: 0.5,
      isMuted: true
    });
  });

  test('handles partial audio data', () => {
    const partialAudioClip = {
      id: 'test-clip',
      fileName: 'test.mp4',
      filePath: '/path/to/test.mp4',
      duration: 10,
      width: 1280,
      height: 720,
      trimStart: 0,
      trimEnd: 10,
      order: 0,
      track: 'main',
      audio: {
        volume: 0.8
        // Missing isMuted
      }
    };

    const migrated = migrateClipAudio(partialAudioClip);

    expect(migrated.audio).toEqual({
      volume: 0.8,
      isMuted: false // Default value
    });
  });

  test('handles null audio field', () => {
    const nullAudioClip = {
      id: 'test-clip',
      fileName: 'test.mp4',
      filePath: '/path/to/test.mp4',
      duration: 10,
      width: 1280,
      height: 720,
      trimStart: 0,
      trimEnd: 10,
      order: 0,
      track: 'main',
      audio: null
    };

    const migrated = migrateClipAudio(nullAudioClip);

    expect(migrated.audio).toEqual({
      volume: 1,
      isMuted: false
    });
  });

  test('handles undefined audio field', () => {
    const undefinedAudioClip = {
      id: 'test-clip',
      fileName: 'test.mp4',
      filePath: '/path/to/test.mp4',
      duration: 10,
      width: 1280,
      height: 720,
      trimStart: 0,
      trimEnd: 10,
      order: 0,
      track: 'main',
      audio: undefined
    };

    const migrated = migrateClipAudio(undefinedAudioClip);

    expect(migrated.audio).toEqual({
      volume: 1,
      isMuted: false
    });
  });
});
