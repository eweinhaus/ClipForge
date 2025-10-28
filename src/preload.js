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
  
  // Utility
  selectSaveLocation: () => ipcRenderer.invoke('select-save-location')
});
