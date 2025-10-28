import React, { useEffect } from 'react';
import { X, Keyboard, Info } from 'lucide-react';
import './HelpDialog.css';

/**
 * HelpDialog Component
 * Displays keyboard shortcuts and about information
 */
export default function HelpDialog({ isOpen, onClose }) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Close on backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="help-dialog-backdrop" onClick={handleBackdropClick}>
      <div className="help-dialog" role="dialog" aria-labelledby="help-title" aria-modal="true">
        {/* Header */}
        <div className="help-header">
          <h2 id="help-title">Help & Shortcuts</h2>
          <button
            className="help-close-btn"
            onClick={onClose}
            aria-label="Close help dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="help-content">
          {/* Keyboard Shortcuts Section */}
          <section className="help-section">
            <div className="help-section-header">
              <Keyboard size={20} />
              <h3>Keyboard Shortcuts</h3>
            </div>
            <div className="shortcuts-list">
              <div className="shortcut-item">
                <kbd>Space</kbd>
                <span>Play / Pause video</span>
              </div>
              <div className="shortcut-item">
                <kbd>Delete</kbd>
                <span>Delete selected clip</span>
              </div>
              <div className="shortcut-item">
                <kbd>⌘</kbd> + <kbd>E</kbd>
                <span>Open export dialog</span>
              </div>
              <div className="shortcut-item">
                <kbd>Esc</kbd>
                <span>Close dialogs</span>
              </div>
              <div className="shortcut-item">
                <kbd>Tab</kbd>
                <span>Navigate between elements</span>
              </div>
            </div>
          </section>

          {/* About Section */}
          <section className="help-section">
            <div className="help-section-header">
              <Info size={20} />
              <h3>About ClipForge</h3>
            </div>
            <div className="about-content">
              <p><strong>Version:</strong> 1.0.0 MVP</p>
              <p><strong>Description:</strong> A minimal desktop video editor built with Electron, React, and FFmpeg.</p>
              <p><strong>Features:</strong></p>
              <ul>
                <li>Import MP4, MOV, WebM videos</li>
                <li>Preview and trim clips</li>
                <li>Drag-and-drop reordering</li>
                <li>Export to MP4</li>
              </ul>
              <p><strong>System Requirements:</strong></p>
              <ul>
                <li>macOS 10.13+</li>
                <li>500MB free disk space</li>
              </ul>
              <div className="help-links">
                <a href="https://github.com/yourusername/clipforge" target="_blank" rel="noopener noreferrer">
                  GitHub Repository
                </a>
                <a href="https://github.com/yourusername/clipforge/issues" target="_blank" rel="noopener noreferrer">
                  Report Issues
                </a>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="help-footer">
          <button className="btn-primary" onClick={onClose}>
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}

