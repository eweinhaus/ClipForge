# System Patterns: ClipForge MVP

## System Architecture Overview

The ClipForge MVP is structured as an Electron desktop application, combining a Node.js backend (main process) with a React frontend (renderer process). Communication between these two processes occurs via Inter-Process Communication (IPC).

**Current Implementation Status:** ✅ PR-1 Complete - Foundation established

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
  fileManager.js      🔄 Stub (PR-2)
  mediaProcessor.js   🔄 Stub (PR-5)
  captureService.js   🔄 Stub (Future)

src/
  App.jsx             ✅ Root component with IPC testing
  components/
    FileImporter.jsx  🔄 Stub (PR-2)
    Timeline.jsx      🔄 Stub (PR-2)
    ClipEditor.jsx    🔄 Stub (PR-4)
    VideoPreview.jsx  🔄 Stub (PR-3)
    ExportDialog.jsx  🔄 Stub (PR-5)
    Notifications.jsx 🔄 Stub (PR-5)
  utils/              🔄 Empty (Future utilities)
  styles/
    main.css          🔄 Empty (Future styling)
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

### Clip Object (To be implemented in PR-2)

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

### App State (To be implemented in PR-2)

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

## Build & Packaging ✅ IMPLEMENTED

*   **Development:** `npm start` - Webpack dev server + Electron
*   **Production:** `npm run make` - Creates packaged .zip with bundled FFmpeg
*   **FFmpeg Path Resolution:** Automatic detection of dev vs production paths
*   **Output:** `out/make/zip/darwin/x64/clipforge-darwin-x64-1.0.0.zip`
