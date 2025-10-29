/**
 * Test FFmpeg audio mixing with optional streams
 * Validates that composite export handles various audio scenarios correctly
 */

const { exportTimeline } = require('../../../electron/mediaProcessor');
const ffprobe = require('ffprobe-static');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const fixturesDir = path.join(__dirname, '../../../scripts/test-fixtures/test-fixtures');

// Helper to run ffprobe and parse output
function getVideoInfo(filePath) {
  try {
    const output = execSync(`"${ffprobe.path}" -v quiet -print_format json -show_streams "${filePath}"`, {
      encoding: 'utf8'
    });
    return JSON.parse(output);
  } catch (error) {
    throw new Error(`ffprobe failed: ${error.message}`);
  }
}

describe('Export Audio Mixing', () => {
  const testCases = [
    {
      name: 'both tracks with audio',
      clips: ['main_audio.mp4', 'overlay_audio.mp4'],
      expectedAudioStreams: 1,
      description: 'Should mix audio from both tracks'
    },
    {
      name: 'main track only has audio',
      clips: ['main_audio.mp4', 'overlay_silent.mp4'],
      expectedAudioStreams: 1,
      description: 'Should use main track audio only'
    },
    {
      name: 'overlay track only has audio',
      clips: ['main_silent.mp4', 'overlay_audio.mp4'],
      expectedAudioStreams: 1,
      description: 'Should use overlay track audio only'
    },
    {
      name: 'neither track has audio',
      clips: ['main_silent.mp4', 'overlay_silent.mp4'],
      expectedAudioStreams: 0,
      description: 'Should create video-only output'
    }
  ];

  testCases.forEach(({ name, clips, expectedAudioStreams, description }) => {
    test(`${name} - ${description}`, async () => {
      // Create clip objects
      const clipObjects = clips.map((fileName, index) => ({
        id: `clip_${index}`,
        fileName,
        filePath: path.join(fixturesDir, fileName),
        duration: 3,
        width: index === 0 ? 1280 : 640,
        height: index === 0 ? 720 : 480,
        trimStart: 0,
        trimEnd: 3,
        order: index,
        track: index === 0 ? 'main' : 'overlay',
        audio: { volume: 1, isMuted: false }
      }));

      // Export to temporary file
      const outputPath = path.join(fixturesDir, `test_${name.replace(/\s+/g, '_')}.mp4`);
      
      try {
        await exportTimeline(clipObjects, outputPath, () => {});
        
        // Verify file exists
        expect(fs.existsSync(outputPath)).toBe(true);
        
        // Analyze with ffprobe
        const info = getVideoInfo(outputPath);
        const videoStreams = info.streams.filter(s => s.codec_type === 'video');
        const audioStreams = info.streams.filter(s => s.codec_type === 'audio');
        
        // Should have exactly 1 video stream
        expect(videoStreams.length).toBe(1);
        
        // Should have expected number of audio streams
        expect(audioStreams.length).toBe(expectedAudioStreams);
        
        // If audio exists, duration should match video
        if (expectedAudioStreams > 0) {
          const videoDuration = parseFloat(videoStreams[0].duration);
          const audioDuration = parseFloat(audioStreams[0].duration);
          expect(Math.abs(videoDuration - audioDuration)).toBeLessThan(0.1);
        }
        
        console.log(`✓ ${name}: ${videoStreams.length} video, ${audioStreams.length} audio streams`);
        
      } finally {
        // Clean up test file
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
      }
    }, 30000); // 30 second timeout for FFmpeg operations
  });

  test('audio mixing handles missing audio gracefully', async () => {
    // Test with one clip that has audio and one that doesn't
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
        fileName: 'overlay_silent.mp4',
        filePath: path.join(fixturesDir, 'overlay_silent.mp4'),
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

    const outputPath = path.join(fixturesDir, 'test_graceful_audio.mp4');
    
    try {
      await exportTimeline(clipObjects, outputPath, () => {});
      
      const info = getVideoInfo(outputPath);
      const audioStreams = info.streams.filter(s => s.codec_type === 'audio');
      
      // Should have 1 audio stream (from main track)
      expect(audioStreams.length).toBe(1);
      
      console.log('✓ Graceful audio handling: 1 audio stream from main track only');
      
    } finally {
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    }
  }, 30000);
});
