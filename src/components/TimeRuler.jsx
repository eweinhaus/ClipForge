import React from 'react';
import { formatDuration } from '../utils/formatters';
import './TimeRuler.css';

/**
 * TimeRuler Component
 * Professional time ruler with adaptive interval spacing
 */
export default function TimeRuler({ duration, pxPerSecond, scrollPosition }) {
  const generateTimeMarkers = () => {
    const markers = [];
    
    // Calculate adaptive interval based on zoom level
    // At 0.25x zoom (12.5px per second), we need larger intervals
    // At 1x zoom (50px per second), we can use smaller intervals
    let interval, majorInterval;
    
    if (pxPerSecond < 20) {
      // Very zoomed out - use 10 second intervals
      interval = 10;
      majorInterval = 30;
    } else if (pxPerSecond < 30) {
      // Zoomed out - use 5 second intervals
      interval = 5;
      majorInterval = 15;
    } else if (pxPerSecond < 40) {
      // Medium zoom - use 2 second intervals
      interval = 2;
      majorInterval = 10;
    } else {
      // Normal zoom - use 1 second intervals
      interval = 1;
      majorInterval = 5;
    }
    
    const maxTime = Math.ceil(duration);
    
    for (let time = 0; time <= maxTime; time += interval) {
      const position = time * pxPerSecond;
      const isMajorTick = time % majorInterval === 0;
      
      markers.push(
        <div
          key={time}
          className={`time-marker ${isMajorTick ? 'major' : 'minor'}`}
          style={{ left: position }}
        >
          {isMajorTick && (
            <span className="time-label">
              {formatTimecode(time)}
            </span>
          )}
        </div>
      );
    }
    
    return markers;
  };

  const formatTimecode = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30); // Assuming 30fps
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  return (
    <div className="time-ruler">
      {generateTimeMarkers()}
    </div>
  );
}
