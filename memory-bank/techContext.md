# Tech Context: ClipForge MVP

## Technologies Used ✅ IMPLEMENTED

*   **Framework:** Electron Forge with webpack template ✅
*   **Frontend:** React 18 with hooks ✅
*   **Build Tools:** Webpack with babel-loader for JSX ✅
*   **Media Processing:** `fluent-ffmpeg` (Node.js wrapper for FFmpeg) ✅
*   **Package Manager:** npm ✅
*   **IPC Security:** contextBridge with contextIsolation ✅

## Technologies To Be Added (Future PRs)

*   **Drag & Drop Library:** `react-beautiful-dnd` (PR-6)
*   **Video Player:** Standard HTML5 `<video>` element (PR-3)
*   **Toast Notifications:** `react-hot-toast` or similar (PR-5)

## Development Setup ✅ WORKING

### Prerequisites

*   Node.js 16+ (`node -v` to check) ✅
*   FFmpeg (for development): `brew install ffmpeg` on macOS ⚠️

### Development Workflow ✅ TESTED

1.  **Install Dependencies:** `npm install` ✅
2.  **Start Development Server:** `npm start` ✅
   - Launches Electron app with webpack dev server
   - Window opens at 1400x900 with DevTools
   - React app renders successfully

### Packaging for Distribution ✅ WORKING

1.  **Build Command:** `npm run make` ✅
2.  **Output:** Generates a `.zip` file: `out/make/zip/darwin/x64/clipforge-darwin-x64-1.0.0.zip` ✅

### Testing Packaged App ✅ VERIFIED

1. Extract the `.zip` file ✅
2. Launch the application: `./clipforge.app/Contents/MacOS/clipforge` ✅
3. **FFmpeg Status:** Working! "FFmpeg is working! Formats available: 409" ✅

## Technical Constraints and Dependencies ✅ IMPLEMENTED

*   **FFmpeg Bundling:** ✅ Successfully bundled within the packaged app using `extraResource` in forge.config.js
*   **IPC for Native Operations:** ✅ Secure contextBridge implementation with all handlers for PR-2
*   **macOS as Target Platform:** ✅ Tested and working on macOS (darwin-x64)
*   **Electron Forge:** ✅ Used for project scaffolding, development, and packaging
*   **Security:** ✅ contextIsolation: true, nodeIntegration: false
*   **Window Configuration:** ✅ 1400x900, min 1000x600, proper webPreferences

## Current Package.json Scripts ✅ WORKING

```json
{
  "scripts": {
    "start": "electron-forge start",     ✅ Working
    "package": "electron-forge package", ✅ Working  
    "make": "electron-forge make",       ✅ Working
    "publish": "electron-forge publish",  🔄 Not tested
    "lint": "echo \"No linting configured\"" ✅ Working
  }
}
```

## Dependencies Status

### Installed ✅
- `electron` - Core framework
- `react` - UI library  
- `react-dom` - React DOM rendering
- `fluent-ffmpeg` - FFmpeg wrapper
- `@babel/preset-react` - JSX compilation
- `babel-loader` - Webpack loader
- `copy-webpack-plugin` - For copying FFmpeg binaries in dev (PR-2)

### To Be Added (Future PRs)
- `react-beautiful-dnd` - Drag and drop (PR-6)
- `react-hot-toast` - Notifications (PR-5)
- `uuid` - Unique IDs for clips (PR-2) - **NOTE: This was implemented as a utility, not a separate package**

## Known Technical Issues

*   **EGL Errors:** Normal macOS warnings in console, don't affect functionality
*   **Autofill Errors:** DevTools warnings, don't affect functionality
