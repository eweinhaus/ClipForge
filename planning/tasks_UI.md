## Tasks: Horizontal Timeline UI Overhaul

---

### PR-1 – Phase 1: Basic Horizontal Timeline

**Objective**: Replace vertical clip list with a single-track horizontal timeline fixed to the bottom of the window.

#### Tasks
1. Add new `TimelineContainer`, `TimeRuler`, `TrackArea`, `Playhead`, and `TimelineControls` components.
2. Update layout in `App.jsx` to position timeline at the bottom (200 px, resizable 150-300 px).
3. Render clip blocks horizontally in `TrackArea`; width proportional to duration.
4. Implement playhead synced with video preview (smooth animation).
5. Implement basic zoom (0.5×, 1×, 2×) and horizontal scroll.
6. Add track label "Video 1" in `TimelineHeader`.
7. Ensure export uses timeline order.
8. Remove/disable old vertical list layout.
9. Write unit tests for clip width calc, zoom logic, and playhead sync.
10. Add documentation & update keyboard shortcuts (if any).

#### Success Criteria
- Timeline appears at bottom, resizable.
- Clips displayed as horizontal blocks at correct proportions.
- Playhead moves in sync with preview playback and seeking.
- Zoom controls change scale smoothly; scrolling works.
- Exported video order matches timeline blocks.
- All unit tests pass; no regressions in existing features.

---

### PR-2 – Phase 2: Professional Editing Features

**Objective**: Introduce snap-to-grid, edge trimming via drag, and extended zoom.

#### Tasks
1. Add drag-handles to clip block edges; update state on trim.
2. Add snap-to-grid utility (1 s intervals) for moving & trimming.
3. Expand zoom levels to 0.25×, 0.5×, 1×, 2×, 4× with smooth transition.
4. Show real-time tooltip with timecode during drag/trim operations.
5. Visual feedback for hover, dragging, invalid trim ranges, etc.
6. Sync drag-trim operations with numeric inputs in `ClipEditor` bidirectionally.
7. Update tests: trim validity, grid snapping accuracy, zoom edge cases.

#### Success Criteria
- Clips can be trimmed by dragging edges with live feedback.
- Moving/trim snaps precisely to 1 s grid when enabled.
- Zoom transitions remain < 16 ms frame time.
- `ClipEditor` numeric values update instantly after drag-trim and vice-versa.
- All modified unit tests pass; no export regression.

---

### PR-3 – Phase 3: Visual Enhancements

**Objective**: Polish timeline visuals with thumbnails, labels, and improved track styling.

#### Tasks
1. Embed clip thumbnail previews inside each block (lazy-loaded).
2. Display clip filename (ellipsized) on block; contrast-safe colours.
3. Add trimmed duration overlay on block bottom-right.
4. Style track area with subtle alternating row colours and borders.
5. Implement hover card with full filename & original duration.
6. Optimize thumbnail caching to prevent memory leaks.
7. Add accessibility labels for screen readers (basic level).
8. Crosstest light/dark OS themes to avoid colour clashes.
9. Visual regression screenshots for main states using Storybook/playwright.

#### Success Criteria
- Thumbnails load quickly (< 150 ms) and do not stutter scroll.
- Labels legible at all zoom levels; tooltip shows full name.
- No memory growth after scrolling timeline for 2 minutes (> 5 clips).
- Visual regression tests pass; UI matches design spec.

---

### PR-4 – Phase 4: Polish & Integration

**Objective**: Finalize user-experience details, keyboard support, context menu, and preference persistence.

#### Tasks
1. Add arrow-key navigation: left/right seek playhead, up/down select prev/next clip.
2. Add context menu (right-click) on clip block: Delete, Duplicate, Reset Trim.
3. Add zoom slider & fit-to-screen button in `TimelineControls`.
4. Persist timeline zoom and last scroll position in localStorage.
5. Add error boundaries around timeline to catch runtime issues.
6. Update HelpDialog with new timeline shortcuts & tips.
7. Conduct usability test (internal) with 3 participants; gather feedback.
8. Final performance audit; ensure 60 fps during drag & zoom with 10 clips.
9. Update README and release notes.

#### Success Criteria
- Keyboard navigation and context menu operate without crashes.
- Preferences restored after app restart.
- Internal usability feedback rated ≥ 4/5 on ease-of-use.
- Timeline interactions maintain 60 fps on 10 clip scenario.
- All end-to-end tests pass; app packages successfully.

---

*End of task list*
