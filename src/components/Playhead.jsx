import React from 'react';
import './Playhead.css';

/**
 * Playhead Component
 * Red vertical line indicating current playback position
 */
export default function Playhead({ position, pxPerSecond, onSeekToTime }) {
  const playheadPosition = position * pxPerSecond;

  const handleClick = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.parentElement.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const timeAtClick = clickX / pxPerSecond;
    onSeekToTime(timeAtClick);
  };

  return (
    <div
      className="playhead"
      style={{ left: `${playheadPosition}px` }}
      onClick={handleClick}
    >
      <div className="playhead-line"></div>
      <div className="playhead-handle"></div>
    </div>
  );
}
