import React from 'react';
import { formatDuration } from '../utils/formatters';
import './TimeRuler.css';

/**
 * TimeRuler Component
 * Professional time ruler with 1-second intervals
 */
export default function TimeRuler({ duration, pxPerSecond, scrollPosition }) {
  const generateTimeMarkers = () => {
    const markers = [];
    const interval = 1; // 1 second intervals
    const maxTime = Math.ceil(duration);
    
    for (let time = 0; time <= maxTime; time += interval) {
      const position = time * pxPerSecond;
      const isMajorTick = time % 5 === 0; // Major tick every 5 seconds
      
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
