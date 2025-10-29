# ClipForge E2E Tests

End-to-end tests for ClipForge video editor using Playwright.

## Test Coverage

### MVP Requirements ✅
- **Video Import** (`mvp-import.spec.js`): Drag & drop, file picker, UI components
- **Timeline View** (`mvp-timeline.spec.js`): Timeline display, tracks, playhead, scrolling
- **Video Preview Player** (`mvp-preview.spec.js`): Preview display, play/pause, time display
- **Trim Functionality** (`mvp-trim.spec.js`): Trim handles, clip editor, duration display
- **Export to MP4** (`mvp-export.spec.js`): Export dialog, export button, progress indicator

### Core Features ✅
- **Recording Features** (`core-recording.spec.js`): Screen, webcam, composite recording UI
- **Timeline Editor** (`core-timeline-editor.spec.js`): Multi-track, drag & drop, zoom, clip selection
- **Preview & Playback** (`core-preview-playback.spec.js`): Real-time preview, scrubbing, multi-track display
- **Export & Sharing** (`core-export.spec.js`): Resolution options, progress indicator, export workflow

### Integration Tests ✅
- **Full Workflow** (`integration-workflow.spec.js`): Complete app structure and navigation

## Setup

1. **Install Playwright browsers** (if not already installed):
```bash
npm run test:e2e:install
```

2. **Create test video fixtures** (optional, for future file import tests):
```bash
npm run create-test-videos
```

## Running Tests

### Run all tests:
```bash
npm run test:e2e
```

### Run tests with UI mode (interactive):
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser):
```bash
npm run test:e2e:headed
```

### Run specific test file:
```bash
npx playwright test e2e/mvp-import.spec.js
```

### Run tests matching a pattern:
```bash
npx playwright test --grep "MVP"
```

## Test Structure

```
e2e/
├── fixtures/              # Test fixtures and utilities
│   └── test-videos.js     # Test video helper functions
├── helpers/               # Test helper functions
│   └── test-helpers.js    # Common test utilities
├── mvp-*.spec.js         # MVP requirement tests
├── core-*.spec.js        # Core feature tests
├── integration-*.spec.js  # Integration tests
└── test-plan.md          # Complete test plan documentation
```

## Important Notes

### Electron App Testing Limitations

These tests run against the Electron renderer process served at `http://localhost:3000`. Since Playwright tests run in a browser context, some Electron-specific features won't work:

- **File System Operations**: File import/export via Electron APIs won't work in browser tests
- **IPC Communication**: Electron IPC calls won't function in browser context
- **Native Features**: Screen recording, webcam access, etc. require Electron APIs

### What These Tests Verify

✅ UI components render correctly  
✅ User interactions (clicks, keyboard) work  
✅ Visual elements are present and accessible  
✅ Component structure and layout  
✅ Navigation and workflow  

### What Requires Electron-Specific Testing

❌ Actual file import/export  
❌ Screen/webcam recording  
❌ IPC communication  
❌ File system operations  

For full Electron integration testing, consider:
- [Spectron](https://github.com/electron-userland/spectron) (deprecated)
- [Playwright's Electron support](https://playwright.dev/docs/api/class-electron) (experimental)
- Custom Electron test harness

## Test Plan

See `e2e/test-plan.md` for the complete test plan covering all MVP and core features from `planning/directions.md`.

## CI/CD Integration

Tests can be run in CI environments. Set `CI=true` environment variable for CI-specific behavior:
- Automatic retries on failure
- Single worker mode
- No reuse of existing server

## Troubleshooting

### Tests fail to start
- Ensure Electron app starts: `npm start` should work
- Check that port 3000 is available
- Increase timeout in `playwright.config.js` if app takes longer to start

### UI elements not found
- Check browser console for errors
- Verify element selectors match current UI
- Run tests in headed mode to see what's happening

### Timeout errors
- Increase timeout in test or config
- Check network tab for failed requests
- Verify Electron app is fully loaded before tests run

