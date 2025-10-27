// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  readMetadata: (filePath) => ipcRenderer.invoke('read-metadata', filePath),
  
  // Export operations
  exportTimeline: (data) => ipcRenderer.invoke('export-timeline', data),
  onExportProgress: (callback) => ipcRenderer.on('export-progress', callback),
  
  // Utility
  selectFile: () => ipcRenderer.invoke('select-file'),
  selectSaveLocation: () => ipcRenderer.invoke('select-save-location')
});
