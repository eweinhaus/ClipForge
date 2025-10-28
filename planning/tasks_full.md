# ClipForge Full Submission: Task Breakdown by PR
**Deadline: Wednesday, October 29, 10:59 PM CT**

**Assumes MVP (PR-1 through PR-8) is complete and working.**

---

## PR-9: Screen Recording
**Objective:** Users can record their screen and add to timeline.

### Acceptance Criteria
- [ ] "Record Screen" button in RecordingPanel
- [ ] Dialog shows available screens/windows
- [ ] User selects source (full screen or specific window)
- [ ] Recording UI shows elapsed time + stop button
- [ ] On stop, clip automatically added to main timeline with correct metadata
- [ ] Recorded video is 30fps, at least 720p resolution
- [ ] Audio captured from system/microphone
- [ ] No crashes, graceful error handling (permission denied, etc.)
- [ ] Permission testing completed on fresh Mac
- [ ] Permission request flow implemented with clear instructions

### Tasks

#### Task 9.1: Create RecordingPanel Component
- [ ] Create `src/components/RecordingPanel.jsx`:
  - "Record Screen" button
  - "Record Webcam" button
  - "Record Screen + Camera" button
  - Recording state display (Idle / Recording / Stopped)
  - Elapsed time display (MM:SS)
  - Stop button (visible only during recording)
  - Source selector dropdown (filled by app state)
- [ ] Props: `recordingState`, `recordingDuration`, `onStartRecord`, `onStopRecord`, `selectedSource`
- [ ] Styles: clear recording state indicators, prominent stop button

**Acceptance:**
- All buttons visible and clickable
- Recording state changes trigger UI updates
- Elapsed time updates during recording

---

#### Task 9.2: Create captureService Module (Screen Capture)
- [ ] Create `electron/captureService.js`:
  ```javascript
  async function getSources() {
    // Use desktopCapturer to get available screens/windows
    // Return array of { id, name, thumbnail }
  }
  
  async function startScreenRecord(sourceId) {
    // Get media stream from source
    // Start MediaRecorder
    // Return stream and recorder
  }
  
  async function stopRecording(recorder, outputPath) {
    // Stop recording
    // Save blob to file
    // Return metadata (duration, resolution, etc.)
  }
  ```
- [ ] Use Electron `desktopCapturer` API
- [ ] Use Web `getUserMedia()` for audio
- [ ] Handle permissions gracefully

**Acceptance:**
- Can get list of screens/windows
- Can start recording from selected source
- Can stop and save to file

---

#### Task 9.3: Implement IPC Handlers for Screen Capture
- [ ] Create handlers in `electron/main.js`:
  ```javascript
  ipcMain.handle('get-sources', async () => {
    return captureService.getSources();
  });
  
  ipcMain.handle('start-screen-record', async (event, sourceId) => {
    return captureService.startScreenRecord(sourceId);
  });
  
  ipcMain.handle('stop-screen-record', async (event, recordingData) => {
    return captureService.stopRecording(recordingData.recorder, recordingData.outputPath);
  });
  ```

**Acceptance:**
- Handlers callable from renderer
- Return correct data structures

---

#### Task 9.4: Connect RecordingPanel to App State
- [ ] Update `src/App.jsx` with recording state:
  ```javascript
  const [recordingState, setRecordingState] = useState('idle');
  const [recordingElapsedTime, setRecordingElapsedTime] = useState(0);
  const [recordingType, setRecordingType] = useState(null);
  const [selectedSource, setSelectedSource] = useState(null);
  const [availableSources, setAvailableSources] = useState([]);
  ```
- [ ] Add handler for screen recording:
  ```javascript
  const handleStartScreenRecord = async (sourceId) => {
    try {
      setRecordingState('recording');
      setRecordingType('screen');
      setSelectedSource(sourceId);
      
      const result = await window.ipcRenderer.invoke('start-screen-record', sourceId);
      // Store result for stop handler
      
      // Start elapsed time timer
      const startTime = Date.now();
      const interval = setInterval(() => {
        setRecordingElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 100);
      
      setRecordingInterval(interval);
    } catch (err) {
      showToast(`Recording failed: ${err.message}`, 'error');
      setRecordingState('idle');
    }
  };
  ```
- [ ] Add handler for stop:
  ```javascript
  const handleStopScreenRecord = async () => {
    try {
      clearInterval(recordingInterval);
      
      const recordedClip = await window.ipcRenderer.invoke('stop-screen-record', recordingData);
      
      // Add to timeline as new clip
      const newClip = {
        id: generateUuid(),
        fileName: `screen_${Date.now()}.mp4`,
        filePath: recordedClip.filePath,
        source: 'screen',
        duration: recordedClip.duration,
        width: recordedClip.width,
        height: recordedClip.height,
        thumbnail: recordedClip.thumbnail,
        trimStart: 0,
        trimEnd: recordedClip.duration,
        order: clips.length,
        track: 'main'
      };
      
      setClips([...clips, newClip]);
      setRecordingState('idle');
      showToast('✓ Screen recording added to timeline', 'success');
    } catch (err) {
      showToast(`Stop recording failed: ${err.message}`, 'error');
    }
  };
  ```

**Acceptance:**
- Recording starts and elapsed time updates
- Recording stops and clip added to timeline
- Clip has correct metadata (duration, resolution)

---

#### Task 9.5: Implement Permission Testing & Request Flow
- [ ] Create permission testing utility:
  ```javascript
  async function testScreenPermissions() {
    try {
      const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
      return sources.length > 0;
    } catch (err) {
      return false;
    }
  }
  ```
- [ ] Implement permission request flow with clear instructions:
  ```javascript
  const requestScreenPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { 
          displaySurface: 'monitor',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: true 
      });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      showPermissionError('Screen recording permission denied. Please enable in System Preferences > Security & Privacy > Screen Recording');
      return false;
    }
  };
  ```
- [ ] Test permissions on fresh Mac installation
- [ ] Handle permission denied with helpful error messages
- [ ] Show direct link to System Preferences if needed
- [ ] Implement fallback behavior if permissions fail

**Acceptance:**
- Permission testing works on fresh Mac
- Clear permission request flow with instructions
- Graceful handling if denied with helpful messages
- Direct link to System Preferences provided

---

#### Task 9.6: Test Screen Recording & Performance
- [ ] Manual test: record 15-second screen capture
- [ ] Verify: clip appears in timeline with correct duration/resolution
- [ ] Verify: recording maintains 30fps during capture
- [ ] Export video with screen recording
- [ ] Verify: exported video contains recorded screen, is playable
- [ ] Test on fresh Mac with permission flow
- [ ] Verify: permission request appears and works correctly

**Acceptance:**
- Recording works end-to-end
- Exported video contains recorded screen
- 30fps maintained during recording
- Permission testing works on fresh Mac

---

### Testing (PR-9)

#### Manual Tests
- [ ] Click "Record Screen"
  - Expected: Source selector appears with available screens/windows
- [ ] Select full screen, start recording
  - Expected: Recording state shows, elapsed time increments
- [ ] Record 15 seconds, stop
  - Expected: Clip appears in timeline, "Screen recording added" toast shown
- [ ] Play recorded clip
  - Expected: Video plays smoothly, shows correct screen capture
- [ ] Deny screen capture permission (macOS settings)
  - Expected: Clear error message, graceful handling

#### Acceptance Test
```
Scenario: Record screen and add to timeline
  Given I click "Record Screen"
  When I select full screen
  And I start recording
  Then elapsed time increments
  When I perform some action on screen (open window, etc.)
  And I stop recording after 15 seconds
  Then clip appears in timeline
  And I can preview the recording
  When I export
  Then exported video includes screen recording
```

---

## PR-10: Webcam Recording
**Objective:** Users can record from their webcam with audio and add to timeline.

### Acceptance Criteria
- [ ] "Record Webcam" button in RecordingPanel
- [ ] Camera + microphone preview before recording
- [ ] Toggle microphone on/off
- [ ] Recording UI shows elapsed time
- [ ] On stop, clip added to overlay track (default)
- [ ] Audio synced with video in export
- [ ] No crashes, graceful error handling
- [ ] Permission testing completed on fresh Mac
- [ ] Camera permission request flow implemented

### Tasks

#### Task 10.1: Extend captureService for Webcam
- [ ] Add to `electron/captureService.js`:
  ```javascript
  async function startWebcamRecord() {
    // Use navigator.mediaDevices.getUserMedia()
    // Capture video + audio
    // Start MediaRecorder
    // Return stream and recorder
  }
  
  async function stopWebcamRecording(recorder, outputPath) {
    // Stop recording
    // Save blob to file
    // Return metadata
  }
  ```

**Acceptance:**
- Can capture webcam + audio
- Can save to file

---

#### Task 10.2: Create Webcam Preview Component
- [ ] Create `src/components/WebcamPreview.jsx`:
  - Live video preview of webcam
  - Microphone toggle button
  - Visual indicator: recording or not
- [ ] Props: `isRecording`, `onMicToggle`, `micEnabled`

**Acceptance:**
- Shows live webcam feed
- Microphone toggle works

---

#### Task 10.3: Add IPC Handlers for Webcam
- [ ] Create handlers in `electron/main.js`:
  ```javascript
  ipcMain.handle('start-webcam-record', async () => {
    return captureService.startWebcamRecord();
  });
  
  ipcMain.handle('stop-webcam-record', async (event, recordingData) => {
    return captureService.stopWebcamRecording(recordingData.recorder, recordingData.outputPath);
  });
  ```

**Acceptance:**
- Handlers work correctly

---

#### Task 10.4: Connect to App State
- [ ] Update `App.jsx` with webcam recording handlers (similar to PR-9)
- [ ] On stop, add clip to overlay track (by default):
  ```javascript
  const newClip = {
    ...recordedClip,
    source: 'webcam',
    track: 'overlay',  // Add to overlay track
    hasAudio: true
  };
  ```

**Acceptance:**
- Webcam recording starts/stops correctly
- Clip added to overlay track

---

#### Task 10.5: Test Webcam Recording & Permissions
- [ ] Manual test: record 10 seconds of webcam
- [ ] Verify: clip appears in overlay track
- [ ] Verify: recording maintains 30fps during capture
- [ ] Export and verify: audio synced, video plays
- [ ] Test on fresh Mac with camera permission flow
- [ ] Verify: camera permission request appears and works correctly

**Acceptance:**
- Recording works end-to-end
- Audio synced in export
- 30fps maintained during recording
- Camera permission testing works on fresh Mac

---

### Testing (PR-10)

#### Manual Tests
- [ ] Click "Record Webcam"
  - Expected: Webcam preview appears
- [ ] Start recording, record 10 seconds, stop
  - Expected: Clip appears in overlay track
- [ ] Toggle microphone off, record
  - Expected: Clip has no audio (or system audio only)
- [ ] Export with webcam in overlay
  - Expected: Webcam visible as inset in final video, audio synced

#### Acceptance Test
```
Scenario: Record webcam and add as overlay
  Given I click "Record Webcam"
  When I see camera preview
  And I start recording
  And I record myself for 10 seconds
  And I stop recording
  Then clip appears in overlay track
  And I can see "Overlay" label
  When I export
  Then exported video shows main content with webcam inset
  And audio from microphone is audible
```

---

## PR-11: Screen + Webcam Composite Recording
**Objective:** Users can record screen and webcam simultaneously as single composite clip.

### Acceptance Criteria
- [ ] "Record Screen + Camera" button in RecordingPanel
- [ ] Shows both streams (screen large, webcam preview inset)
- [ ] User can adjust inset position/size (optional: stretch goal)
- [ ] On stop, creates single clip with composite video
- [ ] Audio from both sources mixed
- [ ] Export shows composite correctly
- [ ] Looks professional (no janky compositing)
- [ ] Maintains 30fps during compositing
- [ ] Permission testing for both screen and camera

### Tasks

#### Task 11.1: Create Canvas-Based Compositor
- [ ] Add to `electron/captureService.js`:
  ```javascript
  async function startCompositeRecord(screenSourceId) {
    // Get screen stream
    const screenStream = await getScreenStream(screenSourceId);
    
    // Get webcam stream
    const webcamStream = await getWebcamStream();
    
    // Create canvas for compositing
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    
    // Create video elements for playback
    const screenVideo = document.createElement('video');
    const webcamVideo = document.createElement('video');
    screenVideo.srcObject = screenStream;
    webcamVideo.srcObject = webcamStream;
    
    // Animation loop to composite frames at 30fps
    const compositeFrame = () => {
      // Draw screen
      ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
      
      // Draw webcam inset (bottom-right, 25% size)
      const insetSize = 240;
      ctx.drawImage(
        webcamVideo,
        canvas.width - insetSize - 10,
        canvas.height - insetSize - 10,
        insetSize,
        insetSize
      );
      
      requestAnimationFrame(compositeFrame);
    };
    
    compositeFrame();
    
    // Capture canvas stream + audio for recording at 30fps
    const canvasStream = canvas.captureStream(30);
    const audioTracks = [...screenStream.getAudioTracks(), ...webcamStream.getAudioTracks()];
    audioTracks.forEach(track => canvasStream.addTrack(track));
    
    // Record composite stream
    const recorder = new MediaRecorder(canvasStream);
    return { recorder, canvas, screenVideo, webcamVideo };
  }
  ```

**Acceptance:**
- Canvas compositing works at 30fps
- Both streams visible in composite
- Audio captured from both sources
- Permission testing for both screen and camera

---

#### Task 11.2: Create Composite Preview Component
- [ ] Create `src/components/CompositePreview.jsx`:
  - Shows both streams live (screen large, webcam inset)
  - Visual representation of final composite
  - Start/Stop recording buttons
- [ ] Props: `recordingState`, `onStart`, `onStop`

**Acceptance:**
- Preview shows both streams correctly positioned

---

#### Task 11.3: Add IPC Handler for Composite Recording
- [ ] Add to `electron/main.js`:
  ```javascript
  ipcMain.handle('start-composite-record', async (event, screenSourceId) => {
    return captureService.startCompositeRecord(screenSourceId);
  });
  
  ipcMain.handle('stop-composite-record', async (event, recordingData) => {
    return captureService.stopCompositeRecording(recordingData.recorder, recordingData.outputPath);
  });
  ```

**Acceptance:**
- Handlers work correctly

---

#### Task 11.4: Connect to App State & Timeline
- [ ] Update `App.jsx` with composite recording handlers
- [ ] On stop, add clip to main track (composite is full-screen):
  ```javascript
  const newClip = {
    ...recordedClip,
    source: 'screen+webcam',
    track: 'main',  // Composite is the main video
    hasAudio: true
  };
  ```

**Acceptance:**
- Composite recording starts/stops
- Clip added to timeline

---

#### Task 11.5: Test Composite Recording & Performance
- [ ] Manual test: record 20 seconds of screen + webcam
- [ ] Verify: clip appears in timeline with correct duration/resolution
- [ ] Verify: both screen and webcam visible in preview
- [ ] Verify: compositing maintains 30fps during recording
- [ ] Export and verify: exported video shows composite, audio synced
- [ ] Test permission flow for both screen and camera
- [ ] Verify: composite recording works on fresh Mac

**Acceptance:**
- Recording works end-to-end
- Composite looks professional
- Audio synced
- 30fps maintained during compositing
- Permission testing works for both sources

---

### Testing (PR-11)

#### Manual Tests
- [ ] Click "Record Screen + Camera"
  - Expected: Both streams visible in preview (screen large, webcam inset)
- [ ] Start recording, perform actions on screen, stop after 20 seconds
  - Expected: Clip appears in timeline
- [ ] Play recorded clip
  - Expected: Both screen and webcam visible, composite looks clean
- [ ] Export with composite recording
  - Expected: Exported video shows composite correctly, audio present

#### Acceptance Test
```
Scenario: Record screen + webcam composite
  Given I click "Record Screen + Camera"
  When I see preview showing screen (large) + webcam (inset)
  And I start recording
  And I perform actions on screen for 20 seconds
  And I stop recording
  Then clip appears in timeline
  And preview shows composite (screen + webcam inset)
  When I export
  Then exported video has both visible
  And audio from both sources audible
```

---

## PR-12: Multi-Track Timeline
**Objective:** Support main and overlay tracks for compositing clips.

### Acceptance Criteria
- [ ] Timeline shows 2 tracks: Main and Overlay
- [ ] Clips draggable between tracks
- [ ] Overlay clips render on top of main in preview
- [ ] Export composites overlay onto main
- [ ] Visual distinction between tracks
- [ ] Can adjust timing of overlay independently
- [ ] Smooth drag-and-drop between tracks
- [ ] Preview maintains 30fps during multi-track editing

### Tasks

#### Task 12.1: Create MultiTrackTimeline Component
- [ ] Create `src/components/MultiTrackTimeline.jsx`:
  ```jsx
  <div className="multi-track-timeline">
    <div className="track main-track">
      <div className="track-header">Main Video</div>
      {/* Droppable zone for main track clips */}
    </div>
    <div className="track overlay-track">
      <div className="track-header">Overlay</div>
      {/* Droppable zone for overlay track clips */}
    </div>
  </div>
  ```
- [ ] Use react-beautiful-dnd with multiple droppables
- [ ] Props: `clips`, `selectedClipId`, `onSelectClip`, `onTrackChange`, `onDeleteClip`

**Acceptance:**
- Two tracks visible
- Can drag clips between tracks
- Visual feedback on drag

---

#### Task 12.2: Implement Track-Aware Drag & Drop
- [ ] Update drag handler to support track changes:
  ```javascript
  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    
    // Handle both track changes and reordering
    if (destination.droppableId !== source.droppableId) {
      // Track changed (main → overlay or vice versa)
      const newTrack = destination.droppableId === 'main-track' ? 'main' : 'overlay';
      handleTrackChange(draggableId, newTrack);
    } else {
      // Same track, just reordered
      handleReorder(draggableId, source.index, destination.index);
    }
  };
  ```

**Acceptance:**
- Can drag clip to different track
- Can reorder within same track
- State updates correctly

---

#### Task 12.3: Update App State for Multi-Track
- [ ] App state already has `track: 'main' | 'overlay'` in Clip object
- [ ] Update handlers:
  ```javascript
  const handleTrackChange = (clipId, newTrack) => {
    setClips(clips.map(c =>
      c.id === clipId ? { ...c, track: newTrack } : c
    ));
    showToast(`Moved to ${newTrack} track`, 'success');
  };
  ```

**Acceptance:**
- Track property updates correctly
- UI reflects changes

---

#### Task 12.4: Update Preview for Multi-Track (30fps)
- [ ] VideoPreview needs to show composite (if overlay exists):
  - Main track plays in center
  - Overlay track composited on top (if exists)
  - Use canvas or CSS overlay for preview
  - Maintain 30fps during multi-track preview
- [ ] Optional: Canvas-based compositing for live preview:
  ```javascript
  const renderPreview = (mainClip, overlayClip) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Draw main
    ctx.drawImage(mainVideo, 0, 0, canvas.width, canvas.height);
    
    // Draw overlay inset (if exists) at 30fps
    if (overlayClip) {
      ctx.drawImage(overlayVideo, canvas.width - 240 - 10, canvas.height - 240 - 10, 240, 240);
    }
    
    // Maintain 30fps refresh rate
    requestAnimationFrame(() => renderPreview(mainClip, overlayClip));
  };
  ```

**Acceptance:**
- Preview shows composite correctly
- Overlay visible on top of main
- 30fps maintained during multi-track preview

---

#### Task 12.5: Update Export for Multi-Track
- [ ] Modify `mediaProcessor.exportTimeline()`:
  ```javascript
  async function exportTimeline(clips, outputPath) {
    const mainClips = clips.filter(c => c.track === 'main').sort((a, b) => a.order - b.order);
    const overlayClips = clips.filter(c => c.track === 'overlay').sort((a, b) => a.order - b.order);
    
    // Step 1: Export main track (concat main clips)
    const mainOutput = await concatClips(mainClips);
    
    // Step 2: If overlay clips exist, composite them on top
    if (overlayClips.length > 0) {
      const overlayOutput = await concatClips(overlayClips);
      
      // Use FFmpeg filtergraph to composite
      return ffmpegComposite(mainOutput, overlayOutput, outputPath);
    } else {
      // Just main track
      return mainOutput;
    }
  }
  
  function ffmpegComposite(mainPath, overlayPath, outputPath) {
    // FFmpeg command with overlay filter
    return new Promise((resolve, reject) => {
      ffmpeg(mainPath)
        .input(overlayPath)
        .complexFilter('[1]scale=320:240[pip];[0][pip]overlay=W-w-10:H-h-10')
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .run();
    });
  }
  ```

**Acceptance:**
- Export with single track (main only)
- Export with dual tracks (overlay composited)
- FFmpeg command works correctly

---

#### Task 12.6: Add Track Indicators
- [ ] Visual styling to distinguish tracks:
  ```css
  .main-track {
    background: #f9f9f9;
    border-bottom: 2px solid #ddd;
  }
  
  .overlay-track {
    background: #f0f8ff;
    border-bottom: 2px solid #ddd;
  }
  
  .track-header {
    padding: 8px;
    font-weight: bold;
    color: #666;
  }
  ```

**Acceptance:**
- Tracks visually distinct
- Labels clear

---

### Testing (PR-12)

#### Manual Tests
- [ ] Add clip to main track, clip to overlay track
  - Expected: Both visible in timeline on respective tracks
- [ ] Drag overlay clip between tracks
  - Expected: Clip moves, visual feedback shown
- [ ] Preview with both tracks
  - Expected: Composite shown (main with overlay inset)
- [ ] Export with both tracks
  - Expected: Exported video shows composite, correct duration

#### Automated Tests
```javascript
// Test track filtering
const mainTracks = clips.filter(c => c.track === 'main');
const overlayTracks = clips.filter(c => c.track === 'overlay');
expect(mainTracks.length + overlayTracks.length).toBe(clips.length);
```

#### Acceptance Test
```
Scenario: Edit with multi-track timeline
  Given I have 2 main clips and 1 overlay clip
  When I view the timeline
  Then I see 2 tracks labeled "Main" and "Overlay"
  And clips are on correct tracks
  When I drag overlay clip to different position
  And I preview
  Then I see composite (main + overlay inset)
  When I export
  Then exported video has composite correctly
```

---

## PR-13: Audio Controls & Sync
**Objective:** Users can adjust audio levels and verify sync in exports.

### Acceptance Criteria
- [ ] Per-clip volume slider (0-100%)
- [ ] Mute button per clip
- [ ] Audio preview during playback (if single track)
- [ ] Export respects volume levels
- [ ] Audio synced with video in multi-track export
- [ ] Visual indicator: muted clips show 🔇 icon
- [ ] Maintain 30fps during audio adjustments

### Tasks

#### Task 13.1: Add Audio Controls to ClipEditor
- [ ] Update ClipEditor component:
  ```jsx
  <div className="audio-controls">
    <label>Volume: <span>{audioVolume}%</span></label>
    <input
      type="range"
      min="0"
      max="100"
      value={audioVolume}
      onChange={(e) => onAudioVolumeChange(clip.id, e.target.value)}
    />
    <button onClick={() => onMuteToggle(clip.id)}>
      {clip.isMuted ? '🔇 Unmute' : '🔊 Mute'}
    </button>
  </div>
  ```

**Acceptance:**
- Volume slider visible
- Mute button visible
- Both work

---

#### Task 13.2: Update Clip Data Model
- [ ] Ensure Clip object has audio fields:
  ```javascript
  {
    ...existingFields,
    audio: {
      volume: number (0-1),
      isMuted: boolean
    }
  }
  ```

**Acceptance:**
- Audio fields exist in state

---

#### Task 13.3: Implement Volume Handler
- [ ] Update App.jsx:
  ```javascript
  const handleAudioVolumeChange = (clipId, volume) => {
    setClips(clips.map(c =>
      c.id === clipId
        ? { ...c, audio: { ...c.audio, volume: parseFloat(volume) / 100 } }
        : c
    ));
  };
  
  const handleMuteToggle = (clipId) => {
    setClips(clips.map(c =>
      c.id === clipId
        ? { ...c, audio: { ...c.audio, isMuted: !c.audio.isMuted } }
        : c
    ));
  };
  ```

**Acceptance:**
- Volume updates in state
- Mute toggle works

---

#### Task 13.4: Update Export for Audio Levels
- [ ] Modify mediaProcessor to apply audio filters:
  ```javascript
  async function exportClip(clip, outputPath) {
    let ffmpegCmd = ffmpeg(clip.filePath);
    
    // Apply volume adjustment
    if (clip.audio.volume !== 1) {
      const volumeFilter = `volume=${clip.audio.volume}`;
      ffmpegCmd = ffmpegCmd.audioFilter(volumeFilter);
    }
    
    // Apply mute
    if (clip.audio.isMuted) {
      ffmpegCmd = ffmpegCmd.audioFilter('volume=0');
    }
    
    return new Promise((resolve, reject) => {
      ffmpegCmd
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .run();
    });
  }
  ```

**Acceptance:**
- FFmpeg audio filters applied
- Volume respected in export
- Muted clips have no audio

---

#### Task 13.5: Add Mute Indicator to Timeline
- [ ] Show 🔇 icon on muted clips in timeline:
  ```jsx
  {clip.audio.isMuted && <span className="mute-indicator">🔇</span>}
  ```

**Acceptance:**
- Muted clips show indicator

---

### Testing (PR-13)

#### Manual Tests
- [ ] Set clip volume to 50%, play
  - Expected: Audio is quieter
- [ ] Mute clip, play
  - Expected: No audio
- [ ] Set volume 0%, export
  - Expected: Exported clip has quiet audio
- [ ] Mute and export
  - Expected: Exported clip has no audio

#### Automated Tests
```javascript
// Test volume clamping
expect(validateVolume(-5)).toBe(0);
expect(validateVolume(150)).toBe(1);
expect(validateVolume(50)).toBe(0.5);
```

---

## PR-14: Demo Video Recording & Documentation
**Objective:** Create a polished 3-5 minute demo video showcasing all features.

### Acceptance Criteria
- [ ] Demo video 3-5 minutes long
- [ ] Shows import, preview, trim, export (MVP features)
- [ ] Shows screen recording, webcam, composite (Full Submission features)
- [ ] Shows multi-track editing
- [ ] Clear narration
- [ ] No stuttering, smooth playback
- [ ] Professional quality (good lighting, audio)
- [ ] Uploaded to GitHub or cloud storage
- [ ] Link in README

### Tasks

#### Task 14.1: Prepare Demo Script
- [ ] Write 3-5 minute script:
  ```
  0:00 - "I built ClipForge, a desktop video editor in 72 hours"
  0:15 - Show import of video file
  0:45 - Show preview and trim
  1:15 - Show screen recording capture
  1:45 - Show webcam recording
  2:15 - Show screen + webcam composite
  2:45 - Show multi-track timeline
  3:15 - Show export with progress
  3:45 - Play exported video result
  4:15 - "All features shipped, tested, and packaged"
  4:30 - End
  ```

**Acceptance:** Script written and timed

---

#### Task 14.2: Set Up Recording Environment
- [ ] Clear desk/background
- [ ] Test lighting (avoid shadows on screen)
- [ ] Test audio (quiet environment, no background noise)
- [ ] Close unnecessary applications
- [ ] Have test video ready to import

**Acceptance:** Environment looks professional

---

#### Task 14.3: Record Demo Workflow
- [ ] Record 3-5 minute video showing:
  1. Import 1080p video clip
  2. Preview and play
  3. Trim clip (10-50s)
  4. Record screen (15 seconds)
  5. Record webcam (10 seconds)
  6. Show screen + webcam composite
  7. Arrange clips on multi-track timeline
  8. Export (show progress, complete)
  9. Play exported result in QuickTime
  10. "Shipped in 72 hours. All features working."
- [ ] Narrate clearly throughout
- [ ] Test audio levels
- [ ] No stutter or lag visible
- [ ] Clean, professional presentation

**Acceptance:**
- Demo records end-to-end without crashing
- Video is smooth (no dropped frames)
- Audio clear
- All features demonstrated

---

#### Task 14.4: Upload Demo Video
- [ ] Export demo video (H.264, good quality)
- [ ] Upload to Google Drive or Dropbox
- [ ] Get shareable link
- [ ] Add to GitHub README

**Acceptance:**
- Demo video accessible from GitHub
- Link works

---

#### Task 14.5: Update README for Full Submission
- [ ] Add sections:
  ```markdown
  ## Full Features (v1.0 Submission)
  
  ### Recording
  - Screen recording (full screen or window)
  - Webcam recording with audio
  - Screen + Webcam composite (PiP)
  
  ### Editing
  - Multi-track timeline (main + overlay)
  - Trim clips with visual preview
  - Drag-to-reorder
  - Audio volume control + mute
  
  ### Export
  - MP4 export with all features
  - Audio synced across tracks
  - Progress indicator
  
  ## Demo Video
  [Watch 4-minute demo](https://drive.google.com/file/...)
  
  ## Architecture
  - Electron main/renderer separation
  - FFmpeg for media processing
  - React for UI
  - IPC for async operations
  ```

**Acceptance:**
- README updated with all features
- Demo video link visible
- Professional presentation

---

### Testing (PR-14)

#### Demo Video Quality Checks
- [ ] Video clarity: 1080p or better
- [ ] Audio clear: no background noise, narration audible
- [ ] Pacing: flows smoothly, demo doesn't lag
- [ ] Completeness: all major features shown
- [ ] Professional: good lighting, clean presentation

#### Manual Testing of Demo Content
- [ ] Try each feature shown in demo on fresh Mac
- [ ] Verify: everything works as shown
- [ ] Time export shown in demo (should match actual timing)

---

## PR-15: Final Testing, Packaging & Release
**Objective:** Ensure Full Submission is production-ready, packaged, and released.

### Acceptance Criteria
- [ ] All tests pass (MVP + Full Submission)
- [ ] No console errors or warnings
- [ ] App tested on fresh Mac
- [ ] `.dmg` packaged and tested
- [ ] GitHub release created with all assets
- [ ] README complete and accurate
- [ ] Performance targets met
- [ ] Memory leaks checked

### Tasks

#### Task 15.1: Execute Full Test Suite
- [ ] Run all MVP tests (PR-1 through PR-8)
- [ ] Run all Full Submission tests (PR-9 through PR-14)
- [ ] Document results
- [ ] Fix any failures

**Acceptance:** All tests PASS

---

#### Task 15.2: Test on Fresh macOS
- [ ] Fresh Mac or VM
- [ ] Extract `.dmg`, launch app
- [ ] Run complete test workflow:
  - Import video
  - Preview and trim
  - Screen recording
  - Webcam recording
  - Screen + webcam composite
  - Multi-track editing
  - Export
- [ ] Document any issues
- [ ] Fix before release

**Acceptance:**
- All features work on fresh Mac
- No setup issues

---

#### Task 15.3: Performance Profiling
- [ ] Timeline with 15 clips: responsive
- [ ] Multi-track export: < 5 minutes
- [ ] Memory: stable over 20-minute session
- [ ] CPU: reasonable utilization

**Acceptance:**
- Performance targets met

---

#### Task 15.4: Console Cleanup
- [ ] Remove all debug logs
- [ ] Fix all warnings
- [ ] Run Electron DevTools, should be silent

**Acceptance:** Zero console errors or warnings

---

#### Task 15.5: Create GitHub Release
- [ ] Build final `.dmg`: `npm run make`
- [ ] Tag release: `git tag -a v1.0.0-full -m "Full Submission Release"`
- [ ] Push tag: `git push origin v1.0.0-full`
- [ ] Create GitHub Release with:
  - Title: "ClipForge v1.0.0 - Full Submission"
  - Description: features, system requirements, setup, known limitations
  - Attach `.dmg` file
  - Link to demo video
- [ ] Test download from release

**Acceptance:**
- Release published
- `.dmg` downloadable
- All assets present

---

#### Task 15.6: Final README Check
- [ ] Verify all sections present and accurate:
  - Project description
  - Features (MVP + Full Submission)
  - System requirements
  - Installation steps
  - Usage guide
  - Keyboard shortcuts
  - Architecture overview
  - Known limitations
  - Demo video link
- [ ] Proofread for typos/clarity

**Acceptance:** README is complete, professional, helpful

---

#### Task 15.7: Commit Final Changes
- [ ] `git add .`
- [ ] `git commit -m "Final submission: All features tested and polished"`
- [ ] `git push origin main`

**Acceptance:** Final code committed and pushed

---

### Testing (PR-15)

#### Integration Tests (Full Workflow)
```
Scenario: Complete Full Submission workflow
  Given app is freshly launched from .dmg
  When I import a video
  And I record screen (15s)
  And I record webcam (10s)
  And I record screen + webcam (10s)
  And I arrange on multi-track timeline
  And I set audio levels
  And I export
  Then export completes in < 5 minutes
  And exported video shows all features
  And audio is synced across tracks
```

#### Performance Tests
- Multi-track timeline (10+ clips): smooth
- Export 3-minute video: < 5 minutes
- Memory: stable over 20 minutes
- CPU: < 80% utilization during normal editing

---

## Summary: Full Submission PRs by Priority

| PR | Feature | Effort | Duration | Critical |
|---|---------|--------|----------|----------|
| 9 | Screen Recording | M | 6h | ✅ REQUIRED |
| 10 | Webcam Recording | M | 5h | ✅ REQUIRED |
| 11 | Screen + Webcam Composite | H | 6h | ✅ REQUIRED |
| 12 | Multi-Track Timeline | H | 8h | ✅ REQUIRED |
| 13 | Audio Controls | L | 3h | ⚠️ Important |
| 14 | Demo Video | M | 4h | ✅ CRITICAL |
| 15 | Final Testing & Release | M | 6h | ✅ CRITICAL |

**Total Full Submission Effort: ~38 hours**
**Time Available: Tuesday PM through Wednesday 10:59 PM (~24 hours)**

**Strategy:** MVP must ship by Tuesday night. Wednesday focus on recording features + multi-track. Polish and demo in final hours.

---

## Recommended Build Order for Full Submission

1. **MVP Complete** (Tuesday 10:59 PM) ✅
2. **PR-9** (Wednesday 8 AM-2 PM, 6 hours) — Screen recording
3. **PR-10** (Wednesday 12 PM-5 PM, 5 hours) — Webcam recording (overlap with PR-9)
4. **PR-11** (Wednesday 2 PM-8 PM, 6 hours) — Screen + webcam composite
5. **PR-12** (Wednesday 4 PM-12 AM, 8 hours) — Multi-track timeline (can start while PR-11 in progress)
6. **PR-13** (Wednesday 6 PM-9 PM, 3 hours) — Audio controls
7. **PR-14** (Wednesday 8 PM-12 AM, 4 hours) — Demo video (start recording while testing)
8. **PR-15** (Wednesday 10 PM-10:59 PM, 1 hour) — Final push + release

**Finish by: Wednesday 10:59 PM ✅**

---

## Critical Path Dependencies

```
PR-1 (Boilerplate) → PR-2 (Import) → PR-3 (Preview) → PR-5 (Export)
                  ↓
                PR-4 (Trim) → PR-5 (Export)
                
                PR-6 (Reorder) → PR-5 (Export)
                
                PR-7 (UI Polish) — can run in parallel with others
                
                PR-8 (Testing) — must happen after MVP features complete

PR-9 (Screen Record) ┐
PR-10 (Webcam)      ├→ PR-12 (Multi-Track) → PR-15 (Release)
PR-11 (Composite)   ┘

PR-13 (Audio) → (optional, can add after PR-12)

PR-14 (Demo) → (can record after features tested)
```

**Key Insight:** Can parallelize: PR-2+3, PR-4+5, PR-9+10, and UI/Testing in parallel with core features.