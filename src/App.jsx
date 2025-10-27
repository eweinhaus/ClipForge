import React, { useEffect, useState } from 'react';
import FileImporter from './components/FileImporter';
import Timeline from './components/Timeline';
import ClipEditor from './components/ClipEditor';
import VideoPreview from './components/VideoPreview';
import ExportDialog from './components/ExportDialog';
import Notifications from './components/Notifications';

function App() {
  const [ipcStatus, setIpcStatus] = useState('Checking...');

  useEffect(() => {
    // Test IPC bridge
    if (window.electronAPI) {
      setIpcStatus('✅ IPC Bridge Available');
      console.log('electronAPI available:', window.electronAPI);
      
      // Test a stub handler
      window.electronAPI.readMetadata('test.mp4')
        .catch(err => {
          console.log('Expected error from stub handler:', err.message);
        });
    } else {
      setIpcStatus('❌ IPC Bridge Not Available');
    }
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>ClipForge MVP</h1>
      <p>Welcome to ClipForge - Desktop Video Editor</p>
      <p>React is working! 🎉</p>
      <p>IPC Status: {ipcStatus}</p>
      
      <div style={{ marginTop: '20px', border: '1px solid #ccc', padding: '10px' }}>
        <h3>Component Tests:</h3>
        <FileImporter />
        <Timeline />
        <ClipEditor />
        <VideoPreview />
        <ExportDialog />
        <Notifications />
      </div>
    </div>
  );
}

export default App;
