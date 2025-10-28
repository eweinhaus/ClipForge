# PRD: Horizontal Timeline Implementation

## Overview
Transform ClipForge's vertical clip list into a professional horizontal timeline interface, maintaining simplicity while providing industry-standard video editing capabilities.

## Goals
- **Primary**: Replace vertical list with horizontal timeline for better video editing workflow
- **Secondary**: Add professional timeline features (zoom, snap-to-grid, visual clip representation)
- **Constraint**: Maintain current light theme and simple implementation approach
- **Scale**: Optimized for 10 clips maximum, no complex scaling needed

## User Experience Goals
- **Familiarity**: Timeline should feel intuitive to users familiar with video editors
- **Simplicity**: Clean, uncluttered interface with essential features only
- **Efficiency**: Faster clip management and editing compared to vertical list
- **Visual Clarity**: Clear representation of clip duration, position, and relationships

## Current State Analysis
- **Timeline Component**: Vertical list in left panel (400px wide)
- **Clip Representation**: Thumbnail + metadata in list items
- **Interaction**: Click to select, drag to reorder, numeric trim inputs
- **Layout**: Two-panel design (timeline left, preview right)

## Target State
- **Timeline Component**: Horizontal timeline at bottom of screen
- **Clip Representation**: Visual blocks with thumbnails, duration-based width
- **Interaction**: Click to select, drag edges to trim, drag to reorder
- **Layout**: Three-panel design (media left, preview center, timeline bottom)

## Implementation Phases

### Phase 1: Basic Horizontal Timeline (Week 1-2)
**Goal**: Replace vertical list with functional horizontal timeline

#### Features
- **Timeline Position**: Fixed at bottom, 200px height, user-adjustable (150-300px range)
- **Single Track**: One video track with track label "Video 1"
- **Clip Blocks**: Colored blocks representing clips, width based on duration
- **Time Ruler**: Professional format (00:00:05:00), 1-second intervals
- **Playhead**: Red vertical line, smooth animation, syncs with video preview
- **Basic Zoom**: 3 levels (0.5x, 1x, 2x) with zoom controls
- **Selection**: Click to select clips, blue highlight for selected state

#### Technical Requirements
- **Rendering**: DOM-based for easier styling and maintenance
- **State Management**: Extend current clip state with timeline-specific properties
- **Performance**: Optimized for 10 clips maximum
- **Responsive**: Timeline collapses to 150px on smaller screens

#### Success Criteria
- Timeline displays clips horizontally with correct duration representation
- Playhead syncs with video preview playback
- Clip selection works and updates preview
- Basic zoom functionality works smoothly
- Export maintains correct clip order

### Phase 2: Professional Features (Week 3-4)
**Goal**: Add professional timeline editing capabilities

#### Features
- **Snap-to-Grid**: Clips snap to 1-second intervals when dragging
- **Edge Trimming**: Drag clip edges to trim start/end points
- **Visual Feedback**: Hover states, drag previews, trim handles
- **Advanced Zoom**: 5 levels (0.25x, 0.5x, 1x, 2x, 4x) with smooth transitions
- **Timeline Navigation**: Horizontal scroll with mouse wheel support
- **Clip Colors**: Consistent color scheme with current theme

#### Technical Requirements
- **Interaction Handling**: Mouse events for drag-to-trim functionality
- **State Sync**: Keep timeline trim points in sync with ClipEditor
- **Visual Polish**: Smooth animations and transitions
- **Error Handling**: Prevent invalid trim operations

#### Success Criteria
- Drag-to-trim works smoothly with visual feedback
- Snap-to-grid provides precise positioning
- Timeline navigation is smooth and responsive
- All trim operations maintain data integrity

### Phase 3: Visual Enhancements (Week 5-6)
**Goal**: Improve visual representation and user experience

#### Features
- **Thumbnail Previews**: Show clip thumbnails in timeline blocks
- **Clip Labels**: Display clip names on timeline blocks
- **Duration Display**: Show trimmed duration on clip blocks
- **Track Styling**: Professional track appearance with borders and spacing
- **Hover States**: Rich hover information and previews

#### Technical Requirements
- **Thumbnail Integration**: Use existing thumbnail system
- **Text Rendering**: Efficient text overlay on clip blocks
- **Performance**: Maintain smooth performance with visual enhancements
- **Accessibility**: Basic keyboard navigation support

#### Success Criteria
- Timeline blocks show clear visual information
- Hover states provide useful feedback
- Performance remains smooth with all visual enhancements
- Timeline looks professional and polished

### Phase 4: Polish & Integration (Week 7-8)
**Goal**: Complete integration and final polish

#### Features
- **Keyboard Shortcuts**: Arrow keys for timeline navigation
- **Context Menu**: Right-click menu for clip operations
- **Timeline Controls**: Zoom, scroll, and navigation controls
- **State Persistence**: Remember timeline zoom level and position
- **Error Recovery**: Handle edge cases and invalid states gracefully

#### Technical Requirements
- **Keyboard Handling**: Arrow key navigation between clips
- **Context Menus**: Right-click functionality for clip operations
- **Local Storage**: Persist timeline preferences
- **Error Boundaries**: Graceful handling of timeline errors

#### Success Criteria
- Timeline feels complete and professional
- All edge cases are handled gracefully
- User preferences are remembered
- Integration with existing features is seamless

## Technical Architecture

### Component Structure
```
TimelineContainer (new)
├── TimelineHeader
│   ├── TrackLabel
│   └── TrackControls
├── TimelineContent
│   ├── TimeRuler
│   ├── TrackArea
│   │   └── ClipBlock (multiple)
│   └── Playhead
└── TimelineControls
    ├── ZoomControls
    ├── ScrollControls
    └── NavigationControls
```

### State Management
```javascript
// Extended clip state for timeline
const clipState = {
  // Existing properties
  id, fileName, filePath, duration, width, height, thumbnail,
  trimStart, trimEnd, order, track,
  
  // New timeline properties
  timelinePosition: 0,        // Position in timeline (seconds)
  timelineWidth: 100,         // Width in pixels
  isSelected: false,          // Selection state
  isDragging: false,          // Drag state
  isTrimming: false           // Trim state
};

// Timeline state
const timelineState = {
  zoomLevel: 1,               // Current zoom level
  scrollPosition: 0,         // Horizontal scroll position
  playheadPosition: 0,       // Playhead position in seconds
  snapToGrid: true,          // Snap-to-grid enabled
  trackHeight: 60,           // Height of each track
  timelineHeight: 200        // Total timeline height
};
```

### Data Flow
1. **Clip Import**: Clips added to timeline with calculated positions
2. **Timeline Rendering**: Clips rendered as blocks with duration-based width
3. **User Interaction**: Mouse events update clip state and trigger re-renders
4. **State Sync**: Timeline state synced with video preview and ClipEditor
5. **Export**: Timeline order and trim points used for final export

## Design Decisions

### Layout Changes
- **Timeline Position**: Bottom of screen for industry standard
- **Panel Heights**: Adjustable timeline (150-300px), fixed preview panel
- **Responsive**: Timeline collapses on smaller screens
- **Theme**: Maintain current light theme with professional styling

### Interaction Design
- **Selection**: Click to select, blue highlight for selected state
- **Trimming**: Drag edges + numeric inputs (both methods)
- **Reordering**: Drag clips horizontally to reorder
- **Navigation**: Mouse wheel for horizontal scroll, arrow keys for clip navigation

### Visual Design
- **Clip Blocks**: Colored blocks with thumbnails and labels
- **Track Styling**: Clean borders, proper spacing, professional appearance
- **Playhead**: Red vertical line with smooth animation
- **Time Ruler**: Professional format with clear interval markers

## Technical Requirements

### Performance
- **Rendering**: DOM-based for simplicity and maintainability
- **Updates**: Efficient re-rendering on state changes
- **Memory**: Minimal memory footprint for 10 clips maximum
- **Smoothness**: 60fps animations and interactions

### Browser Support
- **Modern Browsers**: Chrome, Firefox, Safari (Electron environment)
- **No Mobile**: Desktop-only application
- **Smooth Scrolling**: Hardware-accelerated scrolling support

### Integration
- **Existing Features**: Maintain compatibility with current functionality
- **Export**: Timeline order and trim points used for export
- **State Sync**: Keep timeline, preview, and editor in sync
- **Error Handling**: Graceful degradation for edge cases

## Success Metrics

### Phase 1 Success
- Timeline displays clips correctly with duration-based width
- Playhead syncs with video preview
- Basic zoom and selection work
- Export maintains correct order

### Phase 2 Success
- Drag-to-trim works smoothly
- Snap-to-grid provides precise positioning
- Timeline navigation is responsive
- All interactions feel polished

### Phase 3 Success
- Timeline looks professional and informative
- Visual feedback is clear and helpful
- Performance remains smooth
- User experience is intuitive

### Phase 4 Success
- Timeline feels complete and professional
- All edge cases handled gracefully
- Integration is seamless
- User preferences are remembered

## Risk Mitigation

### Technical Risks
- **Performance**: DOM-based rendering may be slower than Canvas
  - *Mitigation*: Optimize for 10 clips, use efficient DOM updates
- **State Sync**: Complex state management between components
  - *Mitigation*: Clear data flow, centralized state management
- **Browser Compatibility**: Smooth scrolling and animations
  - *Mitigation*: Test in Electron environment, use standard APIs

### User Experience Risks
- **Learning Curve**: Users familiar with vertical list may be confused
  - *Mitigation*: Minimal onboarding, intuitive design
- **Feature Complexity**: Too many features may overwhelm users
  - *Mitigation*: Focus on essential features, progressive disclosure

### Implementation Risks
- **Scope Creep**: Timeline may become too complex
  - *Mitigation*: Strict phase boundaries, focus on simplicity
- **Integration Issues**: Breaking existing functionality
  - *Mitigation*: Careful testing, gradual rollout

## Future Considerations

### Potential Enhancements (Post-MVP)
- **Multi-track**: Audio track, multiple video tracks
- **Advanced Editing**: Clip splitting, transitions, effects
- **Timeline Features**: Markers, regions, advanced navigation
- **Performance**: Canvas rendering for better performance

### Scalability
- **Clip Count**: Current design optimized for 10 clips
- **Timeline Length**: Support for longer projects
- **Features**: Room for additional timeline features

## Conclusion

This PRD defines a clear path from the current vertical list to a professional horizontal timeline, maintaining simplicity while providing essential video editing capabilities. The phased approach ensures manageable implementation while delivering value at each stage.

The focus on simplicity for both users and implementation will result in a clean, intuitive timeline that enhances the video editing experience without overwhelming users or developers.
