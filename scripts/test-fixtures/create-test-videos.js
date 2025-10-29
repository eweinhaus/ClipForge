#!/usr/bin/env node
/**
 * Create test video fixtures for automated testing
 * Generates short MP4 files with and without audio
 */

const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { getFfmpegBinaryPath } = require('../../electron/utils/ffmpegPath');

// Configure FFmpeg path
ffmpeg.setFfmpegPath(getFfmpegBinaryPath());

const fixturesDir = path.join(__dirname, 'test-fixtures');

// Ensure directory exists
if (!fs.existsSync(fixturesDir)) {
  fs.mkdirSync(fixturesDir, { recursive: true });
}

// Test video specifications
const testVideos = [
  { name: 'main_audio.mp4', duration: 3, hasAudio: true, width: 1280, height: 720 },
  { name: 'main_silent.mp4', duration: 3, hasAudio: false, width: 1280, height: 720 },
  { name: 'overlay_audio.mp4', duration: 2, hasAudio: true, width: 640, height: 480 },
  { name: 'overlay_silent.mp4', duration: 2, hasAudio: false, width: 640, height: 480 },
];

function createTestVideo(spec) {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(fixturesDir, spec.name);
    
    console.log(`Creating ${spec.name}...`);
    
    let command = ffmpeg()
      .input('color=c=blue:size=1280x720:duration=3')
      .inputFormat('lavfi')
      .size(`${spec.width}x${spec.height}`)
      .fps(30);
    
    if (spec.hasAudio) {
      command = command
        .input('sine=frequency=1000:duration=3')
        .inputFormat('lavfi')
        .audioCodec('aac')
        .audioBitrate('128k');
    } else {
      command = command
        .noAudio();
    }
    
    command
      .videoCodec('libx264')
      .outputOptions(['-preset', 'ultrafast', '-crf', '23'])
      .output(outputPath)
      .on('end', () => {
        console.log(`✓ Created ${spec.name}`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error(`✗ Failed to create ${spec.name}:`, err.message);
        reject(err);
      })
      .run();
  });
}

async function createAllFixtures() {
  console.log('Creating test video fixtures...');
  
  try {
    for (const spec of testVideos) {
      await createTestVideo(spec);
    }
    console.log('✓ All test fixtures created successfully');
  } catch (error) {
    console.error('✗ Failed to create test fixtures:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  createAllFixtures();
}

module.exports = { createAllFixtures, testVideos };
