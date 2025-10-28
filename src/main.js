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
    },
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
};

// Import fileManager and mediaProcessor
const fileManager = require('../electron/fileManager');
const mediaProcessor = require('../electron/mediaProcessor');

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
    const ffmpeg = require('fluent-ffmpeg');
    const { getFFmpegPath, getFFprobePath } = require('../electron/utils/ffmpegPath');
    
    const ffmpegPath = getFFmpegPath();
    const ffprobePath = getFFprobePath();

    console.log('[FFmpeg] Resolved binary paths', { ffmpegPath, ffprobePath });

    ffmpeg.setFfmpegPath(ffmpegPath);
    ffmpeg.setFfprobePath(ffprobePath);
    
    console.log('[FFmpeg] Paths configured successfully');
    
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
