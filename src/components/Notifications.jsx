import React from 'react';
import { useToast } from '../utils/toastContext';
import './Notifications.css';

/**
 * Notifications Component
 * Displays toast notifications in bottom-right corner
 */
export default function Notifications() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="notifications-container">
      {toasts.map(toast => (
        <div 
          key={toast.id} 
          className={`toast toast-${toast.type}`}
          onClick={() => dismissToast(toast.id)}
        >
          <span className="toast-message">{toast.message}</span>
          <button 
            className="toast-close"
            onClick={(e) => {
              e.stopPropagation();
              dismissToast(toast.id);
            }}
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
