import React, { useEffect, useRef } from 'react';
import { Trash2, Copy, RotateCcw } from 'lucide-react';
import './ContextMenu.css';

/**
 * ContextMenu Component
 * Right-click context menu for clip operations
 */
export default function ContextMenu({ 
  isOpen, 
  position, 
  onClose, 
  onDelete, 
  onDuplicate, 
  onResetTrim 
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 1000
      }}
    >
      <div className="context-menu-item" onClick={onDuplicate}>
        <Copy size={16} />
        <span>Duplicate</span>
      </div>
      
      <div className="context-menu-item" onClick={onResetTrim}>
        <RotateCcw size={16} />
        <span>Reset Trim</span>
      </div>
      
      <div className="context-menu-divider"></div>
      
      <div className="context-menu-item danger" onClick={onDelete}>
        <Trash2 size={16} />
        <span>Delete</span>
      </div>
    </div>
  );
}
