import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';

export default function RightDrawer({ isOpen, onClose, children, header }) {
  const [isVisible, setIsVisible] = useState(false);
  const drawerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      setIsVisible(false);
      document.body.style.overflow = '';
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => e.key === 'Escape' && onClose();
    const handleClickOutside = (e) =>
      drawerRef.current && !drawerRef.current.contains(e.target) && onClose();
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-end"
      style={{ background: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div
        ref={drawerRef}
        className="z-[300] h-[calc(100vh-2rem)] w-[420px] shadow-2xl transition-transform duration-150 ease-out flex flex-col rounded-2xl border"
        style={{
          transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
          borderColor: 'var(--color-border-primary)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          background: 'var(--color-bg-primary)'
        }}
      >
        {/* Header */}
        {header && (
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--color-border-primary)' }}>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {header}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <FiX size={20} />
            </button>
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
} 