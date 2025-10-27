# ClipForge Stretch Goals PRD
**Only Implement If MVP + Full Submission Complete and Polished**

## Overview

These features are "nice-to-have" but dramatically improve the final product. They make you stand out.

**Priority Order:**
1. Transitions (looks polished, moderate effort)
2. Audio Fade In/Out (easy, big UX win)
3. Basic Filters (moderate, visually impressive)
4. Export Presets (easy, shows platform optimization thinking)
5. Undo/Redo (hard, complex state management—skip if tight on time)

---

## Feature: Transitions (HIGH IMPACT)

**User Story:** Between each pair of clips, I can add a fade or slide transition. When exported, clips smoothly transition instead of hard-cutting.

**Acceptance Criteria:**
- Transition selector between each clip pair in timeline
- Options: Fade, Cross-Fade, Slide Left, Slide Right
- Duration configurable (100ms - 500ms)
- Preview shows transition effect
- Export applies transition via FFmpeg xfade filter
- Visual indicator on timeline

**Implementation Details:**

Add to Clip data model:
```javascript
{
  ...existingFields,
  transitionToNext: {
    type: 'fade' | 'crossfade' | 'slideleft' | 'slideright' | null,
    duration: number (milliseconds)
  }
}
```

UI: Small dropdown between each clip pair in timeline. Click → select transition + duration.

Export logic:
```bash
# FFmpeg xfade filter (between two clips)
ffmpeg -i clip1.mp4 -i clip2.mp4 \
  -filter_complex "[0][1]xfade=transition=fade:duration=1:offset=14" \
  -c:v libx264 output.mp4
```

**Code Pattern (for Cursor):**
```javascript
// Build FFmpeg filter string for all transitions
const transitions = clips.map((clip, i) => {
  if (clip.transitionToNext?.type) {
    return `xfade=transition=${clip.transitionToNext.type}:duration=${clip.transitionToNext.duration/1000}:offset=${calculateOffset(i)}`;
  }
  return null;
}).filter(Boolean);
```

**Demo Tip:** Add fade transition between 2 clips. Export and show smooth fade in final video. This looks incredibly polished. Mention: "Transitions make videos feel professional."

**Effort:** 2-3 hours

---

## Feature: Audio Fade In/Out (EASIEST, HIGH VALUE)

**User Story:** I can fade audio in at the start of a clip and fade out at the end for smooth audio transitions.

**Acceptance Criteria:**
- Per-clip fade controls: fade in duration, fade out duration (in seconds)
- Defaults to 0.5s fade
- Slider UI (0-2 seconds)
- Preview reflects faded audio (visual cue)
- Export applies fades via FFmpeg audio filters
- Visual indicator on clip (waveform if possible, or just an icon)

**Implementation Details:**

Add to Clip:
```javascript
{
  ...existingFields,
  audio: {
    fadeIn: number (seconds),    // 0 = no fade
    fadeOut: number (seconds),
    volume: number (0-1)         // from audio controls feature
  }
}
```

UI: Two sliders per clip in ClipEditor
- "Fade In: [0.0s ——— 2.0s]"
- "Fade Out: [0.0s ——— 2.0s]"

Export logic:
```bash
# FFmpeg afade filter
ffmpeg -i input.mp4 \
  -af "afade=t=in:st=0:d=0.5,afade=t=out:st=29.5:d=0.5" \
  output.mp4
```

**Demo Tip:** Show fade controls on a clip. Export and listen to smooth audio fade at start/end. Mention: "Audio fades make clips blend smoothly."

**Effort:** 1-2 hours (easiest feature)

---

## Feature: Basic Filters (VISUALLY IMPRESSIVE)

**User Story:** I can apply simple color adjustments (brightness, contrast, saturation) to individual clips.

**Acceptance Criteria:**
- Per-clip filter panel in ClipEditor
- Three sliders: brightness (-50 to +50), contrast (-50 to +50), saturation (0-200%)
- Preview updates in real-time on canvas overlay
- Reset button returns to defaults
- Export applies filters via FFmpeg
- Filter values persist in Clip object

**Implementation Details:**

Add to Clip:
```javascript
{
  ...existingFields,
  filters: {
    brightness: number (-50 to 50, default 0),
    contrast: number (-50 to 50, default 0),
    saturation: number (0 to 200, default 100)
  }
}
```

Preview: Use canvas-based filter application (HTML5 canvas filters API)
```javascript
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
ctx.filter = `brightness(${1 + brightness/100}) 
              contrast(${1 + contrast/50}) 
              saturate(${saturation/100})`;
ctx.drawImage(videoFrame, 0, 0);
```

Export logic:
```bash
# FFmpeg eq (equalize) filter
ffmpeg -i input.mp4 \
  -vf "eq=brightness=0.2:contrast=1.1:saturation=1.2" \
  output.mp4
```

**Demo Tip:** Brighten a dark clip, increase saturation for vivid colors. Show before/after in export. Mention: "Color grading makes videos look professional."

**Effort:** 2-3 hours

---

## Feature: Export Presets (EASY, SMART)

**User Story:** I can export optimized videos for different platforms (YouTube, Instagram, TikTok) with preset resolutions and aspect ratios.

**Acceptance Criteria:**
- Preset selector in ExportDialog: YouTube, Instagram, TikTok, Custom
- YouTube: 1920x1080 (16:9)
- Instagram: 1080x1080 (1:1)
- TikTok: 1080x1920 (9:16)
- Custom: user sets resolution
- Exported video matches preset dimensions exactly
- Export dialog shows preset preview (aspect ratio thumbnail)

**Implementation Details:**

Preset data:
```javascript
const EXPORT_PRESETS = {
  youtube: { width: 1920, height: 1080, aspectRatio: '16:9' },
  instagram: { width: 1080, height: 1080, aspectRatio: '1:1' },
  tiktok: { width: 1080, height: 1920, aspectRatio: '9:16' },
};
```

Export logic:
```bash
# Scale to preset, maintain aspect ratio, pad if needed
ffmpeg -i input.mp4 \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" \
  output.mp4
```

UI: Radio buttons in ExportDialog
```
Export Format:
○ YouTube (1920x1080)
○ Instagram (1080x1080)
○ TikTok (1080x1920)
○ Custom [Width: ___] [Height: ___]
```

**Demo Tip:** Export same video as YouTube (landscape) and TikTok (vertical). Show both. Mention: "Platform-specific exports save time."

**Effort:** 1-2 hours

---

## Feature: Undo/Redo (HARD, SKIP IF TIME-TIGHT)

**User Story:** If I make a mistake, Cmd+Z undoes it and Cmd+Shift+Z redoes it.

**Acceptance Criteria:**
- Works for: add clip, delete clip, trim, reorder, apply filter, etc.
- Stack limited to 50 operations
- UI buttons show undo/redo availability
- Keyboard shortcuts: Cmd+Z, Cmd+Shift+Z

**Implementation Details:**

State structure:
```javascript
{
  past: [state, state, state],      // previous states
  present: state,                    // current state
  future: [state, state, state]      // redo states
}
```

Actions create new state snapshots:
```javascript
const undo = () => {
  if (past.length > 0) {
    future.unshift(present);
    present = past.pop();
  }
};

const redo = () => {
  if (future.length > 0) {
    past.push(present);
    present = future.shift();
  }
};
```

**Complexity:** Requires refactoring state management (useReducer likely). Don't do this last-minute.

**Effort:** 3-4 hours (complex)

---

## Feature: Keyboard Shortcuts Legend

**User Story:** Users can see all keyboard shortcuts in a Help dialog.

**Acceptance Criteria:**
- Help menu → "Keyboard Shortcuts"
- Clean dialog showing: Shortcut | Action
- Searchable (optional: Cmd+K opens command palette)
- Printable/shareable

**Implementation Details:**

UI: Modal with 2-column table
```
SPACE           | Play / Pause
DELETE          | Delete selected clip
R               | Start recording
S               | Stop recording
CMD+E           | Open export dialog
CMD+S           | Save project
CMD+Z           | Undo
CMD+SHIFT+Z     | Redo
?               | Show this menu
```

**Effort:** 30 minutes

---

## Feature: Advanced Recording: Audio Mixing

**User Story:** When recording screen + webcam, I can adjust microphone volume and system audio separately.

**Acceptance Criteria:**
- Separate volume sliders for mic and system audio before recording
- Real-time preview of audio levels (optional: level meter)
- Balanced mix in exported video
- Audio doesn't clip

**Implementation Details:**

Web Audio API:
```javascript
const audioContext = new AudioContext();
const micGain = audioContext.createGain();
const systemGain = audioContext.createGain();

// Set volumes
micGain.gain.value = 0.7;      // 70% mic volume
systemGain.gain.value = 0.3;   // 30% system volume

// Merge into recorder
const merger = audioContext.createChannelMerger(2);
micStream.connect(micGain).connect(merger);
systemStream.connect(systemGain).connect(merger);
merger.connect(audioContext.destination);
```

**Effort:** 2-3 hours

---

## Feature: Waveform Display in Timeline

**User Story:** I can see audio waveform for each clip in the timeline, making it easier to spot where audio occurs.

**Acceptance Criteria:**
- Clip thumbnail shows waveform (mini graph of audio levels)
- Waveform extracted from audio during import
- Helps with visual editing (sync with dialog, music beats)

**Implementation Details:**

Use `tone.js` or Web Audio API to extract audio data:
```javascript
const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
const rawData = audioBuffer.getChannelData(0);
const downsample = (data, samples) => {
  // Downsample to N samples for visualization
};
```

Canvas-based waveform rendering:
```javascript
const drawWaveform = (canvas, waveformData) => {
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = '#4A90E2';
  waveformData.forEach((value, i) => {
    ctx.lineTo(i, canvas.height / 2 - value * canvas.height);
  });
  ctx.stroke();
};
```

**Effort:** 3-4 hours

---

## Prioritization Matrix

| Feature | Impact | Effort | Time | Recommend? |
|---------|--------|--------|------|-----------|
| Transitions | ⭐⭐⭐ | Medium | 2-3h | YES (polish) |
| Audio Fade | ⭐⭐⭐ | Easy | 1-2h | YES (easy win) |
| Basic Filters | ⭐⭐⭐ | Medium | 2-3h | YES (impressive) |
| Export Presets | ⭐⭐ | Easy | 1-2h | YES (shows thinking) |
| Undo/Redo | ⭐⭐⭐⭐ | Hard | 3-4h | MAYBE (risky) |
| Keyboard Shortcuts Legend | ⭐⭐ | Trivial | 30m | YES (polish) |
| Audio Mixing | ⭐⭐ | Medium | 2-3h | NO (time sink) |
| Waveform Display | ⭐⭐⭐ | Hard | 3-4h | NO (complex) |

---

## Recommended Execution Plan

**If you finish Full Submission by Wednesday 4 PM:**
- Add Transitions (2-3h) → Ship with strong polish
- Add Audio Fade (1-2h) → Quick win
- Show in demo

**If you finish by Wednesday 7 PM:**
- Add all of above
- Add Basic Filters (2-3h)
- Add Export Presets (1-2h)
- Solid feature set

**If you finish by Wednesday 10 PM:**
- Polish existing features
- Fix bugs
- Optimize performance
- Don't start Undo/Redo (too risky)

---

## General Advice

**DO:**
- Pick 1-2 stretch goals early
- Implement incrementally alongside Full Submission features
- Test each thoroughly before moving to next
- Make sure it looks good in demo

**DON'T:**
- Add too many features and sacrifice stability
- Implement Undo/Redo unless you're confident in state management
- Sacrifice core features for stretch goals
- Rush last-minute additions (bugs kill credibility)

**Remember:** A solid, stable editor with 3 polished features beats a buggy editor with 10 half-baked features.

