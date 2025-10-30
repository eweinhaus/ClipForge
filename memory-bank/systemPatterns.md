# System Patterns: ClipForge MVP

## System Architecture Overview

The ClipForge MVP is structured as an Electron desktop application, combining a Node.js backend (main process) with a React frontend (renderer process). Communication between these two processes occurs via Inter-Process Communication (IPC).

**Current Implementation Status:** ✅ MVP Complete - Horizontal Timeline UI Complete - Recording Feature In Progress

```
electron/
  preload.js          ✅ IPC bridge with contextBridge
  main.js             ✅ App window + lifecycle + IPC handlers + recording permissions
  utils/
    ffmpegPath.js     ✅ FFmpeg path resolution (dev/prod)
  resources/
    ffmpeg/           ✅ Bundled FFmpeg binaries (darwin-x64)
      darwin-x64/
        ffmpeg        ✅ Executable binary
        ffprobe       ✅ Executable binary
  fileManager.js      ✅ Implemented (PR-2)
  mediaProcessor.js   ✅ Implemented (PR-5) + Enhanced (EXPORT-RESOLUTION-1)
  captureService.js   ✅ Implemented (PR-RECORDING-1) - Source enumeration & permissions

src/
  App.jsx             ✅ Root component with FileImporter, Timeline, VideoPreview, RecordingPanel, Notifications
  components/
    FileImporter.jsx  ✅ Implemented (PR-2)
    Timeline.jsx      ✅ Replaced with horizontal timeline (PR-UI-1)
    VideoPreview.jsx  ✅ Implemented (PR-3)
    ClipEditor.jsx    ✅ Implemented (PR-4)
    ExportDialog.jsx  ✅ Implemented (PR-5) + Enhanced (EXPORT-RESOLUTION-1)
    Notifications.jsx ✅ Implemented (PR-2)
    RecordingPanel.jsx ✅ Implemented (PR-RECORDING-1) - Recording controls UI
    TimelineContainer.jsx ✅ Implemented (PR-UI-1)
    TimeRuler.jsx     ✅ Implemented (PR-UI-1)
    TrackArea.jsx     ✅ Implemented (PR-UI-1)
    Playhead.jsx      ✅ Implemented (PR-UI-1)
    TimelineControls.jsx ✅ Implemented (PR-UI-1)
    ClipBlock.jsx     ✅ Implemented (PR-UI-1)
    ContextMenu.jsx   ✅ Implemented (PR-UI-4)
    TimelineErrorBoundary.jsx ✅ Implemented (PR-UI-4)
    HelpDialog.jsx    ✅ Updated (PR-UI-4)
  hooks/
    useTimelineKeyboard.js ✅ Implemented (PR-UI-4)
    useThumbnailPreload.js ✅ Implemented (PR-UI-3)
  utils/              ✅ Implemented (uuid, formatters, constants, toastContext, timelineUtils)
    rendererCaptureService.js ✅ Implemented (PR-RECORDING-1) - Core recording logic
  styles/
    main.css          ✅ Updated for horizontal timeline layout (PR-UI-1)
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

### Clip Object ✅ IMPLEMENTED (PR-2) + ENHANCED (MULTITRACK-1)

```javascript
{
  id: string (uuid),
  fileName: string,
  filePath: string (absolute path),
  source: 'import' | 'screen' | 'webcam' | 'screen+webcam',
  duration: number (seconds),
  width: number (pixels),
  height: number (pixels),
  trimStart: number (seconds, default 0),
  trimEnd: number (seconds, default duration),
  thumbnail: string (base64 image),
  order: number (position in timeline),
  track: 'main' | 'overlay' | 'audio' (default 'main'),
  error: string | null,
  // Optional properties for enhanced features
  hasAudio?: boolean,
  audioVolume?: number (0-1),
  isMuted?: boolean,
  pipSettings?: {
    position: string,
    size: number,
    opacity: number
  },
  isComposite?: boolean
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
  selectFile: () => ipcRenderer.invoke('select-file'),
  handleDroppedFiles: (files) => ..., // webUtils.getPathForFile() conversion
  
  // Export operations
  exportTimeline: (data) => ipcRenderer.invoke('export-timeline', data),
  onExportProgress: (callback) => ipcRenderer.on('export-progress', callback),
  selectSaveLocation: () => ipcRenderer.invoke('select-save-location'),
  
  // Recording operations
  getSources: () => ipcRenderer.invoke('get-sources'),
  testScreenPermissions: () => ipcRenderer.invoke('test-screen-permissions'),
  requestScreenPermission: () => ipcRenderer.invoke('request-screen-permission'),
  writeRecordingFile: (outputPath, buffer) => ipcRenderer.invoke('write-recording-file', outputPath, buffer),
  getHomeDir: () => ipcRenderer.invoke('get-home-dir')
});
```

### Main Process Handlers (src/main.js)
```javascript
// File operations
ipcMain.handle('read-metadata', async (event, filePath) => {
  const metadata = await fileManager.getMetadata(filePath);
  return { success: true, data: metadata };
});

// Export operations
ipcMain.handle('export-timeline', async (event, { clips, outputPath }) => {
  await mediaProcessor.exportTimeline(clips, outputPath, (progress) => {
    mainWindow.webContents.send('export-progress', progress);
  });
  return { success: true, outputPath };
});

// Recording operations
ipcMain.handle('get-sources', async () => {
  const sources = await captureService.getSources();
  return { success: true, data: sources };
});

ipcMain.handle('test-screen-permissions', async () => {
  const hasPermission = await captureService.testScreenPermissions();
  return { success: true, data: hasPermission };
});

ipcMain.handle('write-recording-file', async (event, outputPath, uint8Array) => {
  const buffer = Buffer.from(uint8Array);
  fs.writeFileSync(outputPath, buffer);
  return { success: true };
});

ipcMain.handle('get-home-dir', async () => {
  const homeDir = require('os').homedir();
  return { success: true, data: homeDir };
});
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

## Horizontal Timeline Architecture ✅ IMPLEMENTED (PR-UI-1 through PR-UI-4)

### Timeline Component Structure ✅ IMPLEMENTED
```
TimelineContainer (main wrapper)
├── TimelineHeader
│   ├── TrackLabel ("Video 1")
│   └── TrackControls
├── TimelineContent
│   ├── TimeRuler (00:00:05:00 format)
│   ├── TrackArea
│   │   └── ClipBlock (multiple, duration-based width)
│   └── Playhead (red line, synced with preview)
└── TimelineControls
    ├── ZoomSlider (0.25x to 4x)
    ├── FitToScreen Button
    ├── SnapToGrid Toggle
    └── ScrollControls
```

### Additional Components ✅ IMPLEMENTED
- **ContextMenu:** Right-click menu for clip operations (Delete, Duplicate, Reset Trim)
- **TimelineErrorBoundary:** Error boundary for graceful error handling
- **useTimelineKeyboard:** Custom hook for arrow-key navigation and split shortcut (S key)
- **timelineUtils:** Utility functions for calculations, debouncing, and playhead validation
  - **isPlayheadWithinClip:** Validates if playhead is within a clip's trimmed range (for split functionality)

### Timeline State Management ✅ IMPLEMENTED
```javascript
// Extended clip state for timeline
const clipState = {
  // Existing properties
  id, fileName, filePath, duration, width, height, thumbnail,
  trimStart, trimEnd, order, track,
  
  // Timeline properties
  timelinePosition: 0,        // Position in timeline (seconds)
  timelineWidth: 100,         // Width in pixels
  isSelected: false,          // Selection state
  isDragging: false,          // Drag state
  isTrimming: false           // Trim state
};

// Timeline state with persistence
const timelineState = {
  zoomLevel: 1,               // Current zoom level (persisted)
  scrollPosition: 0,         // Horizontal scroll position (persisted)
  playheadPosition: 0,       // Playhead position in seconds
  snapToGrid: true,          // Snap-to-grid enabled (persisted)
  trackHeight: 60,           // Height of each track
  timelineHeight: 200        // Total timeline height
};
```

### Key Features ✅ IMPLEMENTED
- **Keyboard Navigation:** Arrow keys for playhead seeking and clip selection
- **Split Clips:** Split clip at playhead position with button or 'S' key shortcut
- **Context Menu:** Right-click operations (Delete, Duplicate, Reset Trim)
- **Zoom Controls:** Smooth slider (0.25x-4x) and fit-to-screen button
- **Preference Persistence:** localStorage for zoom, scroll, and snap settings
- **Error Boundaries:** Graceful error handling with recovery options
- **Performance:** 60fps maintained with 10+ clips

### Layout Changes ✅ IMPLEMENTED
- **Timeline Position:** Bottom of screen, 200px height (fixed)
- **Panel Layout:** Three-panel design (media left, preview center, timeline bottom)
- **Rendering:** DOM-based for simplicity and maintainability
- **Theme:** Professional styling with hover states and visual feedback
- **Responsive:** Maintains performance with multiple clips and zoom levels
- **Clip Positioning:** Sequential positioning based on trimmed duration (no gaps between clips)
  - **Note:** trimStart/trimEnd affect video playback timing only, not timeline positioning
  - This ensures split clips appear seamlessly connected without visual gaps

## Recording Architecture ✅ IMPLEMENTED (PR-RECORDING-1)

### Recording System Overview
The recording system allows users to capture screen, webcam, or both simultaneously directly within ClipForge. Recordings are automatically added to the timeline for immediate editing.

### Architecture Decisions
*   **Renderer-side Recording:** Core recording logic runs in renderer process using Web APIs (getDisplayMedia, getUserMedia, MediaRecorder)
*   **Main Process Role:** Provides source enumeration (desktopCapturer) and permission testing only
*   **IPC Bridge:** Minimal IPC communication - only for getting sources, testing permissions, and writing files
*   **Stream Management:** All media streams handled in renderer for better performance and API compatibility

### Recording Flow
```
User clicks "Record Screen"
    ↓
App.jsx: handleStartRecord()
    ↓
1. Test permissions (via IPC)
    ↓
2. Get available sources (via IPC)
    ↓
3. Auto-select non-ClipForge source
    ↓
4. Call rendererCaptureService.startScreenRecord(sourceId)
    ↓
5. getDisplayMedia() or getUserMedia() → MediaStream
    ↓
6. Setup MediaRecorder with codec detection
    ↓
7. Start recording with chunk collection (1-second intervals)
    ↓
8. Update UI with elapsed time
    ↓
User clicks "Stop Recording"
    ↓
App.jsx: handleStopRecord()
    ↓
1. Stop MediaRecorder
    ↓
2. Combine chunks into Blob
    ↓
3. Convert to Uint8Array
    ↓
4. Write file via IPC (writeRecordingFile)
    ↓
5. Clean up all streams
    ↓
6. Generate thumbnail
    ↓
7. Create clip object and add to timeline
    ↓
8. Show success toast
```

### Recording Types
*   **Screen Recording:**
    - Uses getDisplayMedia API (modern) with desktopCapturer fallback (legacy)
    - Captures screen video + microphone audio separately
    - Resolution: up to 1920x1080 @ 30fps
    - Audio: Microphone input with echo cancellation and noise suppression
*   **Webcam Recording:**
    - Uses getUserMedia API with video + audio constraints
    - Resolution: 1280x720
    - Audio: Built-in microphone with audio processing
*   **Composite Recording (Screen + Webcam):**
    - Combines screen video stream with webcam audio stream
    - Simplified approach to avoid canvas compositing issues
    - Screen video as primary, webcam audio for narration
    - Note: Picture-in-picture visual compositing is planned for future

### Codec Selection Strategy
The system attempts codecs in priority order until one is supported:
1. `video/webm;codecs=vp9` (Best quality, modern browsers)
2. `video/webm;codecs=vp8` (Good compatibility)
3. `video/webm` (Basic WebM)
4. `video/mp4` (Fallback, limited browser support)

### Permission Handling
*   **Screen Recording:** macOS requires Screen Recording permission in System Preferences
*   **Camera Access:** macOS requires Camera permission in System Preferences
*   **Permission Flow:**
    1. Test if permissions already granted
    2. If not, trigger permission request via API call
    3. Show user-friendly error message with System Preferences guidance
    4. Handle permission denial gracefully

### Error Handling
*   **Permission Errors:** NotAllowedError → User-friendly message with System Preferences guidance
*   **No Sources:** Empty sources list → Warning to user
*   **Recording ClipForge:** Auto-detect and warn user (causes blank screens)
*   **Stream Cleanup:** Automatic cleanup on error, stop, or component unmount
*   **Timeout Protection:** 5-minute recording timeout to prevent hanging

### File Management
*   **Output Format:** WebM with best available codec
*   **File Naming:** `{type}_{timestamp}.webm` (e.g., `screen_1698765432000.webm`)
*   **Save Location:** User's Desktop directory (~/Desktop/)
*   **File Writing:** IPC-based file writing to avoid renderer security restrictions

### Integration with Timeline
*   Recordings automatically added as clips after stopping
*   Clip metadata includes: fileName, filePath, duration, width, height, thumbnail
*   Source type tracked: 'screen', 'webcam', or 'screen+webcam'
*   Track assignment: 'main' for screen/webcam, 'overlay' for webcam in composite mode

## Export Resolution Options ✅ IMPLEMENTED (EXPORT-RESOLUTION-1)

### Export Resolution Architecture
The export system now supports multiple resolution and quality options with intelligent validation and processing.

### Resolution Options
```javascript
const resolutionOptions = {
  'source': null,           // Uses highest resolution among clips
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  '480p': { width: 854, height: 480 }
};
```

### Quality Presets
```javascript
const qualityPresets = {
  'high': 1.0,    // 100% of base bitrate
  'medium': 0.7,  // 70% of base bitrate
  'low': 0.5      // 50% of base bitrate
};

const baseBitrates = {
  '480p': { video: 2000, maxRate: 2500, bufferSize: 5000 },
  '720p': { video: 5000, maxRate: 6250, bufferSize: 12500 },
  '1080p': { video: 8000, maxRate: 10000, bufferSize: 20000 }
};
```

### Smart Validation System
```javascript
// Analyzes timeline clips for upscaling detection
const validateResolution = (clips, targetResolution) => {
  const upscaledClips = clips.filter(clip => 
    clip.width * clip.height < targetResolution.width * targetResolution.height
  );
  
  const upscalePercentage = (upscaledClips.length / clips.length) * 100;
  
  if (upscalePercentage > 25) {
    return { warning: 'strong', message: 'Consider using Source Resolution' };
  } else if (upscalePercentage > 0) {
    return { warning: 'info', message: 'Some clips will be upscaled' };
  }
  
  return { warning: null };
};
```

### FFmpeg Scale Filter Generation
```javascript
// Aspect ratio preservation with letterboxing
const generateScaleFilter = (targetResolution) => {
  const { width, height } = targetResolution;
  return `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`;
};
```

### Export Flow Integration
1. **UI Selection:** User selects resolution and quality in ExportDialog
2. **Validation:** Real-time validation warns about upscaling
3. **Processing:** mediaProcessor applies resolution and bitrate settings
4. **FFmpeg:** Scale filter preserves aspect ratio with letterboxing
5. **Progress:** Enhanced progress reporting with resolution context

### Component Updates
- **ExportDialog.jsx:** Added resolution/quality dropdowns with validation
- **mediaProcessor.js:** Added helper functions and enhanced export logic
- **App.jsx:** Updated export handler to pass options
- **HelpDialog.jsx:** Added export options documentation

## Multi-Track Architecture ✅ IMPLEMENTED (MULTITRACK-1 through MULTITRACK-9)

### Track System Overview
ClipForge supports three independent tracks for professional video compositing:
*   **Main Track (Video 1):** Primary video content, full-screen display
*   **Overlay Track (Video 2 - PiP):** Picture-in-picture overlay, scaled to 25% at bottom-right
*   **Audio Track:** Additional audio mixing with main video audio

### Track Configuration
```javascript
// From constants.js
const TRACK_CONFIG = [
  {
    id: 'main',
    label: 'Video 1',
    type: 'main',
    color: '#4a90e2', // Blue
    height: 80,
    acceptsVideo: true,
    acceptsAudio: true
  },
  {
    id: 'overlay',
    label: 'Video 2 (PiP)',
    type: 'overlay',
    color: '#e67e22', // Orange
    height: 80,
    acceptsVideo: true,
    acceptsAudio: false
  },
  {
    id: 'audio',
    label: 'Audio',
    type: 'audio',
    color: '#2ecc71', // Green
    height: 60,
    acceptsVideo: false,
    acceptsAudio: true
  }
];
```

### Timeline Component Updates
*   **TimelineHeader:** Vertical stack of track labels with visibility toggles
*   **TimelineContent:** Renders TrackArea for each visible track
*   **TrackArea:** Filters and displays clips for specific track
*   **ClipBlock:** Track-specific border colors and styling
*   **Timeline Height:** Increased to 240px to accommodate three tracks

### Export Pipeline Enhancement
```javascript
// Multi-track export flow
1. Group clips by track (main, overlay, audio)
2. Extract trimmed segments for each clip
3. Build FFmpeg filter_complex:
   - Concatenate clips within each track
   - Scale overlay to 25% and position at bottom-right
   - Mix audio tracks using amix filter
4. Generate final MP4 with composited output
```

### FFmpeg Filter Complex
```bash
# Example multi-track filter for 2 main + 1 overlay + 1 audio
[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[vmain][amain];
[2:v]scale=iw*0.25:ih*0.25[voverlay_scaled];
[vmain][voverlay_scaled]overlay=W-w-20:H-h-20[vout];
[amain][3:a]amix=inputs=2:duration=longest[aout]
```

### Track Assignment Logic
*   **Imported videos:** Automatically assigned to 'main' track
*   **Screen recordings:** Assigned to 'main' track
*   **Webcam recordings:** Assigned to 'overlay' track
*   **Audio-only files:** Assigned to 'audio' track (future enhancement)

### Track Visibility Management
*   Eye icon toggle buttons in TimelineHeader
*   Hidden tracks persisted to localStorage
*   Clips on hidden tracks excluded from rendering
*   Export includes all tracks regardless of visibility

### Backward Compatibility
*   Clips without track property default to 'main'
*   Single-track timelines use standard concatenation
*   Multi-track detection automatic based on clip track distribution

## Build & Packaging ✅ IMPLEMENTED

*   **Development:** `npm start` - Webpack dev server + Electron
*   **Production:** `npm run make` - Creates packaged .zip with bundled FFmpeg
*   **FFmpeg Path Resolution:** Automatic detection of dev vs production paths
*   **Output:** `out/make/zip/darwin/x64/clipforge-darwin-x64-1.0.0.zip`
*   **Permissions:** macOS requires Screen Recording and Camera permissions to be granted manually
