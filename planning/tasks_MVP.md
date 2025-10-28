# ClipForge MVP: Task Breakdown by PR
**Deadline: Tuesday, October 28, 10:59 PM CT**

---

## PR-1: Project Setup & Boilerplate
**Objective:** Get Electron + React boilerplate working with proper file structure and FFmpeg detection.

### Acceptance Criteria
- [ ] App launches in dev mode (`npm start`) in < 5 seconds
- [ ] App launches from packaged `.dmg` in < 5 seconds
- [ ] No console errors on launch
- [ ] FFmpeg detected and available to main process
- [ ] File structure matches architecture document
- [ ] Git repo initialized and pushed to GitHub

### Tasks

#### Task 1.1: Initialize Electron-Forge + React Boilerplate
- [ ] Create new Electron Forge project: `npx create-electron-app ClipForge --template webpack`
- [ ] Install React: `npm install react react-dom`
- [ ] Install build tools: `npm install --save-dev @babel/preset-react babel-loader`
- [ ] Configure webpack for JSX support
- [ ] Update `src/index.js` to mount React App component
- [ ] Test: `npm start` launches window

**Acceptance:** App window opens with blank React component visible.

---

#### Task 1.2: Set Up File Structure (electron/, src/, utils/)
- [ ] Create `electron/` directory structure:
  ```
  electron/
  ├── main.js
  ├── preload.js
  ├── fileManager.js
  ├── mediaProcessor.js
  ├── captureService.js
  └── resources/
      └── ffmpeg (binary)
  ```
- [ ] Create `src/` directory structure:
  ```
  src/
  ├── App.jsx
  ├── components/
  ├── utils/
  ├── styles/
  └── index.jsx
  ```
- [ ] Create `src/components/` with stub files:
  - FileImporter.jsx
  - Timeline.jsx
  - ClipEditor.jsx
  - VideoPreview.jsx
  - ExportDialog.jsx
  - Notifications.jsx

**Acceptance:** All directories and stub files created. No import errors.

---

#### Task 1.3: Set Up IPC Bridge (preload.js)
- [ ] Create `electron/preload.js` with IPC whitelist:
  ```javascript
  const { contextBridge, ipcRenderer } = require('electron');
  
  contextBridge.exposeInMainWorld('ipcRenderer', {
    invoke: ipcRenderer.invoke,
    on: ipcRenderer.on,
    send: ipcRenderer.send
  });
  ```
- [ ] Update `electron/main.js` to use preload in window creation
- [ ] Test: `window.ipcRenderer` available in renderer DevTools console

**Acceptance:** IPC bridge accessible from React component without errors.

---

#### Task 1.4: Detect/Bundle FFmpeg
- [ ] Install `@electron-builder/extra-resources` and `fluent-ffmpeg`
- [ ] Download FFmpeg binary for macOS arm64 and x86_64
- [ ] Place in `electron/resources/ffmpeg/` directory
- [ ] Update `electron-forge.config.js` to include FFmpeg in extraResources
- [ ] Create `electron/utils/ffmpegPath.js`:
  ```javascript
  const path = require('path');
  
  function getFFmpegPath() {
    if (process.env.NODE_ENV === 'development') {
      return 'ffmpeg'; // Use system FFmpeg in dev
    }
    const resourcesPath = process.resourcesPath;
    return path.join(resourcesPath, 'ffmpeg', 'ffmpeg');
  }
  
  module.exports = { getFFmpegPath };
  ```
- [ ] Configure fluent-ffmpeg to use bundled FFmpeg
- [ ] Test: `npm run make` produces `.dmg` with FFmpeg included

**Acceptance:** 
- Dev mode uses system FFmpeg (or falls back gracefully)
- Packaged app includes FFmpeg binary
- `ffprobe` and `ffmpeg` commands available in main process

---

#### Task 1.5: Main Process Setup (electron/main.js)
- [ ] Create window on app startup (1400x900, resizable)
- [ ] Load React app from webpack dev server in dev, from bundle in production
- [ ] Set window icon (if provided)
- [ ] Handle app lifecycle events (quit, reopen)
- [ ] Create stub IPC handlers (will be filled in later PRs):
  ```javascript
  ipcMain.handle('read-metadata', async (event, filePath) => {
    // Stub
    throw new Error('Not implemented');
  });
  ```
- [ ] Test: Window opens, React component visible

**Acceptance:** App window opens with correct size, icon visible in dock, no console errors.

---

#### Task 1.6: Initialize Git & Push to GitHub
- [ ] Initialize git repo: `git init`
- [ ] Create `.gitignore` (Node, Electron, OS files)
- [ ] Create `README.md` with project description and setup instructions
- [ ] Commit initial setup: `git add . && git commit -m "Initial setup: Electron + React boilerplate"`
- [ ] Create GitHub repo (public)
- [ ] Push to GitHub: `git push -u origin main`

**Acceptance:** GitHub repo is public, all files pushed, README visible on GitHub.

---

### Testing (PR-1)

#### Manual Tests
- [ ] Launch in dev mode: `npm start`
  - Expected: App opens in < 5 seconds, no errors in console
- [ ] Test close/reopen
  - Expected: App closes cleanly, can reopen
- [ ] Package and test `.dmg`:
  ```bash
  npm run make
  open out/make/dmg/x64/ClipForge-*.dmg
  ```
  - Expected: .dmg opens, app launches from dmg in < 5 seconds, no errors

#### Automated Tests (Optional)
- [ ] DevTools test: Can access `window.ipcRenderer` from console
- [ ] Check FFmpeg availability:
  ```javascript
  // In main process
  const { getFFmpegPath } = require('./utils/ffmpegPath');
  const ffmpegPath = getFFmpegPath();
  console.log('FFmpeg path:', ffmpegPath);
  ```

---

## PR-2: File Import & Timeline Display
**Objective:** Users can drag/drop or pick video files, see them in a timeline with thumbnails.

### Acceptance Criteria
- [ ] Drag-drop zone accepts MP4, MOV, WebM files
- [ ] File picker supports same formats
- [ ] File metadata extracted: duration, resolution, thumbnail
- [ ] Clip appears in Timeline with thumbnail, name, duration
- [ ] Multiple clips can be imported
- [ ] Error handling: invalid formats, missing files, corrupted videos
- [ ] Timeline list is responsive (no lag with 10 clips)

### Tasks

#### Task 2.1: Create FileImporter Component
- [ ] Create `src/components/FileImporter.jsx`:
  - Drag-drop zone with visual feedback
  - File picker button with accept filter (mp4, mov, webm)
  - Loading spinner during import
  - Error toast on invalid file
- [ ] Styles: clear visual feedback, hover states, drop zone highlight
- [ ] Props: `onImportFiles: (clips) => void`, `isLoading: boolean`, `error: string | null`
- [ ] Events: `onDrop`, `onChange` (file picker)

**Acceptance:** 
- Drag zone shows visual feedback on hover
- File picker opens and filters by video format
- Component emits `onImportFiles` with file paths

---

#### Task 2.2: Create fileManager IPC Handler
- [ ] Create `electron/fileManager.js`:
  ```javascript
  async function getMetadata(filePath) {
    // Use ffprobe to extract: duration, width, height
    // Extract thumbnail (first frame) using ffmpeg
    // Return { duration, width, height, thumbnail (base64) }
  }
  ```
- [ ] Use fluent-ffmpeg to run ffprobe and ffmpeg
- [ ] Handle errors: file not found, invalid format, permission denied
- [ ] Return user-friendly error messages
- [ ] Create `electron/main.js` IPC handler:
  ```javascript
  ipcMain.handle('read-metadata', async (event, filePath) => {
    return fileManager.getMetadata(filePath);
  });
  ```

**Acceptance:**
- ffprobe successfully extracts duration, resolution
- ffmpeg extracts first frame as thumbnail (JPEG base64)
- Errors handled gracefully with user-friendly messages
- No main process hangs

---

#### Task 2.3: Create Notification/Toast System
- [ ] Create `src/components/Notifications.jsx`:
  - Toast component that shows temporarily
  - Support: error, success, info types
  - Auto-dismiss after 3-5 seconds
- [ ] Create `src/utils/toastContext.js` (Context API for global toast access)
- [ ] Integrate into `App.jsx`:
  ```javascript
  const [toasts, setToasts] = useState([]);
  
  const showToast = (message, type = 'info') => {
    // Add to toasts, auto-remove after delay
  };
  ```
- [ ] Styles: positioned bottom-right, non-intrusive

**Acceptance:**
- Toast appears and auto-dismisses
- Can show error, success, info types
- Accessible from any component via context

---

#### Task 2.4: Connect FileImporter to App State
- [ ] Update `src/App.jsx`:
  ```javascript
  const [clips, setClips] = useState([]);
  const [importError, setImportError] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  
  const handleImportFiles = async (filePaths) => {
    setIsImporting(true);
    try {
      for (const filePath of filePaths) {
        const metadata = await window.ipcRenderer.invoke('read-metadata', filePath);
        const newClip = {
          id: generateUuid(),
          fileName: path.basename(filePath),
          filePath,
          source: 'import',
          ...metadata,
          trimStart: 0,
          trimEnd: metadata.duration,
          order: clips.length,
          track: 'main'
        };
        setClips([...clips, newClip]);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsImporting(false);
    }
  };
  ```
- [ ] Pass `onImportFiles`, `isImporting`, `importError` as props to FileImporter

**Acceptance:**
- File imported successfully
- Clip object created with all required fields
- Clip appears in state
- Errors caught and shown as toast

---

#### Task 2.5: Create Timeline Component (Clip List)
- [ ] Create `src/components/Timeline.jsx`:
  - Display list of clips
  - Each clip shows: thumbnail (60px), name, duration (MM:SS)
  - Delete button per clip (with confirmation)
  - Select/highlight current clip
  - Responsive (no lag with 10+ clips)
- [ ] Use `React.memo()` to prevent re-renders
- [ ] Props: `clips`, `selectedClipId`, `onSelectClip`, `onDeleteClip`
- [ ] Styles: clean list view, hover states

**Acceptance:**
- All clips displayed with correct info
- Smooth scrolling (no jank) with 10+ clips
- Delete removes clip from timeline
- Selection highlighting works

---

#### Task 2.6: Implement Clip Deletion
- [ ] Update App state handler:
  ```javascript
  const handleDeleteClip = (clipId) => {
    const confirmation = window.confirm('Delete this clip?');
    if (confirmation) {
      setClips(clips.filter(c => c.id !== clipId));
      if (selectedClipId === clipId) setSelectedClipId(null);
      showToast('Clip deleted', 'success');
    }
  };
  ```
- [ ] Pass to Timeline component

**Acceptance:**
- Confirmation dialog appears
- Clip removed from state on confirm
- No clip selected after deletion

---

#### Task 2.7: Create Helper Utilities
- [ ] Create `src/utils/uuid.js`: Generate unique IDs for clips
- [ ] Create `src/utils/formatters.js`:
  - `formatDuration(seconds)` → "MM:SS"
  - `formatResolution(width, height)` → "1920x1080"
- [ ] Create `src/utils/constants.js`:
  - Supported formats: ['mp4', 'mov', 'webm']
  - Error messages
  - Export presets (for later)

**Acceptance:** Utilities work correctly in components.

---

### Testing (PR-2)

#### Manual Tests
- [ ] Import single video file (drag or file picker)
  - Expected: Clip appears in Timeline with thumbnail, correct duration/resolution
- [ ] Import multiple files in sequence
  - Expected: All appear in Timeline, correct order
- [ ] Import invalid file (.txt, corrupt video)
  - Expected: Error toast shown, file not added
- [ ] Delete clip
  - Expected: Confirmation dialog, clip removed on confirm
- [ ] Timeline with 10 clips: scroll smoothly
  - Expected: No jank, smooth scrolling
- [ ] Test on fresh Mac
  - Expected: No "ffmpeg not found" errors

#### Automated Tests (Unit)
```javascript
// Test formatDuration
expect(formatDuration(61)).toBe('1:01');
expect(formatDuration(3661)).toBe('1:01:01');

// Test uuid generation
const id1 = generateUuid();
const id2 = generateUuid();
expect(id1).not.toBe(id2);
```

#### Acceptance Test
```
Scenario: Import and view video
  Given app is open
  When I drag a video file onto the app
  Then the clip appears in the timeline with:
    - Thumbnail preview
    - File name
    - Duration (MM:SS format)
    - Resolution (WxH)
  And I can see the file path is correct
```

---

## PR-3: Video Preview & Playback
**Objective:** Users can select clips and preview them with play/pause and scrubbing.

### Acceptance Criteria
- [ ] Click clip in Timeline → loads in VideoPreview
- [ ] Play/pause buttons work
- [ ] Scrubber allows seeking to any position
- [ ] Current time displayed (MM:SS / MM:SS)
- [ ] Resolution displayed
- [ ] Playback smooth (30fps+), no audio stutter
- [ ] Scrubbing responsive (< 500ms seek time)

### Tasks

#### Task 3.1: Create VideoPreview Component
- [ ] Create `src/components/VideoPreview.jsx`:
  - Large video player area (right panel)
  - HTML5 `<video>` element
  - Play/pause buttons
  - Scrubber slider (0-duration)
  - Time display (current / total)
  - Resolution display
  - Volume slider
- [ ] Props: `clip: Clip | null`, `onPlaybackChange: (time) => void`
- [ ] Styles: dark background, visible controls

**Acceptance:**
- Video element renders and can load files
- Controls are visible and clickable
- No layout issues

---

#### Task 3.2: Implement Play/Pause Logic
- [ ] Add state to VideoPreview:
  ```javascript
  const videoRef = useRef();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  ```
- [ ] Play button: `videoRef.current.play()` + `setIsPlaying(true)`
- [ ] Pause button: `videoRef.current.pause()` + `setIsPlaying(false)`
- [ ] Listen to video events: `onplay`, `onpause`, `ontimeupdate`, `onloadedmetadata`
- [ ] Update currentTime and duration from events

**Acceptance:**
- Play button starts playback
- Pause button stops playback
- Current time updates as video plays
- Duration displays correctly

---

#### Task 3.3: Implement Scrubber (Seeking)
- [ ] Add scrubber input:
  ```javascript
  <input 
    type="range" 
    min="0" 
    max={duration} 
    value={currentTime}
    onChange={(e) => {
      videoRef.current.currentTime = parseFloat(e.target.value);
      setCurrentTime(parseFloat(e.target.value));
    }}
  />
  ```
- [ ] Debounce scrubber updates (don't update on every pixel)
- [ ] Update scrubber position as video plays via `ontimeupdate`

**Acceptance:**
- Scrubber seeks to correct position
- Seeking completes in < 500ms
- Video doesn't stutter during scrubbing
- Scrubber position updates as video plays

---

#### Task 3.4: Connect VideoPreview to App State
- [ ] Update `src/App.jsx`:
  ```javascript
  const [selectedClipId, setSelectedClipId] = useState(null);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  
  const selectedClip = clips.find(c => c.id === selectedClipId);
  ```
- [ ] Pass `selectedClip`, `onPlaybackChange` to VideoPreview
- [ ] When clip selected in Timeline, update `selectedClipId`
- [ ] Load clip's `filePath` into video element

**Acceptance:**
- Clicking clip in Timeline loads it in VideoPreview
- VideoPreview shows correct video file
- Play/pause works on selected clip

---

#### Task 3.5: Display Clip Metadata
- [ ] Show in VideoPreview:
  - Resolution: "1920 x 1080"
  - Duration: "MM:SS"
  - Current time: "MM:SS / MM:SS"
  - File name (in header)
- [ ] Use formatters from utilities

**Acceptance:**
- All metadata displayed correctly
- Format is user-friendly (not raw numbers)

---

#### Task 3.6: Keyboard Shortcut: Space for Play/Pause
- [ ] Add to App.jsx or VideoPreview:
  ```javascript
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && videoRef.current) {
        e.preventDefault();
        if (videoRef.current.paused) {
          videoRef.current.play();
        } else {
          videoRef.current.pause();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  ```
- [ ] Test: Space key toggles play/pause

**Acceptance:** Space key plays/pauses video (and doesn't scroll page).

---

### Testing (PR-3)

#### Manual Tests
- [ ] Click clip in Timeline
  - Expected: Video loads in preview, plays when clicked
- [ ] Play a full 30-second clip
  - Expected: Smooth playback, no stuttering, audio synced
- [ ] Scrub to middle of video
  - Expected: Seeks to correct position in < 500ms
- [ ] Scrub while playing
  - Expected: No lag, plays from new position
- [ ] Press Space key
  - Expected: Video plays/pauses

#### Automated Tests (Integration)
```javascript
// Test that video element is loaded with correct src
expect(videoRef.current.src).toBe(clip.filePath);

// Test that play button triggers video.play()
fireEvent.click(playButton);
expect(videoRef.current.paused).toBe(false);
```

#### Acceptance Test
```
Scenario: Preview and play video
  Given I have imported a video clip
  When I click the clip in the Timeline
  Then the video loads in the preview player
  And I can see the duration (MM:SS format)
  And I can see the resolution (WxH)
  When I click the Play button
  Then the video plays smoothly (no stutter)
  When I scrub to the middle
  Then the video seeks to that position
  And continues playing from there
```

---

## PR-4: Trim Clips (In/Out Points)
**Objective:** Users can set trim start/end points on clips. Exported video respects trim points.

### Acceptance Criteria
- [ ] Number inputs for trim start and trim end (in seconds)
- [ ] Inputs validate: 0 ≤ start < end ≤ duration
- [ ] Apply button confirms trim
- [ ] Trim values persist in clip state
- [ ] Preview shows only trimmed section when playing
- [ ] Visual indicator of trimmed range (optional but nice)
- [ ] Error handling for invalid inputs

### Tasks

#### Task 4.1: Create ClipEditor Component
- [ ] Create `src/components/ClipEditor.jsx`:
  - Number input: Trim Start (seconds)
  - Number input: Trim End (seconds)
  - Display: "Trimmed duration: X seconds"
  - Apply button
  - Reset button (resets to full clip)
- [ ] Props: `clip: Clip | null`, `onTrimChange: (clipId, trimStart, trimEnd) => void`
- [ ] Show message if no clip selected

**Acceptance:**
- Inputs visible and can be edited
- Apply and Reset buttons clickable
- No layout issues

---

#### Task 4.2: Implement Trim Validation
- [ ] Add validation logic:
  ```javascript
  const [trimStart, setTrimStart] = useState(clip?.trimStart ?? 0);
  const [trimEnd, setTrimEnd] = useState(clip?.trimEnd ?? clip?.duration ?? 0);
  
  const validateTrim = () => {
    const start = parseFloat(trimStart);
    const end = parseFloat(trimEnd);
    
    if (isNaN(start) || isNaN(end)) return 'Please enter numbers';
    if (start < 0) return 'Start time cannot be negative';
    if (end > clip.duration) return 'End time exceeds clip duration';
    if (start >= end) return 'Start time must be before end time';
    
    return null;
  };
  ```
- [ ] Show error message if validation fails
- [ ] Disable Apply button if invalid

**Acceptance:**
- Invalid inputs show error message
- Apply button disabled when invalid
- Valid inputs allow apply

---

#### Task 4.3: Connect ClipEditor to App State
- [ ] Update `src/App.jsx`:
  ```javascript
  const handleTrimChange = (clipId, trimStart, trimEnd) => {
    setClips(clips.map(c => 
      c.id === clipId 
        ? { ...c, trimStart, trimEnd }
        : c
    ));
    showToast('Clip trimmed', 'success');
  };
  ```
- [ ] Pass to ClipEditor component
- [ ] Populate ClipEditor with selected clip's trim values

**Acceptance:**
- Trim values update in state
- Clip object persists new trim values

---

#### Task 4.4: Implement Trim Preview
- [ ] Update VideoPreview to respect trim points:
  ```javascript
  useEffect(() => {
    if (selectedClip && videoRef.current) {
      // Only allow playback within trim range
      const video = videoRef.current;
      
      video.addEventListener('timeupdate', () => {
        if (video.currentTime < selectedClip.trimStart) {
          video.currentTime = selectedClip.trimStart;
        }
        if (video.currentTime > selectedClip.trimEnd) {
          video.pause();
          video.currentTime = selectedClip.trimEnd;
        }
      });
    }
  }, [selectedClip]);
  ```
- [ ] Display trimmed duration in info panel
- [ ] Visual indicator: highlight trimmed range on scrubber (optional)

**Acceptance:**
- Playing trimmed clip shows only trimmed section
- Playback stops at trim end point
- Scrubbing outside trim range clamps to range

---

#### Task 4.5: Reset Trim Functionality
- [ ] Add Reset button:
  ```javascript
  const handleReset = () => {
    setTrimStart(0);
    setTrimEnd(clip.duration);
    onTrimChange(clip.id, 0, clip.duration);
    showToast('Trim reset', 'success');
  };
  ```

**Acceptance:**
- Reset button restores full clip duration
- Trim values update correctly

---

### Testing (PR-4)

#### Manual Tests
- [ ] Select a clip
  - Expected: ClipEditor shows current trim values
- [ ] Set trim start to 10s, end to 50s, click Apply
  - Expected: Trim values persist, "Clip trimmed" toast shown
- [ ] Play trimmed clip
  - Expected: Starts at 10s, stops at 50s
- [ ] Try invalid input (start > end)
  - Expected: Error message shown, Apply button disabled
- [ ] Scrub outside trim range
  - Expected: Scrubber clamps to trim range
- [ ] Click Reset
  - Expected: Trim restored to full duration

#### Automated Tests
```javascript
// Test trim validation
expect(validateTrim(-5, 50)).toBe('Start time cannot be negative');
expect(validateTrim(50, 50)).toBe('Start time must be before end time');
expect(validateTrim(10, 50)).toBe(null); // Valid

// Test trim clamping
const trimmedClip = applyTrim(clip, 10, 50);
expect(trimmedClip.trimStart).toBe(10);
expect(trimmedClip.trimEnd).toBe(50);
```

#### Acceptance Test
```
Scenario: Trim a video clip
  Given I have selected a video clip
  When I enter Trim Start: 10s, Trim End: 50s
  And I click Apply
  Then the clip is trimmed (duration now 40s)
  When I play the clip
  Then it plays from 10s to 50s
  And when I try to scrub before 10s
  Then it clamps to 10s
```

---

## PR-5: Export Timeline to MP4
**Objective:** Users can export all timeline clips (stitched, with trims applied) as a single MP4 file.

### Acceptance Criteria
- [ ] Export button opens file picker (save dialog)
- [ ] User selects output location
- [ ] Shows progress bar (0-100%) during export
- [ ] Export completes without crashing
- [ ] Exported file plays in QuickTime
- [ ] All clips stitched in order
- [ ] Trim points applied (start/end respected)
- [ ] Audio synced with video
- [ ] Export completes in < 3 minutes for 2-minute demo video
- [ ] Error handling: disk full, permission denied, ffmpeg failure

### Tasks

#### Task 5.1: Create mediaProcessor Module (Core Export Logic)
- [ ] Create `electron/mediaProcessor.js`:
  ```javascript
  async function exportTimeline(clips, outputPath) {
    // For each clip:
    //   1. Extract trimmed segment (ffmpeg -ss -to -c copy)
    //   2. Build concat demux file (list of segments)
    // 3. Run ffmpeg concat to stitch clips
    // 4. Return outputPath on success
  }
  ```
- [ ] Use fluent-ffmpeg to run ffmpeg commands
- [ ] Return Promise that resolves when export completes
- [ ] Emit progress events (frame number → percentage)

**Key Implementation:**
```javascript
const ffmpeg = require('fluent-ffmpeg');
const { getFFmpegPath } = require('./utils/ffmpegPath');

ffmpeg.setFfmpegPath(getFFmpegPath());

async function exportTimeline(clips, outputPath) {
  // Step 1: Extract trimmed segments
  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const segmentPath = `/tmp/segment_${i}.mp4`;
    
    await new Promise((resolve, reject) => {
      ffmpeg(clip.filePath)
        .setStartTime(clip.trimStart)
        .setDuration(clip.trimEnd - clip.trimStart)
        .output(segmentPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });
  }
  
  // Step 2: Concat all segments
  // (Build concat.txt with list of segments)
  // (Run ffmpeg -f concat ...)
}
```

**Acceptance:**
- Extracts trimmed segments correctly
- Stitches segments without re-encoding (lossless -c copy)
- Returns on success

---

#### Task 5.2: Create ExportDialog Component
- [ ] Create `src/components/ExportDialog.jsx`:
  - File picker button (save dialog, .mp4 extension)
  - Resolution selector (720p, 1080p, source)
  - Progress bar (0-100%)
  - Cancel button
  - Shows export status (Exporting... / Complete / Error)
- [ ] Props: `clips: Clip[]`, `onExport: (outputPath) => void`, `isExporting: boolean`, `exportProgress: number`
- [ ] Show loading state during export

**Acceptance:**
- Dialog opens with export options
- File picker works correctly
- Progress bar visible and updates

---

#### Task 5.3: Connect ExportDialog to App State
- [ ] Update `src/App.jsx`:
  ```javascript
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  
  const handleExport = async (outputPath) => {
    setIsExporting(true);
    setExportProgress(0);
    
    try {
      await window.ipcRenderer.invoke('export-timeline', {
        clips,
        outputPath
      });
      
      setIsExporting(false);
      setExportProgress(0);
      showToast('✓ Video exported successfully!', 'success');
    } catch (err) {
      setIsExporting(false);
      showToast(`Export failed: ${err.message}`, 'error');
    }
  };
  ```
- [ ] Listen to IPC progress updates:
  ```javascript
  useEffect(() => {
    window.ipcRenderer.on('export-progress', (event, progress) => {
      setExportProgress(progress);
    });
  }, []);
  ```

**Acceptance:**
- Export starts correctly
- Progress updates during export
- Completion message shows

---

#### Task 5.4: Create IPC Handler for Export
- [ ] Create `electron/main.js` handler:
  ```javascript
  ipcMain.handle('export-timeline', async (event, { clips, outputPath }) => {
    try {
      await mediaProcessor.exportTimeline(clips, outputPath);
      return { success: true, outputPath };
    } catch (err) {
      throw new Error(`Export failed: ${err.message}`);
    }
  });
  ```
- [ ] Handle errors and send to renderer
- [ ] Catch: disk full, permission denied, ffmpeg crash, etc.

**Acceptance:**
- Handler invoked correctly
- Errors caught and thrown back to renderer

---

#### Task 5.5: Implement Progress Reporting
- [ ] Modify mediaProcessor to emit progress:
  ```javascript
  async function exportTimeline(clips, outputPath, onProgress) {
    // During ffmpeg encoding:
    // ffmpeg.on('progress', (progress) => {
    //   const percent = (progress.frames / totalFrames) * 100;
    //   onProgress(percent);
    // });
  }
  ```
- [ ] Send progress via IPC:
  ```javascript
  ipcMain.handle('export-timeline', async (event, { clips, outputPath }) => {
    return mediaProcessor.exportTimeline(clips, outputPath, (progress) => {
      mainWindow.webContents.send('export-progress', progress);
    });
  });
  ```

**Acceptance:**
- Progress updates from 0 to 100%
- Progress updates during export (not just start/end)

---

#### Task 5.6: Error Handling for Export
- [ ] Create error handler in mediaProcessor:
  ```javascript
  const ERROR_MAP = {
    'ENOSPC': 'Not enough disk space',
    'EACCES': 'Permission denied. Check file permissions.',
    'ENOENT': 'Output directory not found',
    'ffmpeg': 'Video processing failed'
  };
  
  try {
    // export logic
  } catch (err) {
    const userMessage = ERROR_MAP[err.code] || err.message;
    throw new Error(userMessage);
  }
  ```
- [ ] Test: export with read-only destination, full disk, missing directory
- [ ] Show user-friendly error message in toast

**Acceptance:**
- All error cases handled gracefully
- User sees helpful error message
- App doesn't crash

---

#### Task 5.7: Keyboard Shortcut: Cmd+E for Export
- [ ] Add to App.jsx:
  ```javascript
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        // Open export dialog
        setShowExportDialog(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  ```

**Acceptance:** Cmd+E opens export dialog

---

### Testing (PR-5)

#### Manual Tests
- [ ] Export timeline with single clip
  - Expected: File picker opens, user selects location, export completes, file appears at location
- [ ] Export 2-minute timeline (3 clips × 40s each)
  - Expected: Export completes in < 3 minutes, progress bar shows 0-100%
- [ ] Open exported file in QuickTime
  - Expected: Video plays smoothly, all clips present, correct duration
- [ ] Verify trim points applied in export
  - Expected: Exported clip durations match trimmed values (not original)
- [ ] Export to read-only location
  - Expected: Error message shown, no crash
- [ ] Cmd+E keyboard shortcut
  - Expected: Export dialog opens

#### Automated Tests
```javascript
// Test duration calculation
const trimmedDuration = calculateExportDuration(clips);
expect(trimmedDuration).toBe(sumOf(clip.trimEnd - clip.trimStart));

// Test clip ordering
const ordered = getExportOrder(clips);
expect(ordered[0].order).toBe(0);
expect(ordered[1].order).toBe(1);
```

#### Acceptance Test
```
Scenario: Export timeline with multiple clips
  Given I have 3 clips in timeline with trims applied
  And clip 1: 10-40s (30s)
  And clip 2: 5-35s (30s)  
  And clip 3: 0-20s (20s)
  When I click Export
  And select output location
  Then progress bar shows 0-100%
  And export completes in < 3 minutes
  When I open exported file
  Then file duration is 80 seconds
  And I can see all 3 clips in sequence
  And audio is synced with video
```

---

## PR-6: Reorder Clips (Drag & Drop)
**Objective:** Users can drag clips in timeline to reorder them. Export respects new order.

### Acceptance Criteria
- [x] Clips draggable in Timeline
- [x] Visual feedback during drag (ghost effect, drop zone highlight)
- [x] Drop repositions clip
- [x] Order property updated in state
- [x] Export respects new order
- [x] Smooth animations (no jank)
- [ ] Works with 10+ clips (pending manual test)

### Tasks

#### Task 6.1: Integrate @dnd-kit (modern alternative to react-beautiful-dnd)
- [x] Install: `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
- [ ] Wrap Timeline with DragDropContext:
  ```javascript
  import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
  
  <DragDropContext onDragEnd={handleDragEnd}>
    <Droppable droppableId="timeline">
      {(provided) => (
        <div ref={provided.innerRef} {...provided.droppableProps}>
          {clips.map((clip, index) => (
            <Draggable key={clip.id} draggableId={clip.id} index={index}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  style={{...provided.draggableProps.style, opacity: snapshot.isDragging ? 0.5 : 1}}
                >
                  <ClipItem clip={clip} />
                </div>
              )}
            </Draggable>
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  </DragDropContext>
  ```

**Acceptance:**
- [x] Clips can be dragged
- [x] Visual feedback during drag

---

#### Task 6.2: Implement Reorder Logic
- [x] Add handler to App.jsx:
  ```javascript
  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    
    if (!destination) return; // Dropped outside list
    if (source.index === destination.index) return; // No move
    
    const newClips = Array.from(clips);
    const [movedClip] = newClips.splice(source.index, 1);
    newClips.splice(destination.index, 0, movedClip);
    
    // Update order property
    newClips.forEach((clip, i) => {
      clip.order = i;
    });
    
    setClips(newClips);
    showToast('Clip reordered', 'success');
  };
  ```
- [x] Pass handler to Timeline

**Acceptance:**
- [x] Clips reorder correctly
- [x] Order property updates
- [x] Success toast shown

---

#### Task 6.3: Update Export to Use Order
- [x] Verify mediaProcessor already sorts by order before export (line 200):
  ```javascript
  const sortedClips = clips.sort((a, b) => a.order - b.order);
  ```

**Acceptance:**
- [x] Export respects new clip order (already implemented)

---

### Testing (PR-6)

#### Manual Tests
- [ ] Drag clip from position 1 to position 3
  - Expected: Clip moves, visual feedback (ghost), order updates
- [ ] Drag and drop outside list
  - Expected: Clip stays in original position
- [ ] Reorder 5 clips randomly, then export
  - Expected: Exported clips in new order, not original

#### Automated Tests
```javascript
// Test reorder logic
const reordered = reorderClips(clips, 0, 2);
expect(reordered[2].id).toBe(clips[0].id);
```

---

## PR-7: Responsive UI & Polish
**Objective:** Make the UI clean, responsive, and polished for demo.

### Acceptance Criteria
- [x] App layout: 70/30 split (timeline left, preview right)
- [x] All components responsive (no overflow)
- [x] Consistent spacing and colors
- [x] Smooth animations (drag, delete, transitions)
- [x] Light mode with consistent theme
- [x] Icons (play, pause, export, delete, etc.) using lucide-react
- [x] No console warnings (console.log removed, only console.error kept)
- [x] Accessible (good contrast, semantic HTML, keyboard navigation)

### Tasks

#### Task 7.1: Create Global Styles & Theme
- [x] Create `src/styles/main.css`:
  ```css
  :root {
    --primary: #4A90E2;
    --success: #7ED321;
    --error: #D0021B;
    --warning: #F5A623;
    --bg-dark: #1a1a1a;
    --bg-light: #f5f5f5;
    --text: #333;
    --border: #ddd;
  }
  
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: var(--bg-light);
    color: var(--text);
  }
  ```
- [x] Import in `src/index.jsx`

**Acceptance:** ✅ Consistent styling across app with CSS variables

---

#### Task 7.2: Layout Structure (Main Container)
- [x] Update `src/App.jsx` layout:
  ```jsx
  <div className="app-container">
    <header className="top-bar">
      <h1>ClipForge</h1>
      <button onClick={() => setShowHelp(true)}>? Help</button>
    </header>
    
    <div className="main-content">
      <aside className="timeline-panel">
        <FileImporter onImport={handleImportFiles} />
        <Timeline 
          clips={clips}
          selectedClipId={selectedClipId}
          onSelect={setSelectedClipId}
          onDelete={handleDeleteClip}
        />
      </aside>
      
      <main className="preview-panel">
        <VideoPreview clip={selectedClip} />
        <ClipEditor clip={selectedClip} onTrim={handleTrimChange} />
        <ExportDialog clips={clips} onExport={handleExport} />
      </main>
    </div>
    
    <Notifications toasts={toasts} />
  </div>
  ```
- [ ] CSS for 70/30 layout:
  ```css
  .app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }
  
  .main-content {
    display: flex;
    flex: 1;
    overflow: hidden;
  }
  
  .timeline-panel {
    width: 30%;
    border-right: 1px solid var(--border);
    overflow-y: auto;
  }
  
  .preview-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  ```

**Acceptance:** ✅ Layout is clean, flexible split (400px timeline), no overflow

---

#### Task 7.3: Add Icons & Visual Enhancements
- [x] Install lucide-react: `npm install lucide-react`
- [x] Add icons to buttons:
  ```jsx
  import { Play, Pause, Trash2, Plus, Download } from 'lucide-react';
  
  <button className="btn-play">
    <Play size={20} /> Play
  </button>
  ```
- [x] Style icon buttons: hover, active states

**Acceptance:** ✅ Icons visible in FileImporter, Timeline, VideoPreview, ExportDialog, App

---

#### Task 7.4: Add Animations
- [x] Smooth transitions on drag:
  ```css
  .clip-item {
    transition: opacity 0.2s, background 0.2s;
  }
  
  .clip-item.dragging {
    opacity: 0.5;
  }
  ```
- [ ] Fade on delete:
  ```css
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  
  .clip-item.deleting {
    animation: fadeOut 0.3s forwards;
  }
  ```
- [x] Progress bar animation during export
- [x] Added prefers-reduced-motion support

**Acceptance:** ✅ Smooth animations with fadeIn, fadeOut, slideUp, slideDown

---

#### Task 7.5: Accessibility Audit
- [x] Check color contrast (WCAG AA minimum)
- [x] Add alt text to images
- [x] Semantic HTML (buttons, labels, etc.)
- [x] Test keyboard navigation (Tab, Enter, Escape)
- [x] Added aria-labels to all interactive elements
- [x] Added prefers-reduced-motion support

**Acceptance:** ✅
- All text meets contrast requirements
- Keyboard navigation works (Space, Delete, Cmd+E, Esc, Tab)
- Proper aria-labels and semantic HTML throughout

---

#### Task 7.6: Help Menu & About Dialog
- [x] Create `src/components/HelpDialog.jsx`:
  - Keyboard shortcuts list
  - About ClipForge
  - Links to documentation
- [x] Style as modal dialog
- [x] Add Help button (floating top-right)
- [x] Close on Esc key and backdrop click

**Acceptance:** ✅ Help dialog with keyboard shortcuts, about info, and links

---

### Testing (PR-7)

#### Manual Tests
- [ ] App window at various sizes
  - Expected: No overflow, responsive layout
- [ ] Dark mode (if implemented)
  - Expected: Consistent theming
- [ ] Tab through all buttons
  - Expected: All focusable, visible focus indicators
- [ ] Check colors in browser DevTools
  - Expected: Contrast ratios meet WCAG AA

#### Accessibility Tests
- [ ] Run axe DevTools: no violations
- [ ] Navigate with keyboard only
  - Expected: All functionality accessible

---

## PR-8: Testing, Packaging & Final Polish
**Objective:** Ensure MVP is rock-solid, packaged correctly, and ready for demo.

### Acceptance Criteria
- [ ] All tests pass (manual and automated)
- [ ] No console errors or warnings
- [ ] App tested on fresh Mac (or VM)
- [ ] `.dmg` packaged and tested
- [ ] README complete with setup & usage instructions
- [ ] GitHub repo has clear commit history
- [ ] Performance: no memory leaks, 15-minute session stable
- [ ] All keyboard shortcuts working

### Tasks

#### Task 8.1: Create Test Plan Document
- [ ] Document MVP test scenarios:
  1. Import single MP4 → appears in timeline
  2. Import multiple files → all appear
  3. Play imported clip → smooth playback
  4. Trim clip to 10-50s → export respects trim
  5. Export timeline → opens file picker, completes, produces playable MP4
  6. Reorder clips → export respects new order
  7. Keyboard shortcuts: Space (play/pause), Del (delete), Cmd+E (export)
  8. Error cases: corrupt file, read-only destination, insufficient permissions

**Acceptance:** Test plan written and agreed upon

---

#### Task 8.2: Execute Full Manual Test Suite
- [ ] Run all test scenarios from test plan
- [ ] Document results: PASS / FAIL
- [ ] For each FAIL: create GitHub issue with details
- [ ] Fix critical issues (crashes, broken features)
- [ ] Re-test after fixes

**Acceptance:** All core tests PASS

---

#### Task 8.3: Test on Fresh macOS
- [ ] Borrow a Mac without your dev setup, OR
- [ ] Create fresh VM (Parallels, VirtualBox)
- [ ] Extract `.dmg`, launch app
- [ ] Run full test plan
- [ ] Document any issues (missing dependencies, permissions, etc.)
- [ ] Fix before Tuesday deadline

**Acceptance:**
- App launches from `.dmg`
- All features work without dev machine setup
- No "ffmpeg not found" errors

---

#### Task 8.4: Performance Profiling
- [ ] Use Chrome DevTools Performance tab:
  - Import 10 clips → timeline remains responsive
  - Play full video → smooth playback (30fps+)
  - Drag clips → no jank
- [ ] Monitor memory usage:
  - Open Activity Monitor
  - Check memory growth over 15 minutes
  - Should remain stable (< 100MB growth)
- [ ] Fix any perf issues (memoization, virtualization, etc.)

**Acceptance:**
- Timeline smooth with 10+ clips
- Playback 30fps+
- No memory leaks

---

#### Task 8.5: Clean Up Console
- [ ] Remove all console.log() statements (except errors)
- [ ] Fix any warnings (React keys, missing deps, etc.)
- [ ] Run Electron DevTools, check console
- [ ] Should be completely clean

**Acceptance:** Zero console errors or warnings

---

#### Task 8.6: Update README
- [ ] Add sections:
  ```markdown
  # ClipForge
  
  Desktop video editor built in 72 hours with Electron, React, and FFmpeg.
  
  ## Features
  - Import MP4, MOV, WebM videos
  - Preview and trim clips
  - Drag-and-drop reordering
  - Export to MP4
  
  ## System Requirements
  - macOS 10.13+
  - 500MB free disk space
  
  ## Installation
  1. Download ClipForge-1.0.0.dmg
  2. Drag ClipForge to Applications
  3. Launch from Applications
  
  ## Usage
  - Drag video files to import
  - Click clip to preview
  - Set trim points and click Apply
  - Click Export to save
  
  ## Keyboard Shortcuts
  - Space: Play/Pause
  - Delete: Remove clip
  - Cmd+E: Export
  
  ## Known Limitations
  - Single-track timeline (multi-track coming soon)
  - H.264 codec only
  - No transitions or effects in MVP
  
  ## Architecture
  See ARCHITECTURE.md for technical details.
  ```
- [ ] Create `ARCHITECTURE.md` (reference the PRD)
- [ ] Add LICENSE file (MIT)

**Acceptance:** README is complete, helpful, and accurate

---

#### Task 8.7: Prepare GitHub Release
- [ ] Build final `.dmg`: `npm run make`
- [ ] Tag release: `git tag -a v1.0.0-mvp -m "MVP Release"`
- [ ] Push tag: `git push origin v1.0.0-mvp`
- [ ] Create GitHub Release:
  - Title: "ClipForge MVP v1.0.0"
  - Description: Features, requirements, known limitations
  - Attach `.dmg` file
- [ ] Test download and launch from release

**Acceptance:**
- Release published on GitHub
- `.dmg` downloadable
- All assets present

---

#### Task 8.8: Final Video Test
- [ ] On the machine you'll demo on:
  - Extract `.dmg`
  - Import test video
  - Record demo workflow
  - Export and verify output
- [ ] Document any issues found

**Acceptance:** Demo workflow tested end-to-end

---

### Testing (PR-8)

#### Integration Tests (Full Workflow)
```
Scenario: Complete MVP workflow
  Given app is freshly launched
  When I import a 60-second MP4
  And select it to preview
  And set trim start to 10s, end to 50s
  And click Apply
  And click Export
  And select output location
  Then export completes in < 2 minutes
  And exported file is valid MP4
  When I open exported file
  Then it plays 40 seconds of the trimmed clip
```

#### Performance Tests
- Timeline with 10 clips: scrolling smooth (no FPS drops)
- Playback: consistent 30fps+
- Memory: stable over 15 minutes

---

## Summary: MVP PRs by Priority

| PR | Feature | Effort | Duration | Critical |
|---|---------|--------|----------|----------|
| 1 | Setup & Boilerplate | M | 8h | ✅ CRITICAL |
| 2 | Import & Timeline | M | 8h | ✅ CRITICAL |
| 3 | Preview & Playback | M | 6h | ✅ CRITICAL |
| 4 | Trim Clips | M | 6h | ✅ CRITICAL |
| 5 | Export to MP4 | H | 8h | ✅ CRITICAL |
| 6 | Reorder Clips | L | 3h | ⚠️ Important |
| 7 | UI & Polish | M | 6h | ⚠️ Important |
| 8 | Testing & Package | M | 6h | ✅ CRITICAL |

**Total MVP Effort: ~51 hours**
**Compressed Timeline: Monday-Tuesday (36 hours available)**

**Strategy:** Parallelize where possible. Work on UI polish in parallel with core features. Test continuously, don't wait until the end.

---

## Recommended Build Order

1. **PR-1** (Monday, 8 hours) — Get boilerplate working
2. **PR-2 + PR-3** (Monday night + Tuesday AM, 14 hours) — Import & Preview in parallel
3. **PR-4 + PR-5** (Tuesday AM-PM, 14 hours) — Trim & Export in parallel
4. **PR-6** (Tuesday PM, 3 hours) — Reorder
5. **PR-7** (Tuesday evening, 6 hours) — Polish
6. **PR-8** (Tuesday evening, 6 hours) — Test & Package (overlapping with PR-7)

**Finish by: Tuesday 10:59 PM ✅**