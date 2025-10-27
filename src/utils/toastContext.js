import React, { createContext, useContext, useState } from 'react';

const ToastContext = createContext();

/**
 * Toast Provider Component
 * Manages global toast notifications
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  /**
   * Show a toast notification
   * @param {string} message - Message to display
   * @param {string} type - Type of toast: 'info', 'success', 'error', 'warning'
   */
  const showToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    const newToast = { id, message, type };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  /**
   * Manually dismiss a toast
   * @param {number} id - Toast ID to dismiss
   */
  const dismissToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
    </ToastContext.Provider>
  );
}

/**
 * Hook to access toast functionality
 * @returns {Object} Toast context with showToast and dismissToast functions
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

