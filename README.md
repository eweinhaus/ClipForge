# ClipForge

**A minimal desktop video editor built with Electron, React, and FFmpeg.**

ClipForge is a streamlined video editing application that focuses on the core workflow: import → preview → trim → export. Perfect for quick video editing tasks without the complexity of professional-grade software.

---

## ✨ Features

### Core Video Editing
- **Import Videos**: Drag-and-drop or file picker support for MP4, MOV, and WebM files
- **Preview & Playback**: Smooth video playback with play/pause controls and scrubbing
- **Professional Timeline**: Horizontal timeline with visual clip blocks and thumbnails
- **Trim Clips**: Set precise start and end points for video segments with drag-to-trim
- **Drag-and-Drop Reordering**: Easily reorder clips in your timeline
- **Snap-to-Grid**: Precise trimming with 1-second grid snapping
- **Multi-level Zoom**: Smooth zoom from 0.25x to 4x with zoom slider
- **Keyboard Navigation**: Arrow keys for timeline navigation and clip selection
- **Context Menu**: Right-click clip operations (Duplicate, Reset Trim, Delete)
- **Export to MP4**: Combine trimmed and ordered clips into a single MP4 file

### Recording Capabilities
- **Screen Recording**: Capture full screen or specific windows with audio
- **Webcam Recording**: Record with camera and microphone, auto-assigned to overlay track
- **Composite Recording**: Screen + webcam picture-in-picture recording
- **Permission Handling**: Graceful permission request flow for screen and camera access

### Advanced Features
- **Multi-Track Timeline**: Main and overlay tracks for video compositing
- **Audio Controls**: Per-clip volume slider (0-100%) and mute toggle
- **Real-time Preview**: Volume control during playback
- **Visual Indicators**: Mute icons on timeline clips
- **Export Audio Sync**: Audio levels and mute settings respected in export

### UI & UX
- **Keyboard Shortcuts**: Efficient workflow with comprehensive shortcut support
- **Preference Persistence**: Timeline zoom and scroll position remembered
- **Error Recovery**: Robust error handling with graceful fallbacks
- **Accessibility**: Screen reader support and keyboard navigation
- **Professional Polish**: Icons, animations, and smooth interactions

---

## 🖥️ System Requirements

- **Operating System**: macOS 10.13 or later
- **Disk Space**: 500MB free disk space
- **Memory**: 4GB RAM recommended

---

## 📦 Installation

### Download Pre-built App

1. Download the latest release from the [Releases](https://github.com/yourusername/clipforge/releases) page
2. Extract the `.zip` file
3. Drag `ClipForge.app` to your Applications folder
4. Launch ClipForge from Applications

### Build from Source

```bash
# Clone the repository
git clone https://github.com/yourusername/clipforge.git
cd clipforge

# Install dependencies
npm install

# Run in development mode
npm start

# Build for production
npm run make
```

---

## 🚀 Usage

### Quick Start

1. **Import Videos**
   - Drag video files onto the app window, or
   - Click "Or choose files" to select videos from your file system

2. **Record Content**
   - Click "Record Screen" to capture your screen
   - Click "Record Webcam" to record with your camera
   - Click "Record Screen + Camera" for picture-in-picture recording
   - Grant permissions when prompted by macOS

3. **Preview & Edit**
   - Click a clip in the timeline to preview it
   - Use the play/pause button or press Space to control playback
   - Set trim start and end points in the Clip Editor panel or drag clip edges
   - Adjust volume with the slider or mute with the toggle button
   - Click "Apply" to save trim changes

4. **Timeline Navigation**
   - Use arrow keys to navigate: ← → for seeking, ↑ ↓ for clip selection
   - Right-click clips for context menu (Duplicate, Reset Trim, Delete)
   - Use zoom slider for precise editing (0.25x to 4x)
   - Click "Fit to Screen" to auto-zoom all clips
   - Drag clips between Main and Overlay tracks for compositing

5. **Reorder Clips**
   - Drag clips horizontally in the timeline to change their order
   - Drag clips between tracks to change their layer

6. **Export**
   - Click "Export Timeline" or press Cmd+E
   - Choose an output location
   - Wait for the export to complete
   - Your final video will be saved as an MP4 file with all tracks composited

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Space` | Play / Pause video |
| `Delete` | Delete selected clip |
| `⌘ + E` | Open export dialog |
| `Esc` | Close dialogs |
| `Tab` | Navigate between elements |
| `←` | Seek playhead backward (1 second) |
| `→` | Seek playhead forward (1 second) |
| `↑` | Select previous clip |
| `↓` | Select next clip |

---

## 🏗️ Architecture

ClipForge is built with a modern Electron + React stack:

- **Frontend**: React 18 with hooks for UI components
- **Backend**: Electron main process for file I/O and FFmpeg operations
- **Media Processing**: FFmpeg (bundled) for video manipulation
- **Drag & Drop**: @dnd-kit for smooth reordering
- **IPC**: Secure contextBridge for renderer-main communication

### Project Structure

```
ClipForge/
├── electron/              # Main process code
│   ├── main.js           # App window & lifecycle
│   ├── preload.js        # IPC bridge
│   ├── fileManager.js    # File I/O operations
│   ├── mediaProcessor.js # FFmpeg export logic
│   └── captureService.js # Screen/webcam capture (future)
├── src/                  # Renderer process (React)
│   ├── App.jsx           # Root component
│   ├── components/       # UI components
│   ├── utils/            # Helper functions
│   └── styles/           # CSS files
└── planning/             # Documentation & PRD
```

For detailed architecture information, see [architecture.mermaid](planning/architecture.mermaid).

---

## 🔧 Development

### Prerequisites

- Node.js 16+ ([Download](https://nodejs.org/))
- npm (comes with Node.js)

### Development Workflow

```bash
# Install dependencies
npm install

# Start development server (hot reload enabled)
npm start

# Package app for distribution
npm run make

# Output will be in out/make/
```

### Tech Stack

- **Electron Forge**: Project scaffolding and packaging
- **React 18**: UI framework
- **Webpack**: Module bundler
- **FFmpeg**: Video processing (bundled with app)
- **lucide-react**: Icon library

---

## 🐛 Known Limitations

- **H.264 codec only**: Limited codec support in current version
- **No transitions or effects**: Basic cuts only (for now)
- **macOS only**: Windows and Linux support planned
- **Console logs present**: Debug logging in capture service (non-critical)
- **Test coverage**: Some test failures in development environment

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- Video processing powered by [FFmpeg](https://ffmpeg.org/)
- Icons from [Lucide](https://lucide.dev/)

---

## 📧 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/clipforge/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/clipforge/discussions)

---

**Made with ❤️ for quick video editing**
