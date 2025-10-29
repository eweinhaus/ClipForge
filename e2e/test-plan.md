# ClipForge Test Plan

Based on `planning/directions.md` requirements.

## MVP Requirements Testing

### 1. Desktop App Launch ✅
- [ ] App window opens successfully
- [ ] App loads without errors
- [ ] Main UI components render

### 2. Video Import
- [ ] Drag & drop video files (MP4/MOV/WebM)
- [ ] File picker for importing videos
- [ ] Import multiple files simultaneously
- [ ] Error handling for invalid files
- [ ] Visual feedback during import

### 3. Timeline View
- [ ] Timeline displays imported clips
- [ ] Clips show thumbnails/previews
- [ ] Clip metadata visible (duration, filename)
- [ ] Timeline scrolls horizontally for long content

### 4. Video Preview Player
- [ ] Preview player displays current clip
- [ ] Video plays imported clips
- [ ] Play/pause controls work
- [ ] Time display shows current/total time

### 5. Trim Functionality
- [ ] Set trim start point (in point)
- [ ] Set trim end point (out point)
- [ ] Trim handles visible and draggable
- [ ] Preview reflects trim changes
- [ ] Duration updates after trimming

### 6. Export to MP4
- [ ] Export button opens export dialog
- [ ] Can select output location
- [ ] Export generates MP4 file
- [ ] Progress indicator shows during export
- [ ] Export completes successfully

## Core Features Testing

### Recording Features
- [ ] Screen recording button available
- [ ] Webcam recording button available
- [ ] Composite (screen + webcam) recording available
- [ ] Recording controls (start/stop) work
- [ ] Recordings appear in timeline after completion

### Import & Media Management
- [ ] Drag and drop zone visible
- [ ] File picker accessible
- [ ] Thumbnail previews generate
- [ ] Metadata displays (duration, resolution, file size)
- [ ] Media library shows all imported clips

### Timeline Editor
- [ ] Visual timeline with playhead
- [ ] Drag clips onto timeline
- [ ] Arrange clips in sequence
- [ ] Trim clips (adjust start/end)
- [ ] Split clips at playhead
- [ ] Delete clips from timeline
- [ ] Multiple tracks (main + overlay)
- [ ] Move clips between tracks
- [ ] Zoom in/out on timeline
- [ ] Snap-to-grid or snap-to-clip edges

### Preview & Playback
- [ ] Real-time preview of timeline composition
- [ ] Play/pause controls responsive
- [ ] Scrubbing (drag playhead) works
- [ ] Audio playback synchronized with video
- [ ] Preview shows current frame at playhead
- [ ] Multi-track preview (main + overlay PiP)

### Export & Sharing
- [ ] Export timeline to MP4
- [ ] Resolution options available (720p, 1080p, source)
- [ ] Progress indicator during export
- [ ] Save to local file system
- [ ] Export validates required fields

## Performance Testing
- [ ] Timeline UI responsive with 10+ clips
- [ ] Preview playback smooth (30 fps minimum)
- [ ] Export completes without crashes
- [ ] App launch time under 5 seconds

## Test Scenarios (from directions.md)
- [ ] Recording a 30-second screen capture and adding to timeline
- [ ] Importing 3 video clips and arranging in sequence
- [ ] Trimming clips and splitting at various points
- [ ] Exporting a 2-minute video with multiple clips
- [ ] Using webcam recording and overlay on screen recording

