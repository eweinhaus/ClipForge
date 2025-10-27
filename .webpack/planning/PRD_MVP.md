# ClipForge MVP PRD
**Deadline: Tuesday, October 28, 10:59 PM CT**

## Project Overview

Build a minimal desktop video editor (Electron + React) that proves the core media pipeline works: import → preview → trim → export. Focus on **clean UX and complete core loop** over feature richness.

**Non-Negotiables:**
- Must run as packaged macOS app (not dev mode)
- All core features work without crashes
- UI is intuitive and responsive
- FFmpeg bundled or clearly documented for installation
- Demo records in < 5 minutes with all features shown

---

## Tech Stack

- **Framework:** Electron (electron-forge template)
- **Frontend:** React 18 with hooks
- **Drag & Drop:** react-beautiful-dnd
- **Video Player:** HTML5 `<video>` element
- **Media Processing:** fluent-ffmpeg (Node.js wrapper for FFmpeg)
- **State Management:** React useState/useReducer
- **Package Manager:** npm

**Critical:** FFmpeg bundled in `.dmg` (using `@electron-builder/extra-resources`). Users should not need to install separately.

---

## Architecture Overview

```
electron/
  preload.js          (IPC bridge)
  main.js             (App window + lifecycle)
  captureService.js   (Screen/webcam via desktopCapturer)
src/
  App.jsx             (Root state container)
  components/
    FileImporter.jsx  (Drag-drop + file picker)
    Timeline.jsx      (Clip list + reorder)
    ClipEditor.jsx    (Trim controls with visual feedback)
    VideoPreview.jsx  (HTML5 player with scrubber)
    ExportDialog.jsx  (Export with progress bar)
  utils/
    mediaProcessor.js (FFmpeg export logic)
    fileManager.js    (File I/O via IPC)
  styles/
    main.css          (Clean, minimal UI)
```

**Data Flow:** User action → Event handler → App state update → Components re-render

**IPC Usage:** File I/O, FFmpeg operations ONLY go through main process. UI state stays in React.

---

## Data Model

### Clip Object
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

### App State
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

---

## Core Features

### 1. Import Videos (Drag & Drop + File Picker)
**User Story:** I can drag MP4/MOV files or use a file picker to import them.

**Acceptance Criteria:**
- Drag zone with visual feedback ("Drop here")
- File picker supports MP4, MOV, WebM
- Extracts: duration, resolution, creates thumbnail (first frame)
- Shows error toast if file invalid/unsupported
- File path stored (not copied to temp)
- Can import same file multiple times

**Implementation Details:**
- FileImporter component with HTML5 drag events
- On drop/select: IPC call to `fileManager.getMetadata(filePath)`
- Main process: `ffprobe` extracts metadata, `ffmpeg` extracts thumbnail
- Store thumbnail as base64, embed in Clip object
- Error handling: try-catch in both renderer and main, show user-friendly message

**Edge Cases:**
- Huge files (> 2GB): Show warning but allow
- Corrupt video: ffprobe fails → show "Invalid video file"
- Permission denied: Show "Cannot read file. Check permissions"
- Same file twice: Allowed (user might want to edit differently)

**Demo Tip:** Pre-select a clean MP4 file (30-60 seconds, 1080p) to drag in. Smooth drag experience looks polished.

---

### 2. Timeline View (Clip List + Reorder)
**User Story:** I see all imported clips in a vertical list. I can drag to reorder and delete clips.

**Acceptance Criteria:**
- Left panel shows all clips (list view)
- Each clip shows: thumbnail, name, duration (MM:SS format)
- Draggable to reorder (visual feedback during drag)
- Delete button per clip (with confirmation toast)
- Current selection highlighted
- Timeline updates order property on clips

**Implementation Details:**
- Timeline component renders Clip list with react-beautiful-dnd
- Clip component (memoized) shows thumbnail, name, duration
- Delete → IPC to remove file cache if needed, update state
- Smooth animations on drag (fade, scale)

**UI Polish (High Impact):**
- Ghost effect when dragging (opacity 0.5)
- Drop zone highlighted with green border
- Deleted clip slides out smoothly
- Show total timeline duration at bottom

**Demo Tip:** Reordering should feel buttery smooth. Test drag performance with 10+ clips before recording.

---

### 3. Video Preview & Playback
**User Story:** I can click a clip to preview it. Play/pause works. I can scrub to any position.

**Acceptance Criteria:**
- Click clip in timeline → loads in preview player
- Play/pause buttons (keyboard space-bar too, if time permits)
- Scrubber allows seeking to any position
- Shows current time (MM:SS / MM:SS format)
- Shows resolution (1280x720, etc.)
- No stutter during playback or seeking

**Implementation Details:**
- VideoPreview component wraps HTML5 `<video>` element
- Play button toggles video.play() / video.pause()
- Scrubber input: onChange → video.currentTime
- timeupdate event updates display time
- videometadata event shows resolution

**Performance:**
- Seeking < 500ms on local files
- Playback smooth (30fps+)
- No audio glitches

**Demo Tip:** Play a full clip without pause. Smooth playback = professional. Test audio sync before recording.

---

### 4. Trim Clips (Simple In/Out Points)
**User Story:** I can select a clip and set trim start/end using text inputs. Preview shows trimmed section.

**Acceptance Criteria:**
- Number inputs for trim start (seconds) and trim end (seconds)
- Values must validate: 0 ≤ start < end ≤ duration
- Inputs show current trim range
- "Apply" button confirms trim
- Preview player shows trimmed section when playing
- Trim values persist in clip state
- Clear visual indicator of trimmed range (optional: blue highlight on scrubber)

**Implementation Details:**
- ClipEditor component with two number inputs
- onChange validates and clamps values
- When Preview plays, only play between trimStart and trimEnd (via video.currentTime logic)
- Visual feedback: show trimmed section in info

**UI Polish:**
- Input fields side-by-side: [Start: ___] [End: ___] [Apply]
- Show trimmed duration below: "Trimmed: 15s"
- Disable Apply if trim invalid
- Confirmation: "Trim applied ✓"

**Demo Tip:** Trim a 60s clip to 30s. Shows understanding of non-destructive editing (original file unchanged).

---

### 5. Export to MP4 (Core Loop Completion)
**User Story:** I can export the full timeline (all clips in order, with trims applied) as a single MP4.

**Acceptance Criteria:**
- Export button opens dialog
- User selects output location (file picker save dialog)
- Clips stitched in timeline order
- Trims applied (start/end points respected)
- Shows progress bar (0-100%) during export
- Exported file plays in QuickTime without issues
- Export completes without crashing
- Error toast if export fails (disk full, permission denied, etc.)
- Export completes in < 3 minutes for typical demo video

**Implementation Details:**
- ExportDialog component opens native save dialog
- Calls `mediaProcessor.exportTimeline(clips, outputPath)`
- Main process logic:
  - For each clip: ffmpeg extract trimmed segment (lossless copy if possible: `-c copy`)
  - Create concat demux file
  - ffmpeg concat to stitch clips
  - ffmpeg encode final output (libx264, reasonable bitrate)
- Progress events: ffmpeg reports frame number, convert to percentage
- Renderer listens to IPC progress updates, updates state

**FFmpeg Command Reference (for Cursor):**
```bash
# Extract trimmed clip (lossless)
ffmpeg -i input.mp4 -ss 10 -to 40 -c copy -y output_trim.mp4

# Concat clips (demux method)
echo "file './clip1.mp4'" > concat.txt
echo "file './clip2.mp4'" >> concat.txt
ffmpeg -f concat -safe 0 -i concat.txt -c copy -y output.mp4

# Full encode (if reencoding needed)
ffmpeg -i input.mp4 -c:v libx264 -preset fast -b:v 5M -c:a aac -b:a 128k output.mp4
```

**Performance Targets:**
- 1-minute demo video (3 clips × 20s each) exports in 1-2 minutes
- Must complete before demo ends

**Edge Cases:**
- Export to location without write permissions → "Permission denied" error toast
- Disk full → "Insufficient disk space" error toast
- FFmpeg not found → "FFmpeg not installed. Please run: brew install ffmpeg"
- Output file exists → Confirm overwrite

**Demo Tip:** Export a pre-recorded test video. If live export takes too long, switch to pre-exported result mid-demo. Say: "Export completes in background; here's the result."

---

### 6. Error Handling & User Feedback
**Acceptance Criteria:**
- All errors caught and shown as toast notifications
- Error messages are user-friendly (not stack traces)
- App never crashes mid-workflow
- Loading spinners for async operations (import, export)

**Errors to Handle:**
```javascript
{
  "INVALID_FILE_FORMAT": "File format not supported. Use MP4 or MOV.",
  "FILE_NOT_FOUND": "File not found or was deleted.",
  "PERMISSION_DENIED": "Permission denied. Check file permissions.",
  "FFMPEG_FAILED": "Video processing failed. Try a different file.",
  "EXPORT_FAILED": "Export failed. Check disk space and permissions.",
  "DISK_FULL": "Not enough disk space to export.",
  "FFMPEG_NOT_FOUND": "FFmpeg not installed. Run: brew install ffmpeg"
}
```

**Implementation:**
- Toast component (react-hot-toast or similar)
- Try-catch in all IPC calls
- Main process catches FFmpeg errors, translates to user message
- Show success toast on export complete: "✓ Exported to Desktop/video.mp4"

---

### 7. Packaging & macOS App
**Acceptance Criteria:**
- `npm run make` produces `.dmg` file
- FFmpeg bundled (not required to be pre-installed)
- App launches in < 5 seconds
- App icon in dock (ClipForge logo)
- Window size 1400x900px, resizable
- Signed/notarized for distribution (not required for MVP, but nice)

**Implementation:**
- electron-forge with `@electron-forge/maker-dmg`
- FFmpeg binary in `extraResources` folder
- electron-builder config specifies FFmpeg path
- App icon: 512x512 PNG provided
- Code signing: optional (skip for MVP if time-constrained)

**Build Command:**
```bash
npm run make
# Output: out/make/dmg/x64/ClipForge-1.0.0.dmg
```

---

## UI Layout (Clean & Simple)

```
┌─────────────────────────────────────────┐
│  ClipForge                        [_][□][X]
├─────────────────────────────────────────┤
│                                          │
│  [+ Import] [Recording]   [? Help]      │  ← Top toolbar
│                                          │
├──────────────────┬──────────────────────┤
│                  │                       │
│   Timeline       │   Preview Player     │
│   (clips list)   │   (video display)    │
│                  │   Play/Pause         │
│   • clip1.mp4    │   Scrubber           │
│   • clip2.mp4    │   00:15 / 01:00      │
│   • clip3.mp4    │   1920x1080          │
│                  │                       │
├──────────────────┼──────────────────────┤
│                  │   Trim Controls      │
│  [Delete] [↑↓]   │   [Start: 10s] [End: 50s] [Apply] │
│                  │                       │
│                  │   [Export]  [Cancel] │
│                  │                       │
└──────────────────┴──────────────────────┘
```

---

## Setup & Build Instructions

### Prerequisites
```bash
# Node.js 16+ (check: node -v)
# FFmpeg (one-time install)
brew install ffmpeg
```

### Development
```bash
npm install
npm start
```

### Package for Distribution
```bash
npm run make
# Creates: out/make/dmg/x64/ClipForge-1.0.0.dmg
```

### Test Packaged App
```bash
# Mount DMG and launch app
open out/make/dmg/x64/ClipForge-1.0.0.dmg
```

---

## Testing Before Demo

**Critical Tests (Run These):**

1. **Import Test**
   - Drag 1080p MP4 (30-60s) onto app
   - Verify thumbnail loads
   - Verify duration displays correctly

2. **Preview Test**
   - Click clip in timeline
   - Play from start to end (smooth playback?)
   - Scrub to middle (seek works?)
   - Scrub to end (no hang?)

3. **Trim Test**
   - Set trim start to 10s, end to 50s
   - Click Apply
   - Play trimmed clip (should start at 10s)

4. **Multiple Clips**
   - Import 3 different videos
   - Reorder via drag (smooth?)
   - Arrange in desired order

5. **Export Test**
   - Export timeline (all 3 clips stitched)
   - Time the export (should be < 2 minutes for demo video)
   - Open exported file in QuickTime
   - Verify: plays smoothly, all clips present, duration correct, audio synced

6. **Fresh Mac Test**
   - Test on MacBook with fresh OS (or VM)
   - Verify FFmpeg bundled correctly (app doesn't require brew install)

7. **Error Test**
   - Try importing `.txt` file → should show error toast
   - Try importing corrupt video → should show error toast
   - Try exporting to read-only location → should show error toast

---

## Performance Targets

- App launch: < 5 seconds
- Thumbnail extraction: < 2 seconds per clip
- Timeline responsive: 10+ clips without lag
- Playback smooth: 30fps+, no stuttering
- Export: 2-minute timeline in < 3 minutes
- Memory: no leaks during 15-minute session

---

## Success Criteria (Testable)

- ✅ App launches from `.dmg` without errors
- ✅ Can import, preview, trim, and export in one workflow
- ✅ Exported video plays in QuickTime
- ✅ All 3 clips appear in exported video in correct order
- ✅ Trimmed sections apply correctly
- ✅ No crashes during testing
- ✅ All errors show friendly messages (no stack traces)
- ✅ UI is clean, responsive, intuitive
- ✅ Demo records in < 5 minutes showing all features

---

## README Contents (For GitHub)

Include:
- Project description (1 sentence)
- Features (bullet list)
- System requirements
- Installation (npm install)
- Build & run instructions
- Demo video link
- Known limitations
- Architecture overview (reference this PRD)
- Future features (stretch goals)
