# Product Context: ClipForge MVP

## Why ClipForge Exists (Problems Solved)

ClipForge aims to provide a straightforward desktop video editing experience for users who need to perform basic operations quickly. It addresses the need for a simple tool to import, preview, trim, and export video clips without the complexity of professional-grade software.

## How ClipForge Should Work (Core User Journey)

Users should be able to:

1.  **Import Videos:** Easily drag and drop MP4/MOV files or use a file picker.
2.  **Manage Timeline:** View imported clips in a list, reorder them via drag and drop, and delete unwanted clips.
3.  **Preview & Playback:** Select a clip to preview it with play/pause functionality and a scrubber for seeking.
4.  **Trim Clips:** Set precise start and end points for video segments using simple text inputs, with the preview reflecting the trimmed section.
5.  **Export:** Combine the trimmed and ordered clips into a single MP4 file, selecting an output location, with a progress bar indicating export status.

## User Experience Goals

*   **Intuitive and Responsive UI:** The interface should be clean, minimal, and easy to understand for first-time users.
*   **Reliable Core Loop:** The fundamental workflow (import → preview → trim → export) must be robust and crash-free.
*   **Performance:** Playback should be smooth, and export times should be reasonable for typical demo videos (<3 minutes for a 2-minute timeline).
*   **Clear Feedback:** Users should receive clear visual feedback for actions (e.g., drag-and-drop highlights, loading spinners, success/error toasts).
