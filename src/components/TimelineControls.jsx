import React from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import './TimelineControls.css';

/**
 * TimelineControls Component
 * Controls for zoom, scroll, and navigation
 */
export default function TimelineControls({ 
  zoomLevel, 
  onZoomChange, 
  scrollPosition, 
  onScrollChange 
}) {
  const zoomLevels = [0.5, 1, 2];
  const currentZoomIndex = zoomLevels.indexOf(zoomLevel);

  const handleZoomIn = () => {
    if (currentZoomIndex < zoomLevels.length - 1) {
      onZoomChange(zoomLevels[currentZoomIndex + 1]);
    }
  };

  const handleZoomOut = () => {
    if (currentZoomIndex > 0) {
      onZoomChange(zoomLevels[currentZoomIndex - 1]);
    }
  };

  const handleResetZoom = () => {
    onZoomChange(1);
  };

  return (
    <div className="timeline-controls">
      <div className="zoom-controls">
        <button
          className="zoom-btn"
          onClick={handleZoomOut}
          disabled={currentZoomIndex === 0}
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
        <span className="zoom-level">{zoomLevel}x</span>
        <button
          className="zoom-btn"
          onClick={handleZoomIn}
          disabled={currentZoomIndex === zoomLevels.length - 1}
          title="Zoom In"
          aria-label="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
        <button
          className="zoom-btn"
          onClick={handleResetZoom}
          title="Reset Zoom"
          aria-label="Reset Zoom"
        >
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  );
}
