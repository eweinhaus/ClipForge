/**
 * Test export progress reporting edge cases
 * Validates progress never goes negative or exceeds 100%
 */

const { exportTimeline } = require('../../../electron/mediaProcessor');
const path = require('path');
const fs = require('fs');

const fixturesDir = path.join(__dirname, '../../../scripts/test-fixtures/test-fixtures');

describe('Export Progress Edge Cases', () => {
  test('progress never exceeds 100%', async () => {
    const clipObjects = [
      {
        id: 'clip1',
        fileName: 'main_audio.mp4',
        filePath: path.join(fixturesDir, 'main_audio.mp4'),
        duration: 3,
        width: 1280,
        height: 720,
        trimStart: 0,
        trimEnd: 3,
        order: 0,
        track: 'main',
        audio: { volume: 1, isMuted: false }
      }
    ];

    const outputPath = path.join(fixturesDir, 'test_progress.mp4');
    const progressValues = [];
    
    try {
      await exportTimeline(clipObjects, outputPath, (progress) => {
        progressValues.push(progress);
        console.log(`Progress: ${progress}%`);
      });
      
      // Verify all progress values are valid
      expect(progressValues.length).toBeGreaterThan(0);
      expect(progressValues.every(p => p >= 0 && p <= 100)).toBe(true);
      expect(Math.max(...progressValues)).toBeLessThanOrEqual(100);
      expect(Math.min(...progressValues)).toBeGreaterThanOrEqual(0);
      
      // Should end at 100%
      expect(progressValues[progressValues.length - 1]).toBe(100);
      
      console.log(`✓ Progress validation: ${progressValues.length} values, max: ${Math.max(...progressValues)}%`);
      
    } finally {
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    }
  }, 30000);

  test('progress handles very short clips', async () => {
    const clipObjects = [
      {
        id: 'short_clip',
        fileName: 'main_audio.mp4',
        filePath: path.join(fixturesDir, 'main_audio.mp4'),
        duration: 1, // Very short duration
        width: 1280,
        height: 720,
        trimStart: 0,
        trimEnd: 1,
        order: 0,
        track: 'main',
        audio: { volume: 1, isMuted: false }
      }
    ];

    const outputPath = path.join(fixturesDir, 'test_short_progress.mp4');
    const progressValues = [];
    
    try {
      await exportTimeline(clipObjects, outputPath, (progress) => {
        progressValues.push(progress);
      });
      
      // Even for short clips, should have some progress values
      expect(progressValues.length).toBeGreaterThan(0);
      expect(progressValues.every(p => p >= 0 && p <= 100)).toBe(true);
      expect(progressValues[progressValues.length - 1]).toBe(100);
      
      console.log(`✓ Short clip progress: ${progressValues.length} values`);
      
    } finally {
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    }
  }, 30000);

  test('progress handles multi-track export', async () => {
    const clipObjects = [
      {
        id: 'main',
        fileName: 'main_audio.mp4',
        filePath: path.join(fixturesDir, 'main_audio.mp4'),
        duration: 3,
        width: 1280,
        height: 720,
        trimStart: 0,
        trimEnd: 3,
        order: 0,
        track: 'main',
        audio: { volume: 1, isMuted: false }
      },
      {
        id: 'overlay',
        fileName: 'overlay_audio.mp4',
        filePath: path.join(fixturesDir, 'overlay_audio.mp4'),
        duration: 2,
        width: 640,
        height: 480,
        trimStart: 0,
        trimEnd: 2,
        order: 1,
        track: 'overlay',
        audio: { volume: 1, isMuted: false }
      }
    ];

    const outputPath = path.join(fixturesDir, 'test_multitrack_progress.mp4');
    const progressValues = [];
    
    try {
      await exportTimeline(clipObjects, outputPath, (progress) => {
        progressValues.push(progress);
      });
      
      expect(progressValues.length).toBeGreaterThan(0);
      expect(progressValues.every(p => p >= 0 && p <= 100)).toBe(true);
      expect(progressValues[progressValues.length - 1]).toBe(100);
      
      console.log(`✓ Multi-track progress: ${progressValues.length} values`);
      
    } finally {
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    }
  }, 30000);
});
