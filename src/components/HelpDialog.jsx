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

          {/* Timeline Editing Section */}
          <section className="help-section">
            <div className="help-section-header">
              <Keyboard size={20} />
              <h3>Timeline Editing</h3>
            </div>
            <div className="shortcuts-list">
              <div className="shortcut-item">
                <kbd>S</kbd>
                <span>Split clip at playhead position</span>
              </div>
              <div className="shortcut-item">
                <kbd>Drag</kbd> <span className="shortcut-description">clip edges</span>
                <span>Trim clips (with snap-to-grid)</span>
              </div>
              <div className="shortcut-item">
                <kbd>Click</kbd> <span className="shortcut-description">snap button</span>
                <span>Toggle snap-to-grid (1s intervals)</span>
              </div>
              <div className="shortcut-item">
                <kbd>Zoom</kbd> <span className="shortcut-description">controls</span>
                <span>0.25x, 0.5x, 1x, 2x, 4x zoom levels</span>
              </div>
              <div className="shortcut-item">
                <kbd>Hover</kbd> <span className="shortcut-description">clip blocks</span>
                <span>Show trim handles and tooltips</span>
              </div>
            </div>
          </section>

          {/* Timeline Navigation Section */}
          <section className="help-section">
            <div className="help-section-header">
              <Keyboard size={20} />
              <h3>Timeline Navigation</h3>
            </div>
            <div className="shortcuts-list">
              <div className="shortcut-item">
                <kbd>←</kbd> <span className="shortcut-description">Left Arrow</span>
                <span>Seek playhead backward (1 second)</span>
              </div>
              <div className="shortcut-item">
                <kbd>→</kbd> <span className="shortcut-description">Right Arrow</span>
                <span>Seek playhead forward (1 second)</span>
              </div>
              <div className="shortcut-item">
                <kbd>↑</kbd> <span className="shortcut-description">Up Arrow</span>
                <span>Select previous clip</span>
              </div>
              <div className="shortcut-item">
                <kbd>↓</kbd> <span className="shortcut-description">Down Arrow</span>
                <span>Select next clip</span>
              </div>
            </div>
          </section>

          {/* Timeline Context Menu Section */}
          <section className="help-section">
            <div className="help-section-header">
              <Keyboard size={20} />
              <h3>Timeline Context Menu</h3>
            </div>
            <div className="shortcuts-list">
              <div className="shortcut-item">
                <kbd>Right-click</kbd> <span className="shortcut-description">clip block</span>
                <span>Open context menu</span>
              </div>
              <div className="shortcut-item">
                <kbd>Duplicate</kbd> <span className="shortcut-description">menu option</span>
                <span>Create a copy of the clip</span>
              </div>
              <div className="shortcut-item">
                <kbd>Reset Trim</kbd> <span className="shortcut-description">menu option</span>
                <span>Restore clip to full duration</span>
              </div>
              <div className="shortcut-item">
                <kbd>Delete</kbd> <span className="shortcut-description">menu option</span>
                <span>Remove clip from timeline</span>
              </div>
            </div>
          </section>

          {/* Timeline Controls Section */}
          <section className="help-section">
            <div className="help-section-header">
              <Keyboard size={20} />
              <h3>Timeline Controls</h3>
            </div>
            <div className="shortcuts-list">
              <div className="shortcut-item">
                <kbd>Zoom Slider</kbd> <span className="shortcut-description">drag to adjust</span>
                <span>Smooth zoom from 0.25x to 4x</span>
              </div>
              <div className="shortcut-item">
                <kbd>Fit to Screen</kbd> <span className="shortcut-description">button</span>
                <span>Auto-zoom to fit all clips</span>
              </div>
              <div className="shortcut-item">
                <kbd>Snap to Grid</kbd> <span className="shortcut-description">toggle button</span>
                <span>Enable/disable 1-second snapping</span>
              </div>
              <div className="shortcut-item">
                <kbd>Preferences</kbd> <span className="shortcut-description">auto-saved</span>
                <span>Zoom level and scroll position remembered</span>
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
                <li>Professional timeline editing</li>
                <li>Snap-to-grid trimming</li>
                <li>Multi-level zoom (0.25x - 4x)</li>
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

