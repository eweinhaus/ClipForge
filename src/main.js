const { app, BrowserWindow, ipcMain } = require('electron');
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

// Register IPC handlers
ipcMain.handle('read-metadata', async (event, filePath) => {
  throw new Error('Not implemented - will be added in PR-2');
});

ipcMain.handle('select-file', async () => {
  throw new Error('Not implemented - will be added in PR-2');
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
    
    ffmpeg.setFfmpegPath(getFFmpegPath());
    ffmpeg.setFfprobePath(getFFprobePath());
    
    console.log('FFmpeg path:', getFFmpegPath());
    console.log('FFprobe path:', getFFprobePath());
    
    // Quick test
    ffmpeg.getAvailableFormats((err, formats) => {
      if (err) {
        console.error('FFmpeg not available:', err);
      } else {
        console.log('FFmpeg is working! Formats available:', Object.keys(formats).length);
      }
    });
  } catch (err) {
    console.error('FFmpeg setup failed:', err);
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
