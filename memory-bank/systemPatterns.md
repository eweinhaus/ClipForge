# System Patterns: ClipForge MVP

## System Architecture Overview

The ClipForge MVP is structured as an Electron desktop application, combining a Node.js backend (main process) with a React frontend (renderer process). Communication between these two processes occurs via Inter-Process Communication (IPC).

**Current Implementation Status:** ✅ PR-1 through PR-4 Complete - Core functionality implemented

```
electron/
  preload.js          ✅ IPC bridge with contextBridge
  main.js             ✅ App window + lifecycle + IPC handlers
  utils/
    ffmpegPath.js     ✅ FFmpeg path resolution (dev/prod)
  resources/
    ffmpeg/           ✅ Bundled FFmpeg binaries (darwin-x64)
      darwin-x64/
        ffmpeg        ✅ Executable binary
        ffprobe       ✅ Executable binary
  fileManager.js      ✅ Implemented (PR-2)
  mediaProcessor.js   🔄 Stub (PR-5)
  captureService.js   🔄 Stub (Future)

src/
  App.jsx             ✅ Root component with FileImporter, Timeline, VideoPreview, Notifications
  components/
    FileImporter.jsx  ✅ Implemented (PR-2)
    Timeline.jsx      ✅ Implemented (PR-2)
    VideoPreview.jsx  ✅ Implemented (PR-3)
    ClipEditor.jsx    ✅ Implemented (PR-4)
    ExportDialog.jsx  🔄 Stub (PR-5)
    Notifications.jsx ✅ Implemented (PR-2)
  utils/              ✅ Implemented (uuid, formatters, constants, toastContext)
  styles/
    main.css          ✅ Implemented (PR-2)
```

## Key Technical Decisions ✅ IMPLEMENTED

*   **Framework:** Electron Forge with webpack template for development and packaging
*   **Frontend:** React 18 with hooks, JSX support via babel-loader
*   **State Management:** React's `useState`/`useReducer` (to be implemented)
*   **Media Processing:** `fluent-ffmpeg` installed and configured
*   **IPC Usage:** ✅ Secure contextBridge implementation with stub handlers
*   **FFmpeg Bundling:** ✅ Successfully bundled via `extraResource` in forge.config.js
*   **Security:** ✅ contextIsolation: true, nodeIntegration: false
*   **Window Config:** ✅ 1400x900, min 1000x600, proper webPreferences

## Component Relationships and Data Model

### Clip Object ✅ IMPLEMENTED (PR-2)

```javascript
{
  id: string (uuid),
  fileName: string,
  filePath: string (absolute path),
  source: 'import',
  duration: number (seconds),
  width: number (pixels),
  height: number (pixels),
  trimStart: number (seconds, default 0),
  trimEnd: number (seconds, default duration),
  thumbnail: string (base64 image),
  order: number (position in timeline),
  error: string | null
}
```

### App State ✅ IMPLEMENTED (PR-2)

```javascript
{
  clips: Clip[],
  selectedClipId: string | null,
  currentPlaybackTime: number,
  isPlaying: boolean,
  exportProgress: number (0-100),
  isExporting: boolean,
  error: string | null,
  successMessage: string | null
}
```

## IPC Communication Pattern ✅ IMPLEMENTED

### Preload Script (src/preload.js)
```javascript
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  readMetadata: (filePath) => ipcRenderer.invoke('read-metadata', filePath),
  
  // Export operations
  exportTimeline: (data) => ipcRenderer.invoke('export-timeline', data),
  onExportProgress: (callback) => ipcRenderer.on('export-progress', callback),
  
  // Utility
  selectFile: () => ipcRenderer.invoke('select-file'),
  selectSaveLocation: () => ipcRenderer.invoke('select-save-location')
});
```

### Main Process Handlers (src/main.js)
```javascript
// All handlers registered as stubs, ready for implementation
ipcMain.handle('read-metadata', async (event, filePath) => {
  throw new Error('Not implemented - will be added in PR-2');
});
// ... other handlers
```

## Trim Functionality ✅ IMPLEMENTED (PR-4)

### ClipEditor Component
- **Location:** `src/components/ClipEditor.jsx`
- **Purpose:** Allows users to set trim start/end points for selected clips
- **Features:**
  - Number inputs for trim start/end (in seconds)
  - Real-time validation with error messages
  - Apply/Reset buttons with proper state management
  - Compact horizontal layout design
  - Displays original vs trimmed duration

### VideoPreview Integration
- **Trim-aware Playback:** Video respects trim points during playback
- **Clamping Logic:** Prevents playback outside trim range
- **Scrubber Bounds:** Min/max values reflect trim range
- **Duration Display:** Shows trimmed duration in metadata
- **Seek Behavior:** Automatically seeks to trim start when clip loads

### State Management
- **Clip Object:** Enhanced with `trimStart` and `trimEnd` properties
- **Persistence:** Trim values survive clip switching
- **Validation:** Comprehensive input validation with user-friendly errors
- **Error Handling:** Graceful handling of invalid trim ranges

## Build & Packaging ✅ IMPLEMENTED

*   **Development:** `npm start` - Webpack dev server + Electron
*   **Production:** `npm run make` - Creates packaged .zip with bundled FFmpeg
*   **FFmpeg Path Resolution:** Automatic detection of dev vs production paths
*   **Output:** `out/make/zip/darwin/x64/clipforge-darwin-x64-1.0.0.zip`
