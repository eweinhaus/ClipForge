#!/usr/bin/env node

/**
 * GitHub Release Creation Script for ClipForge
 * Creates a release with the packaged .dmg file
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Creating GitHub Release for ClipForge v1.0.0');
console.log('================================================\n');

// Check if we're in a git repository
try {
  execSync('git status', { stdio: 'pipe' });
} catch (error) {
  console.error('❌ Not in a git repository. Please run this from the project root.');
  process.exit(1);
}

// Check if the .dmg file exists
const dmgPath = 'out/make/zip/darwin/x64/clipforge-darwin-x64-1.0.0.zip';
if (!fs.existsSync(dmgPath)) {
  console.error('❌ .dmg file not found. Please run "npm run make" first.');
  process.exit(1);
}

console.log('✅ Found packaged app:', dmgPath);
console.log('📦 File size:', (fs.statSync(dmgPath).size / 1024 / 1024).toFixed(2), 'MB');

// Create release notes
const releaseNotes = `# ClipForge v1.0.0 - Full Submission Release

## 🎉 Complete Video Editor

ClipForge is a desktop video editor built with Electron, React, and FFmpeg. This release includes all MVP and Full Submission features.

## ✨ Features

### Core Video Editing
- **Import & Preview**: Drag & drop video files, instant preview
- **Timeline Editing**: Professional horizontal timeline with drag & drop
- **Trim Clips**: Precise in/out point editing with visual feedback
- **Export**: High-quality MP4 export with progress tracking

### Recording Capabilities
- **Screen Recording**: Capture full screen or specific windows
- **Webcam Recording**: Record with camera and microphone
- **Composite Recording**: Screen + webcam picture-in-picture
- **Permission Handling**: Graceful permission request flow

### Advanced Features
- **Multi-Track Timeline**: Main and overlay tracks for compositing
- **Audio Controls**: Per-clip volume and mute controls
- **Professional UI**: Icons, animations, and accessibility support
- **Keyboard Shortcuts**: Full keyboard navigation support

## 🛠 Technical Details

- **Platform**: macOS (Intel x64)
- **Framework**: Electron 38.4.0
- **UI**: React 19.2.0
- **Video Processing**: FFmpeg (bundled)
- **Architecture**: Main/renderer process separation

## 📋 System Requirements

- macOS 10.15 or later
- 4GB RAM minimum (8GB recommended)
- 500MB free disk space

## 🚀 Installation

1. Download the \`clipforge-darwin-x64-1.0.0.zip\` file
2. Extract the ZIP file
3. Drag \`clipforge.app\` to your Applications folder
4. Launch ClipForge from Applications or Spotlight

## 🎯 What's New in v1.0.0

- Complete MVP feature set (import, preview, trim, export)
- Professional horizontal timeline with advanced editing
- Screen and webcam recording capabilities
- Multi-track timeline for compositing
- Audio controls and volume management
- Comprehensive UI polish and accessibility
- Production-ready packaging and distribution

## 🐛 Known Issues

- Console logs present in capture service (debugging)
- Some test failures in development environment
- Performance may vary on older hardware

## 📝 License

MIT License - see LICENSE file for details

## 🏗 Built With

- Electron Forge for packaging
- React for UI components
- FFmpeg for video processing
- Jest for testing
- Playwright for E2E testing

---

**Built in 72 hours for the Gauntlet Challenge** ⚡
`;

// Write release notes to file
fs.writeFileSync('RELEASE_NOTES_v1.0.0.md', releaseNotes);
console.log('✅ Created release notes: RELEASE_NOTES_v1.0.0.md');

// Create git tag
try {
  console.log('🏷️  Creating git tag v1.0.0...');
  execSync('git tag -a v1.0.0 -m "ClipForge v1.0.0 - Full Submission Release"', { stdio: 'inherit' });
  console.log('✅ Git tag created successfully');
} catch (error) {
  console.log('⚠️  Git tag may already exist, continuing...');
}

// Instructions for manual release creation
console.log('\n📋 Manual Release Creation Steps:');
console.log('==================================');
console.log('1. Push the tag to GitHub:');
console.log('   git push origin v1.0.0');
console.log('');
console.log('2. Go to GitHub repository:');
console.log('   https://github.com/[username]/ClipForge/releases');
console.log('');
console.log('3. Click "Create a new release"');
console.log('');
console.log('4. Select tag "v1.0.0"');
console.log('');
console.log('5. Release title: "ClipForge v1.0.0 - Full Submission Release"');
console.log('');
console.log('6. Copy content from RELEASE_NOTES_v1.0.0.md');
console.log('');
console.log('7. Upload the .dmg file:');
console.log(`   ${dmgPath}`);
console.log('');
console.log('8. Check "Set as the latest release"');
console.log('');
console.log('9. Click "Publish release"');
console.log('');
console.log('✅ Release creation script complete!');
console.log('🎯 Ready for GitHub release publication');
