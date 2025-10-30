# Tech Context: ClipForge MVP

## Technologies Used ✅ IMPLEMENTED

*   **Framework:** Electron Forge with webpack template ✅
*   **Frontend:** React 18 with hooks ✅
*   **Build Tools:** Webpack with babel-loader for JSX ✅
*   **Media Processing:** `fluent-ffmpeg` (Node.js wrapper for FFmpeg) ✅
*   **Media Capture:** Web APIs (getDisplayMedia, getUserMedia, MediaRecorder) ✅
*   **Screen Sources:** Electron desktopCapturer API ✅
*   **Package Manager:** npm ✅
*   **IPC Security:** contextBridge with contextIsolation ✅

## Export Resolution Technologies ✅ IMPLEMENTED (EXPORT-RESOLUTION-1)

### FFmpeg Scale Filters
*   **force_original_aspect_ratio=decrease:** Prevents upscaling, maintains aspect ratio
*   **pad filter:** Adds letterboxing/pillarboxing for aspect ratio preservation
*   **setpts=PTS-STARTPTS:** Resets presentation timestamps for proper concatenation

### Bitrate Management
*   **Dynamic Bitrate Scaling:** Quality presets adjust bitrate (High: 100%, Medium: 70%, Low: 50%)
*   **Resolution-Based Base Rates:** 480p (2-2.5 Mbps), 720p (5-6.25 Mbps), 1080p (8-10 Mbps)
*   **Buffer Size Optimization:** Prevents buffer underruns with appropriate buffer sizes

### Validation Technologies
*   **Canvas API:** For thumbnail generation and resolution analysis
*   **Real-time Validation:** React useEffect hooks for immediate feedback
*   **Upscaling Detection:** Pixel count comparison for quality warnings

### UI Technologies
*   **React State Management:** useState for resolution/quality selection
*   **CSS Grid Layout:** Two-column responsive layout for options
*   **Lucide React Icons:** Consistent iconography throughout interface
*   **Responsive Design:** Mobile-friendly layout adjustments

## Recording Technologies ✅ IMPLEMENTED (PR-RECORDING-1)

### Web APIs Used
*   **getDisplayMedia API:** Modern screen capture API for Chrome/Electron
*   **getUserMedia API:** Camera and microphone access
*   **MediaRecorder API:** Recording MediaStream to blob chunks
*   **MediaStream API:** Managing and combining audio/video tracks

### Electron APIs Used
*   **desktopCapturer:** Enumerate available screens and windows
*   **session permissions:** Grant camera/microphone/screen recording permissions

### Codec Support
*   **WebM with VP9:** Primary codec (best quality)
*   **WebM with VP8:** Fallback codec (good compatibility)
*   **WebM:** Basic fallback (no specific codec)
*   **MP4:** Future support planned (limited browser support currently)

## Development Setup ✅ WORKING

### Prerequisites

*   Node.js 16+ (`node -v` to check) ✅
*   FFmpeg (for development): `brew install ffmpeg` on macOS ⚠️

### Development Workflow ✅ TESTED

1.  **Install Dependencies:** `npm install` ✅
2.  **Start Development Server:** `npm start` ✅
   - Launches Electron app with webpack dev server
   - Window opens at 1400x900 with DevTools
   - React app renders successfully

### Packaging for Distribution ✅ WORKING

1.  **Build Command:** `npm run make` ✅
2.  **Output:** Generates a `.zip` file: `out/make/zip/darwin/x64/clipforge-darwin-x64-1.0.0.zip` ✅

### Testing Packaged App ✅ VERIFIED

1. Extract the `.zip` file ✅
2. Launch the application: `./clipforge.app/Contents/MacOS/clipforge` ✅
3. **FFmpeg Status:** Working! "FFmpeg is working! Formats available: 409" ✅

## Technical Constraints and Dependencies ✅ IMPLEMENTED

*   **FFmpeg Bundling:** ✅ Successfully bundled within the packaged app using `extraResource` in forge.config.js
*   **IPC for Native Operations:** ✅ Secure contextBridge implementation with all handlers for PR-2
*   **macOS as Target Platform:** ✅ Tested and working on macOS (darwin-x64)
*   **Electron Forge:** ✅ Used for project scaffolding, development, and packaging
*   **Security:** ✅ contextIsolation: true, nodeIntegration: false
*   **Window Configuration:** ✅ 1400x900, min 1000x600, proper webPreferences

## Current Package.json Scripts ✅ WORKING

```json
{
  "scripts": {
    "start": "electron-forge start",     ✅ Working
    "package": "electron-forge package", ✅ Working  
    "make": "electron-forge make",       ✅ Working
    "publish": "electron-forge publish",  🔄 Not tested
    "lint": "echo \"No linting configured\"" ✅ Working
  }
}
```

## Dependencies Status

### Installed ✅
- `electron` - Core framework
- `react` - UI library  
- `react-dom` - React DOM rendering
- `fluent-ffmpeg` - FFmpeg wrapper (export functionality)
- `@babel/preset-react` - JSX compilation
- `babel-loader` - Webpack loader
- `copy-webpack-plugin` - For copying FFmpeg binaries in dev
- `@dnd-kit/core` - Modern drag and drop (PR-6)
- `@dnd-kit/sortable` - Sortable list support (PR-6)
- `lucide-react` - SVG icon library (PR-7)

### Not Required (Built-in or Utility)
- `uuid` - Implemented as utility function, not separate package
- `react-hot-toast` - Implemented custom toast system with context API

## Known Technical Issues

*   **EGL Errors:** Normal macOS warnings in console, don't affect functionality
*   **Autofill Errors:** DevTools warnings, don't affect functionality
*   **Recording Permissions:** macOS requires manual permission grant in System Preferences for Screen Recording and Camera
*   **Recording ClipForge:** Recording ClipForge's own window causes blank screens - user is warned automatically
*   **WebM Format:** Recordings are in WebM format - FFmpeg converts to MP4 during export
