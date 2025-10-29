# ClipForge v1.0.0 - Full Submission Release

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

1. Download the `clipforge-darwin-x64-1.0.0.zip` file
2. Extract the ZIP file
3. Drag `clipforge.app` to your Applications folder
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
