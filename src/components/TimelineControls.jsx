import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Download, Scissors } from 'lucide-react';
import { debounce } from '../utils/timelineUtils';
import './TimelineControls.css';

/**
 * TimelineControls Component
 * Controls for zoom, scroll, and navigation
 */
export default function TimelineControls({ 
  zoomLevel, 
  onZoomChange, 
  scrollPosition, 
  onScrollChange,
  clips,
  timelineWidth,
  onExport,
  isExporting,
  onSplitClip,
  canSplitClip
}) {
  const zoomLevels = [0.25, 0.5, 1, 2, 4];
  const currentZoomIndex = zoomLevels.indexOf(zoomLevel);
  const sliderRef = useRef(null);

  // Debounced zoom change handler
  const debouncedZoomChange = debounce(onZoomChange, 300);

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

  const handleZoomSliderChange = (e) => {
    const sliderValue = parseFloat(e.target.value);
    debouncedZoomChange(sliderValue);
  };


  return (
    <div className="timeline-controls">
      <div className="timeline-controls-left">
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
          
          {/* Zoom Slider */}
          <div className="zoom-slider-container">
            <input
              ref={sliderRef}
              type="range"
              min="0.25"
              max="4"
              step="0.25"
              value={zoomLevel}
              onChange={handleZoomSliderChange}
              className="zoom-slider"
              title={`Zoom: ${zoomLevel}x`}
              aria-label="Zoom Level"
            />
            <span className="zoom-level">{zoomLevel}x</span>
          </div>
          
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
      
      <div className="timeline-controls-right">
        <button
          className="split-btn"
          onClick={onSplitClip}
          disabled={!canSplitClip}
          title="Split Clip at Playhead (S)"
          aria-label="Split Clip at Playhead"
        >
          <Scissors size={16} />
          <span>Split</span>
        </button>
        <button
          className="export-btn"
          onClick={onExport}
          disabled={clips.length === 0 || isExporting}
          title="Export Timeline"
        >
          <Download size={16} />
          <span>Export</span>
        </button>
      </div>
    </div>
  );
}
