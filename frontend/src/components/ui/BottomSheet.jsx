import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function BottomSheet({ isOpen, onClose, children, header, maxHeight = '80vh' }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const sheetRef = useRef(null);
  const backdropRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      setIsVisible(false);
      document.body.style.overflow = '';
    }
  }, [isOpen]);

  const handleTouchStart = (e) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    
    const newY = e.touches[0].clientY;
    setCurrentY(newY);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    const deltaY = currentY - startY;
    const threshold = 100; // Minimum drag distance to close
    
    if (deltaY > threshold) {
      onClose();
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div 
      ref={backdropRef}
      className="fixed inset-0 z-[200] flex items-end justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.5)' }}
      onClick={handleBackdropClick}
    >
      <div
        ref={sheetRef}
        className="w-full shadow-2xl transition-transform duration-150 ease-out flex flex-col rounded-t-2xl border pointer-events-auto"
        style={{
          height: maxHeight,
          transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
          borderColor: 'var(--color-border-primary)',
          boxShadow: '0 -25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          background: 'var(--color-bg-primary)'
        }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div 
            className="w-12 h-1 rounded-full"
            style={{ background: 'var(--color-border-primary)' }}
          />
        </div>

        {/* Header */}
        {header && (
          <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--color-border-primary)' }}>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {header}
            </h2>
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