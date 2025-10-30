# Product Context: ClipForge MVP

## Why ClipForge Exists (Problems Solved)

ClipForge aims to provide a straightforward desktop video editing experience for users who need to perform basic operations quickly. It addresses the need for a simple tool to import, preview, trim, and export video clips without the complexity of professional-grade software.

## How ClipForge Should Work (Core User Journey)

Users should be able to:

1.  **Import Videos:** Easily drag and drop MP4/MOV/WebM files or use a file picker.
2.  **Record Content:** Capture screen, webcam, or both simultaneously with built-in recording tools.
3.  **Manage Timeline:** View imported and recorded clips in a professional horizontal timeline, reorder them via drag and drop, and delete unwanted clips.
4.  **Preview & Playback:** Select a clip to preview it with play/pause functionality and a scrubber for seeking.
5.  **Trim Clips:** Set precise start and end points for video segments using both drag-to-trim on timeline and simple text inputs, with the preview reflecting the trimmed section.
6.  **Export:** Combine the trimmed and ordered clips into a single MP4 file, selecting an output location, with a progress bar indicating export status.

## Current Focus: Screen Recording Implementation

**MVP Complete** ✅ - All core functionality working with vertical clip list

**Horizontal Timeline Complete** ✅ - Professional horizontal timeline interface:
- **Bottom Timeline:** Industry-standard horizontal timeline at bottom of screen
- **Visual Clips:** Duration-based clip blocks with thumbnails and labels
- **Professional Features:** Time ruler, playhead, zoom controls, snap-to-grid
- **Enhanced Editing:** Drag-to-trim edges, visual feedback, keyboard navigation
- **Familiar UX:** Intuitive for users familiar with video editing software

**Recording Feature In Progress** 🎥 - Built-in screen and webcam recording:
- **Screen Recording:** Capture entire screen or specific windows
- **Webcam Recording:** Record from camera with audio
- **Composite Recording:** Screen + webcam simultaneously
- **Automatic Integration:** Recordings automatically added to timeline
- **Real-time Feedback:** Elapsed time display and recording indicator
- **Permission Management:** Guided permission requests for screen and camera access

## User Experience Goals

*   **Intuitive and Responsive UI:** The interface should be clean, minimal, and easy to understand for first-time users.
*   **Reliable Core Loop:** The fundamental workflow (import → preview → trim → export) must be robust and crash-free.
*   **Performance:** Playback should be smooth, and export times should be reasonable for typical demo videos (<3 minutes for a 2-minute timeline).
*   **Clear Feedback:** Users should receive clear visual feedback for actions (e.g., drag-and-drop highlights, loading spinners, success/error toasts).
