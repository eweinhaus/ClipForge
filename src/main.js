const { app, BrowserWindow, ipcMain, dialog, session, protocol } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow;

// Register custom protocol before app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local-media',
    privileges: {
      standard: true,
      secure: true,
      stream: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
      // Enable media permissions
      enablePreferredSizeMode: true,
    },
  });

  // Grant media permissions for screen and camera capture
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    console.log('[Permissions] ============================================');
    console.log('[Permissions] Permission REQUEST received');
    console.log('[Permissions]   Type:', permission);
    console.log('[Permissions]   WebContents ID:', webContents.id);
    console.log('[Permissions]   URL:', webContents.getURL());
    
    // Allow media permissions (camera, microphone, display capture)
    const allowedPermissions = [
      'media',
      'mediaKeySystem',
      'geolocation',
      'notifications',
      'midi',
      'midiSysex',
      'pointerLock',
      'fullscreen',
      'openExternal',
      'unknown',
      'camera',
      'microphone',
      'display-capture'
    ];
    
    if (allowedPermissions.includes(permission)) {
      console.log('[Permissions] ✓ GRANTED:', permission);
      console.log('[Permissions] ============================================');
      callback(true);
    } else {
      console.log('[Permissions] ✗ DENIED:', permission, '(not in allowed list)');
      console.log('[Permissions] ============================================');
      callback(false);
    }
  });

  // Handle permission checks for media devices
  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    console.log('[Permissions] ============================================');
    console.log('[Permissions] Permission CHECK received');
    console.log('[Permissions]   Type:', permission);
    console.log('[Permissions]   Origin:', requestingOrigin);
    console.log('[Permissions]   Details:', JSON.stringify(details, null, 2));
    console.log('[Permissions]   WebContents ID:', webContents?.id);
    
    // Always allow media permissions from our app
    if (permission === 'media' || permission === 'display-capture') {
      console.log('[Permissions] ✓ CHECK PASSED:', permission);
      console.log('[Permissions] ============================================');
      return true;
    }
    
    console.log('[Permissions] ✓ CHECK PASSED (default allow):', permission);
    console.log('[Permissions] ============================================');
    return true; // Allow all for now
  });

  // Configure CSP to allow loading local media files
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders };
    // Remove any existing CSP header regardless of case to avoid duplicates
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === 'content-security-policy') {
        delete headers[key];
      }
    }
    const isDev = !app.isPackaged;
    const csp = isDev
      ? (
        "default-src 'self' data: blob:; " +
        "media-src 'self' local-media: file: data: blob:; " +
        "img-src 'self' local-media: file: data: blob:; " +
        "script-src 'self' 'unsafe-eval'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "connect-src 'self' ws: wss: http://0.0.0.0:3000 http://localhost:3000;"
      )
      : (
        "default-src 'self' data:; " +
        "media-src 'self' local-media: file: data: blob:; " +
        "img-src 'self' local-media: file: data: blob:; " +
        "script-src 'self'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "connect-src 'self';"
      );
    headers['Content-Security-Policy'] = [csp];
    if (details.resourceType === 'mainFrame') {
      console.log('[CSP] Applied CSP to mainFrame:', csp);
    }
    callback({ responseHeaders: headers });
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Log renderer crashes
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('[RENDERER CRASH] ============================================');
    console.error('[RENDERER CRASH] Renderer process crashed!');
    console.error('[RENDERER CRASH] Reason:', details.reason);
    console.error('[RENDERER CRASH] Exit code:', details.exitCode);
    console.error('[RENDERER CRASH] Details:', JSON.stringify(details, null, 2));
    console.error('[RENDERER CRASH] ============================================');
  });

  // Log console messages from renderer
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const levels = ['verbose', 'info', 'warning', 'error'];
    const levelName = levels[level] || 'log';
    console.log(`[Renderer:${levelName}] ${message} (${sourceId}:${line})`);
  });

  // Log when renderer becomes unresponsive
  mainWindow.on('unresponsive', () => {
    console.error('[RENDERER] ============================================');
    console.error('[RENDERER] Window became unresponsive!');
    console.error('[RENDERER] ============================================');
  });

  // Log when renderer becomes responsive again
  mainWindow.on('responsive', () => {
    console.log('[RENDERER] Window became responsive again');
  });
};

// Import fileManager, mediaProcessor, and captureService
const fileManager = require('../electron/fileManager');
const mediaProcessor = require('../electron/mediaProcessor');
const captureService = require('../electron/captureService');

// Register IPC handlers
ipcMain.handle('read-metadata', async (event, filePath) => {
  try {
    console.log('[IPC] read-metadata request received for:', filePath);
    const metadata = await fileManager.getMetadata(filePath);
    console.log('[IPC] Metadata extracted successfully, returning to renderer');
    return { success: true, data: metadata };
  } catch (err) {
    console.error('[IPC] Error reading metadata:', {
      errorType: err.message,
      userMessage: err.userMessage,
      filePath
    });
    
    // Return error info to renderer instead of throwing
    // This gives the UI more control over error handling
    return {
      success: false,
      error: {
        type: err.message || 'UNKNOWN_ERROR',
        message: err.userMessage || 'Failed to read video file',
        details: err.details || err.message
      }
    };
  }
});

ipcMain.handle('select-file', async (event) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Videos', extensions: ['mp4', 'mov', 'webm'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (result.canceled) {
    return [];
  } else {
    return result.filePaths;
  }
});

ipcMain.handle('export-timeline', async (event, { clips, outputPath }) => {
  try {
    console.log('[IPC] export-timeline request received', {
      clipsCount: clips.length,
      outputPath
    });
    
    await mediaProcessor.exportTimeline(clips, outputPath, (progress) => {
      // Send progress updates to renderer
      mainWindow.webContents.send('export-progress', progress);
    });
    
    console.log('[IPC] Export completed successfully');
    return { success: true, outputPath };
  } catch (err) {
    console.error('[IPC] Export failed:', {
      errorType: err.message,
      userMessage: err.userMessage,
      outputPath
    });
    
    // Return error info to renderer instead of throwing
    return {
      success: false,
      error: {
        type: err.message || 'EXPORT_FAILED',
        message: err.userMessage || 'Export failed',
        details: err.details || err.message
      }
    };
  }
});

ipcMain.handle('select-save-location', async () => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Video As',
      defaultPath: 'ClipForge_Export.mp4',
      filters: [
        { name: 'MP4 Video', extensions: ['mp4'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (result.canceled) {
      return { canceled: true };
    }

    return { canceled: false, filePath: result.filePath };
  } catch (err) {
    console.error('[IPC] Save dialog error:', err);
    return { canceled: true, error: err.message };
  }
});

// Screen Recording IPC Handlers
ipcMain.handle('get-sources', async () => {
  try {
    console.log('[IPC] get-sources request received');
    const sources = await captureService.getSources();
    console.log(`[IPC] Returning ${sources.length} sources`);
    return { success: true, data: sources };
  } catch (err) {
    console.error('[IPC] Error getting sources:', err);
    return {
      success: false,
      error: {
        type: 'SOURCES_ERROR',
        message: err.message || 'Failed to get screen sources',
        details: err.message
      }
    };
  }
});

ipcMain.handle('start-screen-record', async (event, sourceId) => {
  try {
    console.log('[IPC] start-screen-record request received for source:', sourceId);
    const recordingData = await captureService.startScreenRecord(sourceId);
    console.log('[IPC] Screen recording started successfully');
    return { success: true, data: recordingData };
  } catch (err) {
    console.error('[IPC] Error starting screen recording:', err);
    return {
      success: false,
      error: {
        type: 'RECORDING_ERROR',
        message: err.message || 'Failed to start screen recording',
        details: err.message
      }
    };
  }
});

ipcMain.handle('start-webcam-record', async () => {
  try {
    console.log('[IPC] start-webcam-record request received');
    const recordingData = await captureService.startWebcamRecord();
    console.log('[IPC] Webcam recording started successfully');
    return { success: true, data: recordingData };
  } catch (err) {
    console.error('[IPC] Error starting webcam recording:', err);
    return {
      success: false,
      error: {
        type: 'RECORDING_ERROR',
        message: err.message || 'Failed to start webcam recording',
        details: err.message
      }
    };
  }
});

ipcMain.handle('start-composite-record', async (event, screenSourceId) => {
  try {
    console.log('[IPC] start-composite-record request received for source:', screenSourceId);
    const recordingData = await captureService.startCompositeRecord(screenSourceId);
    console.log('[IPC] Composite recording started successfully');
    return { success: true, data: recordingData };
  } catch (err) {
    console.error('[IPC] Error starting composite recording:', err);
    return {
      success: false,
      error: {
        type: 'RECORDING_ERROR',
        message: err.message || 'Failed to start composite recording',
        details: err.message
      }
    };
  }
});

ipcMain.handle('stop-screen-record', async (event, { recorder, outputPath, recordingData }) => {
  try {
    console.log('[IPC] stop-screen-record request received');
    const metadata = await captureService.stopRecording(recorder, outputPath, recordingData);
    console.log('[IPC] Screen recording stopped and saved successfully');
    return { success: true, data: metadata };
  } catch (err) {
    console.error('[IPC] Error stopping screen recording:', err);
    return {
      success: false,
      error: {
        type: 'RECORDING_ERROR',
        message: err.message || 'Failed to stop screen recording',
        details: err.message
      }
    };
  }
});

ipcMain.handle('stop-webcam-record', async (event, { recorder, outputPath, recordingData }) => {
  try {
    console.log('[IPC] stop-webcam-record request received');
    const metadata = await captureService.stopRecording(recorder, outputPath, recordingData);
    console.log('[IPC] Webcam recording stopped and saved successfully');
    return { success: true, data: metadata };
  } catch (err) {
    console.error('[IPC] Error stopping webcam recording:', err);
    return {
      success: false,
      error: {
        type: 'RECORDING_ERROR',
        message: err.message || 'Failed to stop webcam recording',
        details: err.message
      }
    };
  }
});

ipcMain.handle('stop-composite-record', async (event, { recorder, outputPath, recordingData }) => {
  try {
    console.log('[IPC] stop-composite-record request received');
    const metadata = await captureService.stopCompositeRecording(recorder, outputPath, recordingData);
    console.log('[IPC] Composite recording stopped and saved successfully');
    return { success: true, data: metadata };
  } catch (err) {
    console.error('[IPC] Error stopping composite recording:', err);
    return {
      success: false,
      error: {
        type: 'RECORDING_ERROR',
        message: err.message || 'Failed to stop composite recording',
        details: err.message
      }
    };
  }
});

ipcMain.handle('test-screen-permissions', async () => {
  try {
    console.log('[IPC] test-screen-permissions request received');
    const hasPermission = await captureService.testScreenPermissions();
    console.log('[IPC] Screen permission test result:', hasPermission);
    return { success: true, data: hasPermission };
  } catch (err) {
    console.error('[IPC] Error testing screen permissions:', err);
    return {
      success: false,
      error: {
        type: 'PERMISSION_ERROR',
        message: err.message || 'Failed to test screen permissions',
        details: err.message
      }
    };
  }
});

ipcMain.handle('request-screen-permission', async () => {
  try {
    console.log('[IPC] request-screen-permission request received');
    const granted = await captureService.requestScreenPermission();
    console.log('[IPC] Screen permission request result:', granted);
    return { success: true, data: granted };
  } catch (err) {
    console.error('[IPC] Error requesting screen permission:', err);
    return {
      success: false,
      error: {
        type: 'PERMISSION_ERROR',
        message: err.message || 'Failed to request screen permission',
        details: err.message
      }
    };
  }
});

ipcMain.handle('write-recording-file', async (event, outputPath, uint8Array) => {
  try {
    console.log('[IPC] write-recording-file request received for:', outputPath);
    
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Convert Uint8Array to Buffer and write file
    const buffer = Buffer.from(uint8Array);
    fs.writeFileSync(outputPath, buffer);
    
    console.log('[IPC] Recording file written successfully');
    return { success: true };
  } catch (err) {
    console.error('[IPC] Error writing recording file:', err);
    return {
      success: false,
      error: {
        type: 'FILE_ERROR',
        message: err.message || 'Failed to write recording file',
        details: err.message
      }
    };
  }
});

ipcMain.handle('get-home-dir', async () => {
  try {
    const homeDir = require('os').homedir();
    return { success: true, data: homeDir };
  } catch (err) {
    console.error('[IPC] Error getting home directory:', err);
    return {
      success: false,
      error: {
        type: 'PATH_ERROR',
        message: err.message || 'Failed to get home directory',
        details: err.message
      }
    };
  }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Register handler for local-media:// protocol
  try {
    protocol.registerFileProtocol('local-media', (request, callback) => {
      const url = request.url || '';
      const filePath = decodeURIComponent(url.replace('local-media://', ''));
      const exists = fs.existsSync(filePath);
      console.log('[Protocol][local-media] Request', { url, filePath, exists });
      if (!exists) {
        console.error('[Protocol][local-media] File does not exist', filePath);
      }
      callback({ path: filePath });
    });
    console.log('[Protocol][local-media] Protocol registered');
  } catch (e) {
    console.error('[Protocol][local-media] Registration failed', e);
  }

  // Test FFmpeg availability
  try {
    const { getFFmpeg } = require('../electron/utils/ffmpegConfig');
    
    const ffmpeg = getFFmpeg();
    
    console.log('[FFmpeg] FFmpeg configured successfully');
    
    // Quick test
    ffmpeg.getAvailableFormats((err, formats) => {
      if (err) {
        console.error('[FFmpeg] Availability check failed', {
          message: err.message,
          code: err.code,
          errno: err.errno,
          path: err.path,
          spawnargs: err.spawnargs
        });

        return;
      }

      const totalFormats = Object.keys(formats).length;
      const sample = Object.keys(formats).slice(0, 5);

      console.log('[FFmpeg] Formats available', totalFormats);
      console.debug('[FFmpeg] Sample formats', sample);
    });
  } catch (err) {
    console.error('[FFmpeg] Setup failed', {
      message: err.message,
      stack: err.stack,
      code: err.code
    });
  }

  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
