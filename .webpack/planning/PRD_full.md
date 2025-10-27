# ClipForge Full Submission PRD
**Deadline: Wednesday, October 29, 10:59 PM CT**

## Project Overview

Build on MVP with **native recording** (screen + webcam) and **multi-track timeline**. Users can record their screen or webcam, import existing videos, edit on a timeline with layering, and export professional videos.

**Strategy:** Record features first (after MVP is rock-solid). Multi-track is nice-to-have but recording is required.

**New in Full Submission:**
- Screen recording (full screen or window selection)
- Webcam recording with audio
- Simultaneous screen + webcam (picture-in-picture)
- Multi-track timeline (main video + overlay track)
- Better UX: audio controls, visual feedback
- Auto-save project state

---

## Additions to Tech Stack

- **Screen Recording:** Electron `desktopCapturer` API
- **Webcam/Audio:** navigator.mediaDevices.getUserMedia()
- **Audio Processing:** Web Audio API (GainNode for volume)
- **Notification:** electron-store for auto-save
- **UI Library:** react-hot-toast (if not already using)

---

## Updated Data Model

### Clip Object (Extended)
```javascript
{
  id: string (uuid),
  fileName: string,
  filePath: string,
  source: 'import' | 'screen' | 'webcam' | 'screen+webcam',
  duration: number,
  width: number,
  height: number,
  trimStart: number,
  trimEnd: number,
  thumbnail: string,
  order: number,
  track: 'main' | 'overlay',         // NEW: multi-track support
  hasAudio: boolean,                   // NEW: whether clip has audio
  audioVolume: number (0-1),           // NEW: volume multiplier
  error: string | null
}
```

### App State (Extended)
```javascript
{
  clips: Clip[],
  selectedClipId: string | null,
  currentPlaybackTime: number,
  isPlaying: boolean,
  exportProgress: number,
  isExporting: boolean,
  
  // Recording state
  isRecording: boolean,
  recordingType: 'screen' | 'webcam' | 'screen+webcam' | null,
  recordingDuration: number,
  recordingElapsedTime: number,
  selectedScreen: { id, name } | null,
  
  // Auto-save
  lastSavedTime: number,
  hasSavedProject: boolean,
  
  error: string | null,
  successMessage: string | null
}
```

---

## New Features

### 1. Screen Recording
**User Story:** I can record my screen (full screen or pick a specific window) and add it to the timeline.

**Acceptance Criteria:**
- "Record Screen" button in recording panel
- Dialog shows available screens/windows
- User selects source (full screen or window)
- Recording UI shows elapsed time + stop button
- Stop recording → clip automatically added to main timeline
- Recorded video is 30fps, at least 720p
- Audio from system/microphone captured
- Export includes recorded screen

**Implementation Details:**
- RecordingPanel component with recording controls
- desktopCapturer.getSources() in main process
- Pass source to getUserMedia with chromeMediaSource
- MediaRecorder captures video + audio streams
- Save to temp file, create Clip object, add to timeline

**Code Pattern (for Cursor):**
```javascript
// Main process: get available screens
const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
// Send to renderer
ipcMain.handle('get-sources', () => sources);

// Renderer: start recording
const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    mandatory: {
      chromeMediaSource: 'desktop',
      chromeMediaSourceId: sourceId
    }
  },
  audio: { echoCancellation: true }
});
```

**Edge Cases:**
- User denies permission → show "Permission denied. Enable in System Preferences"
- Recording > 2GB → warn user, allow to continue
- Source disappears mid-record → pause, warn user

**Demo Tip:** Record a quick screen capture (15-30s). Smooth recording = polished. Test permissions on fresh Mac.

---

### 2. Webcam Recording
**User Story:** I can record from my built-in camera with audio and add it to the timeline as an overlay.

**Acceptance Criteria:**
- "Record Webcam" button
- Camera + microphone preview before recording
- Toggle microphone on/off
- Shows camera name
- Recording UI (elapsed time, stop button)
- Stop recording → clip added to overlay track
- Audio synced with video
- Export includes webcam recording

**Implementation Details:**
- getUserMedia({ video: { facingMode: 'user' }, audio: true })
- Preview in <video> element with muted autoplay
- MediaRecorder captures both streams
- Save to file, create Clip with hasAudio: true
- Auto-assign to overlay track

**Demo Tip:** Record 10 seconds of yourself. This is memorable and shows ease of use. Test audio sync.

---

### 3. Screen + Webcam (Picture-in-Picture)
**User Story:** I can record both screen and webcam simultaneously. They appear as one composite clip with webcam as inset.

**Acceptance Criteria:**
- "Record Screen + Camera" mode in recording panel
- Shows both streams (screen large, camera preview inset)
- On stop, creates single clip with composite video
- Webcam inset in corner (top-right default)
- Audio from both sources mixed
- Plays back correctly on export
- Looks professional (clean, not janky)

**Implementation Approach (Simplified):**
- Capture both streams via getUserMedia + desktopCapturer
- Composite on canvas (drawImage for each stream)
- Canvas.captureStream() → MediaRecorder
- Result: single file with composite video + mixed audio

**Canvas Compositing Code (Pseudocode):**
```javascript
const canvasStream = canvas.captureStream(30);
const ctx = canvas.getContext('2d');

// Animate loop
setInterval(() => {
  // Draw screen
  ctx.drawImage(screenVideo, 0, 0, canvasWidth, canvasHeight);
  
  // Draw webcam inset (bottom-right, 25% size)
  const size = 240;
  ctx.drawImage(webcamVideo, 
    canvasWidth - size - 10,
    canvasHeight - size - 10,
    size, size);
}, 1000/30);

// Record composite
const recorder = new MediaRecorder(canvasStream);
recorder.start();
```

**Audio Mixing:**
- Use Web Audio API AudioContext
- Create GainNodes for each stream
- Merge into destination (recorder)

**Demo Tip:** This is impressive. Show a 10-second screen recording with webcam inset. Proves you understand compositing. This is the standout feature.

---

### 4. Multi-Track Timeline
**User Story:** Clips can be on separate tracks (main video, overlay). I can arrange them independently and see them composite during preview and export.

**Acceptance Criteria:**
- Timeline shows 2 horizontal tracks labeled "Main" and "Overlay"
- Clips draggable between tracks
- Overlay track clips render on top in preview
- On export, tracks composite (overlay atop main, with proper positioning)
- Can adjust timing of overlay independently
- Visual distinction between tracks (different background colors)

**Implementation Details:**
- MultiTrackTimeline component with 2 lanes
- Drag & drop updates clip.track property
- Preview: canvas overlay shows both tracks composited
- Export: FFmpeg filtergraph composites layers

**FFmpeg Export Command:**
```bash
# Main video + overlay PiP
ffmpeg -i main.mp4 -i overlay.mp4 \
  -filter_complex "[1]scale=320:240[pip];[0][pip]overlay=W-w-10:H-h-10" \
  -c:v libx264 output.mp4

# Advanced: overlay with transparency (if time permits)
ffmpeg -i main.mp4 -i overlay.mp4 \
  -filter_complex "[1]scale=320:240,format=yuva420p[pip];[0][pip]overlay=W-w-10:H-h-10:enable='between(t,0,10)'" \
  -c:v libx264 output.mp4
```

**Demo Tip:** Show dragging a webcam clip from main to overlay track. Highlight it as a separate track. This shows advanced editing capability.

---

### 5. Audio Controls
**User Story:** I can adjust microphone volume during recording and mute clips during playback.

**Acceptance Criteria:**
- Volume slider before/during recording (0-100%)
- Mute button per clip in timeline
- Volume adjustments smooth (fade)
- Audio plays correctly in export
- Visual indicator when muted (🔇 icon on clip)

**Implementation Details:**
- Web Audio API GainNode for live volume adjustment
- Store audioVolume in Clip object
- Export: FFmpeg audio filter (`-af "volume=X"`)
- UI: per-clip volume slider + mute toggle

**Demo Tip:** Show toggling mute on a clip. This is subtle but shows polish.

---

### 6. Auto-Save Project State
**User Story:** If the app crashes, I can recover my timeline.

**Acceptance Criteria:**
- Every 30 seconds, app saves project state to disk
- On launch, if crash detected, offer recovery option
- User can manually save project (File → Save)
- Saved project is JSON file containing all clips + timeline

**Implementation Details:**
- Use electron-store for auto-save
- Save to `app.getPath('userData')/autosave.json`
- On app load, check if autosave exists
- Show toast: "Recover previous project?" [Yes] [No]

**Code Pattern:**
```javascript
// Auto-save every 30s
setInterval(() => {
  store.set('project', { clips, selectedClipId });
}, 30000);

// On app load
if (store.has('project')) {
  showRecoveryPrompt();
}
```

**Demo Tip:** Not critical for demo, but mention in README. Shows production thinking.

---

### 7. Keyboard Shortcuts (Extended)
**Acceptance Criteria:**
- Space: Play/Pause
- Delete: Remove selected clip
- R: Start recording
- S: Stop recording
- Cmd+E: Open export dialog
- Cmd+S: Save project
- Cmd+L: Toggle log/debug panel (optional, helpful for testing)

**Implementation:**
- Global keydown listener in App.jsx
- Map to action dispatchers

---

## Updated Export Logic

**Export now handles:**
1. Single-track: clips concatenated on main track
2. Multi-track: main track clips stitched, overlay clips composited atop
3. Audio mixing: if both main and overlay have audio, mix (50% each or configurable)
4. Handles edge cases: clips of different resolutions, different frame rates

**FFmpeg Command Builder (for Cursor):**
```javascript
// Pseudo-code: build FFmpeg command based on tracks
const mainClips = clips.filter(c => c.track === 'main');
const overlayClips = clips.filter(c => c.track === 'overlay');

// Step 1: Concat main clips
const mainConcat = `ffmpeg -f concat -safe 0 -i main_concat.txt -c copy main.mp4`;

// Step 2: If overlays exist, composite
if (overlayClips.length > 0) {
  // Build filtergraph for overlays
  const filterComplex = buildOverlayFilter(overlayClips);
  const compositeCmd = `ffmpeg -i main.mp4 -i overlay.mp4 -filter_complex "${filterComplex}" output.mp4`;
}
```

---

## Updated Testing Scenarios

**Must Test:**

1. **Screen Recording**
   - Record 30s of screen
   - Verify appears on main track
   - Export and check video quality

2. **Webcam Recording**
   - Record 15s of webcam
   - Verify audio synced
   - Add to overlay track

3. **Screen + Webcam Composite**
   - Record 20s composite (screen + webcam inset)
   - Verify both visible in preview
   - Export and verify composite appears

4. **Multi-Track Export**
   - Main track: imported video clip
   - Overlay track: webcam recording (small PiP)
   - Export: verify overlay visible on top of main

5. **Audio Levels**
   - Record with different volume levels
   - Export and verify audio clarity

6. **Performance with Full Feature Set**
   - 3 main clips + 2 overlay clips
   - Timeline responsive, preview smooth
   - Export completes without crashes

---

## Performance Targets (Updated)

- App launch: < 5 seconds
- Import + metadata: < 2s per clip
- Recording start: < 1 second
- Timeline responsive: 10+ clips across 2 tracks
- Playback smooth: 30fps+
- Export: 2-3 minute final video in < 5 minutes
- Memory: no leaks during 20-minute session

---

## Success Criteria (Full Submission)

- ✅ All MVP criteria met
- ✅ Screen recording works
- ✅ Webcam recording works with audio
- ✅ Screen + webcam composite is visually clean
- ✅ Multi-track export composites correctly
- ✅ Audio synced in all recordings
- ✅ App remains responsive and stable
- ✅ Demo shows all major features smoothly
- ✅ Demo video (3-5 min) is polished and shows complete workflow
- ✅ README includes recording + multi-track usage instructions
- ✅ GitHub release ready for download

---

## Demo Narrative (What to Show)

**5-minute demo script:**
1. "I built ClipForge—a desktop video editor in 72 hours" (0:00)
2. Import a video clip, show preview (0:15)
3. Record screen (quick 10s capture) (0:30)
4. Record webcam (5s capture) (0:50)
5. Show multi-track timeline: main + overlay (1:00)
6. Trim a clip, reorder clips (1:30)
7. Show composite preview (main + webcam inset) (2:00)
8. Export timeline (show progress), switch to pre-recorded export (2:30)
9. Play exported video in QuickTime (shows final result) (3:00)
10. "Shipped in 72 hours. All features work. Built with Electron, React, FFmpeg." (3:30)

**Key Points to Emphasize:**
- Speed: "Shipped complete feature set in 3 days"
- Architecture: "Electron main/renderer separation keeps UI responsive during heavy FFmpeg operations"
- UX: "Clean timeline, intuitive drag-and-drop, visual feedback on every action"
- Completeness: "All required features implemented and tested"

---

## Additional Polish Checklist

- [ ] Error handling for all edge cases (permissions, disk space, etc.)
- [ ] Loading spinners during import/export
- [ ] Success toasts on completed actions
- [ ] Keyboard shortcuts working
- [ ] Auto-save functioning
- [ ] App icon visible in dock
- [ ] Window title shows app name + version
- [ ] Help menu with shortcuts + about dialog
- [ ] README with clear setup instructions
- [ ] Demo video uploaded to GitHub / cloud storage
