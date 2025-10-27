const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('node:path');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow;

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
      nodeIntegration: false
    },
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// Import fileManager
const fileManager = require('../electron/fileManager');

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

ipcMain.handle('export-timeline', async (event, data) => {
  throw new Error('Not implemented - will be added in PR-5');
});

ipcMain.handle('select-save-location', async () => {
  throw new Error('Not implemented - will be added in PR-5');
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
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
