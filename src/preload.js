// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  readMetadata: (filePath) => ipcRenderer.invoke('read-metadata', filePath),
  selectFile: () => ipcRenderer.invoke('select-file'),
  handleDroppedFiles: (files) => {
    // Use webUtils.getPathForFile() to get the file system path from File objects
    // This is the correct way to handle File objects with contextIsolation enabled
    try {
      return files.map(file => {
        try {
          // Validate file type before processing
          const fileName = file.name.toLowerCase();
          const supportedExtensions = ['.mp4', '.mov', '.webm'];
          const hasValidExtension = supportedExtensions.some(ext => fileName.endsWith(ext));
          
          if (!hasValidExtension) {
            console.warn('[Preload] Unsupported file type:', file.name);
            return null;
          }
          
          return webUtils.getPathForFile(file);
        } catch (err) {
          console.error('[Preload] Error getting path for file:', file.name, err);
          return null;
        }
      }).filter(path => path !== null);
    } catch (err) {
      console.error('[Preload] Error processing dropped files:', err);
      return [];
    }
  },
  
  // Export operations
  exportTimeline: (data) => ipcRenderer.invoke('export-timeline', data),
  onExportProgress: (callback) => ipcRenderer.on('export-progress', callback),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  
  // Utility
  selectSaveLocation: () => ipcRenderer.invoke('select-save-location'),
  
  // Screen Recording operations
  getSources: () => ipcRenderer.invoke('get-sources'),
  startScreenRecord: (sourceId) => ipcRenderer.invoke('start-screen-record', sourceId),
  startWebcamRecord: () => ipcRenderer.invoke('start-webcam-record'),
  startCompositeRecord: (screenSourceId) => ipcRenderer.invoke('start-composite-record', screenSourceId),
  stopScreenRecord: (data) => ipcRenderer.invoke('stop-screen-record', data),
  stopWebcamRecord: (data) => ipcRenderer.invoke('stop-webcam-record', data),
  stopCompositeRecord: (data) => ipcRenderer.invoke('stop-composite-record', data),
  
  // Permission operations
  testScreenPermissions: () => ipcRenderer.invoke('test-screen-permissions'),
  requestScreenPermission: () => ipcRenderer.invoke('request-screen-permission'),
  
  // File operations
  writeRecordingFile: (outputPath, buffer) => ipcRenderer.invoke('write-recording-file', outputPath, buffer),
  
  // Utility operations
  getHomeDir: () => ipcRenderer.invoke('get-home-dir')
});
