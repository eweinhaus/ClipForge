# ClipForge Stretch Goals: Task Breakdown by PR
**Only If Full Submission (PR-1 through PR-15) Complete and Polished**

---

## Priority Assessment

**Recommended to Attempt:**
1. Audio Fade In/Out (1-2h, easy, high value)
2. Transitions (2-3h, moderate, very impressive)
3. Basic Filters (2-3h, moderate, visually impressive)
4. Export Presets (1-2h, easy, shows thinking)

**Skip These (Too Complex for Time Crunch):**
- Undo/Redo (complex state management)
- Waveform display (complex audio processing)
- Cloud export (API integration overhead)
- Advanced audio mixing

---

## PR-16: Audio Fade In/Out
**Objective:** Clips can fade audio in at start and out at end for smooth transitions.

**Effort: 1-2 hours | Difficulty: Easy | Impact: High**

### Acceptance Criteria
- [ ] Per-clip fade in/out sliders (0-2 seconds)
- [ ] Preview reflects fades during playback
- [ ] Export applies fades via FFmpeg
- [ ] Visual indicator on clip (optional: mini waveform)
- [ ] Reset button for fades

### Tasks

#### Task 16.1: Add Fade UI to ClipEditor
- [ ] Add sliders to `src/components/ClipEditor.jsx`:
  ```jsx
  <div className="fade-controls">
    <label>Fade In (s): 
      <input type="number" min="0" max="2" step="0.1" 
        value={clip.audio?.fadeIn || 0}
        onChange={(e) => onFadeChange(clip.id, 'fadeIn', e.target.value)} />
    </label>
    <label>Fade Out (s):
      <input type="number" min="0" max="2" step="0.1"
        value={clip.audio?.fadeOut || 0}
        onChange={(e) => onFadeChange(clip.id, 'fadeOut', e.target.value)} />
    </label>
  </div>
  ```

**Acceptance:** Sliders visible and editable

---

#### Task 16.2: Update Clip Data Model
- [ ] Extend audio object in Clip:
  ```javascript
  audio: {
    volume: number (0-1),
    isMuted: boolean,
    fadeIn: number (seconds),
    fadeOut: number (seconds)
  }
  ```

**Acceptance:** Fade fields exist in state

---

#### Task 16.3: Implement Fade Handler
- [ ] Update App.jsx:
  ```javascript
  const handleFadeChange = (clipId, fineType, value) => {
    setClips(clips.map(c =>
    setClips(clips.map(c =>
      c.id === clipId
        ? { ...c, audio: { ...c.audio, [fadeType]: parseFloat(value) } }
        : c
    ));
  };
  ```

**Acceptance:** Fade values update in state

---

#### Task 16.4: Update Export for Fades
- [ ] Modify mediaProcessor:
  ```javascript
  async function exportClip(clip, outputPath) {
    const fadeIn = clip.audio?.fadeIn || 0;
    const fadeOut = clip.audio?.fadeOut || 0;
    const duration = clip.trimEnd - clip.trimStart;
    const fadeOutStart = duration - fadeOut;
    
    let audioFilter = '';
    if (fadeIn > 0 || fadeOut > 0) {
      audioFilter = `afade=t=in:st=0:d=${fadeIn},afade=t=out:st=${fadeOutStart}:d=${fadeOut}`;
    }
    
    return new Promise((resolve, reject) => {
      ffmpeg(clip.filePath)
        .setStartTime(clip.trimStart)
        .setDuration(duration)
        .audioFilter(audioFilter)
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .run();
    });
  }
  ```

**Acceptance:**
- FFmpeg afade filter applied
- Export respects fade values

---

#### Task 16.5: Test Audio Fades
- [ ] Manual test: Set fade in 0.5s, fade out 0.5s
- [ ] Export and listen: audio fades smoothly
- [ ] Verify: no distortion, smooth transitions

**Acceptance:** Fades sound natural and professional

---

### Testing (PR-16)

#### Manual Tests
- [ ] Set fade in 1s, fade out 0.5s
- [ ] Export and listen
- [ ] Expected: smooth fade in at start, smooth fade out at end

#### Acceptance Test
```
Scenario: Apply audio fades
  Given I have a clip selected
  When I set Fade In to 1.0s and Fade Out to 0.5s
  And I export
  Then exported audio fades in smoothly for 1 second
  And fades out smoothly in final 0.5 seconds
  And no distortion or clicks
```

---

## PR-17: Transitions Between Clips
**Objective:** Add fade/cross-fade/slide transitions between clips.

**Effort: 2-3 hours | Difficulty: Moderate | Impact: Very High**

### Acceptance Criteria
- [ ] Transition selector between each clip pair
- [ ] Options: Fade, Cross-Fade, Slide Left, Slide Right
- [ ] Duration configurable (100ms - 500ms)
- [ ] Visual indicator on timeline
- [ ] Export applies transition via FFmpeg xfade
- [ ] Preview shows transition (optional, complex)

### Tasks

#### Task 17.1: Add Transition UI
- [ ] Create `src/components/TransitionSelector.jsx`:
  - Dropdown between clip pairs in Timeline
  - Options: None, Fade, Cross-Fade, Slide Left, Slide Right
  - Duration input (100-500ms)
  - Visual icon showing transition type
- [ ] Props: `transition`, `onChangeTransition`

**Acceptance:** Selector visible between clips

---

#### Task 17.2: Update Clip Data Model
- [ ] Add transition field:
  ```javascript
  transitionToNext: {
    type: 'none' | 'fade' | 'crossfade' | 'slideleft' | 'slideright',
    duration: number (milliseconds)
  }
  ```

**Acceptance:** Transition field exists in Clip object

---

#### Task 17.3: Integrate Transition Selector into Timeline
- [ ] Update Timeline component to show transition selector
- [ ] Position between clip pairs
- [ ] Handler to update transition in state:
  ```javascript
  const handleTransitionChange = (clipId, newTransition) => {
    setClips(clips.map(c =>
      c.id === clipId
        ? { ...c, transitionToNext: newTransition }
        : c
    ));
  };
  ```

**Acceptance:**
- Selector visible between clips
- Can change transition
- State updates

---

#### Task 17.4: Update Export for Transitions
- [ ] Modify mediaProcessor to build FFmpeg filtergraph:
  ```javascript
  async function exportTimelineWithTransitions(clips, outputPath) {
    const sortedClips = clips.sort((a, b) => a.order - b.order);
    
    // Build complex filter for transitions
    let filterComplex = '';
    let clipLabels = [];
    
    for (let i = 0; i < sortedClips.length; i++) {
      const clip = sortedClips[i];
      const label = `clip${i}`;
      clipLabels.push(label);
      
      if (clip.transitionToNext?.type && i < sortedClips.length - 1) {
        const nextLabel = `clip${i + 1}`;
        const duration = clip.transitionToNext.duration / 1000;
        const transition = clip.transitionToNext.type;
        
        // xfade filter between clips
        filterComplex += `[${label}][${nextLabel}]xfade=transition=${transition}:duration=${duration}:offset=${calculateOffset(i)}[out${i}];`;
      }
    }
    
    // Run FFmpeg with complex filter
    return runFfmpegWithFilter(filterComplex, sortedClips, outputPath);
  }
  ```

**Acceptance:**
- FFmpeg xfade filter applied
- Transitions appear in export

---

#### Task 17.5: Test Transitions
- [ ] Manual test: Add fade transition between 2 clips (1s duration)
- [ ] Export and watch: smooth fade transition in output
- [ ] Verify: transition duration correct, looks professional

**Acceptance:** Transitions look smooth and professional

---

### Testing (PR-17)

#### Manual Tests
- [ ] Add Fade transition (1s) between clip 1 and clip 2
- [ ] Add Cross-Fade transition (0.5s) between clip 2 and clip 3
- [ ] Export
- [ ] Expected: smooth transitions visible in exported video

#### Acceptance Test
```
Scenario: Add transitions between clips
  Given I have 3 clips in timeline
  When I select Fade transition (1s) between clip 1 and 2
  And Cross-Fade transition (0.5s) between clip 2 and 3
  And I export
  Then exported video shows smooth fade between clip 1-2 (1 second)
  And smooth cross-fade between clip 2-3 (0.5 seconds)
```

---

## PR-18: Basic Color Filters
**Objective:** Apply brightness, contrast, saturation adjustments to clips.

**Effort: 2-3 hours | Difficulty: Moderate | Impact: High**

### Acceptance Criteria
- [ ] Per-clip filter panel: brightness, contrast, saturation
- [ ] Sliders with visual range (-50 to +50 for brightness/contrast, 0-200 for saturation)
- [ ] Preview shows effect (optional but nice)
- [ ] Export applies filters via FFmpeg
- [ ] Reset button for filters
- [ ] Visual preview icon on clip

### Tasks

#### Task 18.1: Add Filter UI to ClipEditor
- [ ] Add sliders to `src/components/ClipEditor.jsx`:
  ```jsx
  <div className="filter-controls">
    <label>Brightness: 
      <input type="range" min="-50" max="50" value={filters.brightness || 0}
        onChange={(e) => onFilterChange(clip.id, 'brightness', e.target.value)} />
      <span>{filters.brightness || 0}</span>
    </label>
    <label>Contrast:
      <input type="range" min="-50" max="50" value={filters.contrast || 0}
        onChange={(e) => onFilterChange(clip.id, 'contrast', e.target.value)} />
      <span>{filters.contrast || 0}</span>
    </label>
    <label>Saturation:
      <input type="range" min="0" max="200" value={filters.saturation || 100}
        onChange={(e) => onFilterChange(clip.id, 'saturation', e.target.value)} />
      <span>{filters.saturation || 100}%</span>
    </label>
    <button onClick={() => onResetFilters(clip.id)}>Reset</button>
  </div>
  ```

**Acceptance:** Sliders visible and editable

---

#### Task 18.2: Update Clip Data Model
- [ ] Add filters field:
  ```javascript
  filters: {
    brightness: number (-50 to 50, default 0),
    contrast: number (-50 to 50, default 0),
    saturation: number (0 to 200, default 100)
  }
  ```

**Acceptance:** Filter fields exist in state

---

#### Task 18.3: Implement Filter Handlers
- [ ] Update App.jsx:
  ```javascript
  const handleFilterChange = (clipId, filterType, value) => {
    setClips(clips.map(c =>
      c.id === clipId
        ? { ...c, filters: { ...c.filters, [filterType]: parseFloat(value) } }
        : c
    ));
  };
  
  const handleResetFilters = (clipId) => {
    setClips(clips.map(c =>
      c.id === clipId
        ? { ...c, filters: { brightness: 0, contrast: 0, saturation: 100 } }
        : c
    ));
  };
  ```

**Acceptance:** Filter state updates correctly

---

#### Task 18.4: Update Export for Filters
- [ ] Modify mediaProcessor:
  ```javascript
  async function exportClip(clip, outputPath) {
    const filters = clip.filters || { brightness: 0, contrast: 0, saturation: 100 };
    
    // Convert slider values to FFmpeg eq filter format
    const brightness = 1 + (filters.brightness / 100);
    const contrast = 1 + (filters.contrast / 50);
    const saturation = filters.saturation / 100;
    
    const eqFilter = `eq=brightness=${brightness}:contrast=${contrast}:saturation=${saturation}`;
    
    return new Promise((resolve, reject) => {
      ffmpeg(clip.filePath)
        .setStartTime(clip.trimStart)
        .setDuration(clip.trimEnd - clip.trimStart)
        .videoFilter(eqFilter)
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .run();
    });
  }
  ```

**Acceptance:**
- FFmpeg eq filter applied
- Filters visible in exported video

---

#### Task 18.5: Test Color Filters
- [ ] Manual test: Increase brightness by 30, increase saturation
- [ ] Export and verify: video is brighter and more saturated
- [ ] Test contrast adjustment
- [ ] Verify: no artifacts, colors look natural

**Acceptance:** Filters produce expected visual effect

---

### Testing (PR-18)

#### Manual Tests
- [ ] Set brightness +40, saturation 150%
- [ ] Export
- [ ] Expected: video is much brighter and more colorful

#### Acceptance Test
```
Scenario: Apply color filters
  Given I select a clip
  When I set Brightness to +40, Saturation to 150%
  And I export
  Then exported video is noticeably brighter
  And colors are more vibrant
  And no distortion or artifacts
```

---

## PR-19: Export Presets (Platform-Specific)
**Objective:** Quick export to platform-optimized formats (YouTube, Instagram, TikTok).

**Effort: 1-2 hours | Difficulty: Easy | Impact: Medium**

### Acceptance Criteria
- [ ] Preset selector in ExportDialog: YouTube, Instagram, TikTok, Custom
- [ ] Each preset has correct resolution and aspect ratio
- [ ] Exported video matches preset dimensions
- [ ] Preview of aspect ratio (thumbnail)
- [ ] Default to YouTube (16:9, 1920x1080)

### Tasks

#### Task 19.1: Define Presets
- [ ] Create `src/utils/exportPresets.js`:
  ```javascript
  export const EXPORT_PRESETS = {
    youtube: {
      name: 'YouTube',
      width: 1920,
      height: 1080,
      aspectRatio: '16:9',
      bitrate: '8M'
    },
    instagram: {
      name: 'Instagram Feed',
      width: 1080,
      height: 1080,
      aspectRatio: '1:1',
      bitrate: '5M'
    },
    tiktok: {
      name: 'TikTok',
      width: 1080,
      height: 1920,
      aspectRatio: '9:16',
      bitrate: '5M'
    },
    custom: {
      name: 'Custom',
      width: null,
      height: null
    }
  };
  ```

**Acceptance:** Presets defined with correct dimensions

---

#### Task 19.2: Add Preset Selector to ExportDialog
- [ ] Update `src/components/ExportDialog.jsx`:
  ```jsx
  <div className="export-presets">
    <label>Format:</label>
    <div className="preset-options">
      {Object.entries(EXPORT_PRESETS).map(([key, preset]) => (
        <label key={key}>
          <input type="radio" name="preset" value={key} 
            checked={selectedPreset === key}
            onChange={(e) => setSelectedPreset(e.target.value)} />
          {preset.name} ({preset.aspectRatio})
        </label>
      ))}
    </div>
    
    {selectedPreset === 'custom' && (
      <div className="custom-resolution">
        <input type="number" placeholder="Width" value={customWidth} onChange={...} />
        <input type="number" placeholder="Height" value={customHeight} onChange={...} />
      </div>
    )}
  </div>
  ```

**Acceptance:**
- Preset radio buttons visible
- Custom resolution inputs show when selected

---

#### Task 19.3: Update Export Handler
- [ ] Modify export to use selected preset:
  ```javascript
  const handleExport = async (outputPath) => {
    const preset = selectedPreset === 'custom'
      ? { width: customWidth, height: customHeight }
      : EXPORT_PRESETS[selectedPreset];
    
    await window.ipcRenderer.invoke('export-timeline', {
      clips,
      outputPath,
      preset
    });
  };
  ```

**Acceptance:**
- Preset passed to export handler

---

#### Task 19.4: Update mediaProcessor for Presets
- [ ] Modify export logic:
  ```javascript
  async function exportTimeline(clips, outputPath, preset) {
    // Export main video first
    // Then scale to preset resolution
    
    if (preset.width && preset.height) {
      const scaledOutput = `/tmp/scaled_${Date.now()}.mp4`;
      
      // FFmpeg scale filter with aspect ratio preservation
      return ffmpeg(mainExport)
        .size(`${preset.width}x${preset.height}`)
        .videoFilter(`scale=${preset.width}:${preset.height}:force_original_aspect_ratio=decrease,pad=${preset.width}:${preset.height}:(ow-iw)/2:(oh-ih)/2`)
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .run();
    }
  }
  ```

**Acceptance:**
- FFmpeg scale filter applied
- Output matches preset dimensions

---

#### Task 19.5: Test Export Presets
- [ ] Manual test: Export as YouTube (1920x1080)
- [ ] Export same timeline as TikTok (1080x1920)
- [ ] Verify: resolutions correct, aspect ratios match
- [ ] Check video quality is maintained

**Acceptance:**
- Exports have correct dimensions
- Aspect ratios preserved

---

### Testing (PR-19)

#### Manual Tests
- [ ] Export as YouTube: verify 1920x1080
- [ ] Export as Instagram: verify 1080x1080
- [ ] Export as TikTok: verify 1080x1920
- [ ] Custom: set 1280x720, verify output

#### Acceptance Test
```
Scenario: Export with platform presets
  Given I have a 16:9 video ready
  When I select YouTube preset and export
  Then exported video is 1920x1080
  When I select TikTok preset and export
  Then exported video is 1080x1920 (vertical)
  And content is not distorted (pillarboxed)
```

---

## PR-20: Keyboard Shortcuts Legend
**Objective:** Show all keyboard shortcuts in help dialog.

**Effort: 30 minutes | Difficulty: Trivial | Impact: Polish**

### Acceptance Criteria
- [ ] Help menu with keyboard shortcuts
- [ ] Modal dialog showing all shortcuts
- [ ] Organized by category (Playback, Edit, Export)
- [ ] Easy to understand and reference

### Tasks

#### Task 20.1: Create Keyboard Shortcuts Reference
- [ ] Create `src/utils/keyboardShortcuts.js`:
  ```javascript
  export const KEYBOARD_SHORTCUTS = {
    playback: [
      { key: 'Space', action: 'Play / Pause' },
      { key: 'Arrow Right', action: 'Seek forward 1 second' },
      { key: 'Arrow Left', action: 'Seek backward 1 second' }
    ],
    editing: [
      { key: 'Delete', action: 'Delete selected clip' },
      { key: 'R', action: 'Start recording' },
      { key: 'S', action: 'Stop recording' }
    ],
    exporting: [
      { key: 'Cmd+E', action: 'Open export dialog' },
      { key: 'Cmd+S', action: 'Save project' }
    ],
    help: [
      { key: '?', action: 'Show this menu' }
    ]
  };
  ```

**Acceptance:** Shortcuts defined

---

#### Task 20.2: Create Shortcuts Dialog Component
- [ ] Create `src/components/ShortcutsDialog.jsx`:
  - Modal with shortcuts organized by category
  - Clean table format
  - Close button
- [ ] Trigger on Help button or `?` key

**Acceptance:**
- Dialog displays all shortcuts
- Easy to read

---

#### Task 20.3: Integrate into App
- [ ] Add Help button to header
- [ ] Add keyboard listener for `?` key
- [ ] Show/hide dialog on trigger

**Acceptance:**
- Help dialog accessible
- Can open with Help button or `?` key

---

### Testing (PR-20)

#### Manual Tests
- [ ] Click Help button
  - Expected: Shortcuts dialog opens
- [ ] Press `?` key
  - Expected: Shortcuts dialog opens
- [ ] Read all shortcuts: clear and accurate

---

## Summary: Stretch Goal PRs by Priority

| PR | Feature | Effort | Duration | Recommendation |
|---|---------|--------|----------|-----------------|
| 16 | Audio Fade In/Out | E | 1-2h | ⭐ DO THIS |
| 17 | Transitions | M | 2-3h | ⭐⭐ DO THIS |
| 18 | Color Filters | M | 2-3h | ⭐⭐ DO THIS |
| 19 | Export Presets | E | 1-2h | ⭐ DO THIS |
| 20 | Keyboard Shortcuts | T | 0.5h | ⭐ DO THIS (quick win) |

**Total Stretch Effort: ~9-11 hours**

---

## Recommended Execution Strategy

**If you finish Full Submission by Wednesday 6 PM:**
- Implement PR-16 (Audio Fade) — 1-2h
- Implement PR-19 (Export Presets) — 1-2h
- Implement PR-20 (Shortcuts) — 30min
- Polish and test — 1h
- **Finish by 10 PM with 3 polish features**

**If you finish by Wednesday 8 PM:**
- Implement PR-16, 19, 20 (as above)
- Implement PR-17 (Transitions) — 2-3h
- **Finish by 10 PM with 4 impressive features**

**If you finish by Wednesday 9 PM:**
- Implement PR-16, 17, 19, 20 (as above)
- Implement PR-18 (Color Filters) — 2-3h
- **Finish by 10 PM with 5 polish features**

---

## Key Advice on Stretch Goals

**DO:**
- Pick 1-2 stretch goals early
- Implement incrementally
- Test each thoroughly
- Make sure core features still work
- Document your choices in README ("Bonus Features Implemented")

**DON'T:**
- Add too many features at once
- Sacrifice stability for features
- Rush last-minute additions
- Skip testing

**Remember:** A solid, stable, feature-complete editor beats a feature-rich but buggy one.

---

## Selling Stretch Goals to Hiring Managers

In your README or demo:

> "Built core features on Tuesday. Wednesday I added:
> - Audio fade in/out for smooth transitions
> - Professional transitions between clips (fade, cross-fade, slide)
> - Color adjustments (brightness, contrast, saturation)
> - Platform-specific export presets (YouTube, Instagram, TikTok)
> 
> These show attention to polish and user experience."

This signals: "I ship fast, then iterate on polish. I think about users and platforms."