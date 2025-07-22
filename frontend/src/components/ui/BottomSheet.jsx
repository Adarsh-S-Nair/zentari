import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function BottomSheet({ isOpen, onClose, children, header, maxHeight = '80vh' }) {
  const [visible, setVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [translateY, setTranslateY] = useState(window.innerHeight);
  const sheetRef = useRef(null);
  const backdropRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      // Start from bottom and slide up
      setTranslateY(window.innerHeight);
      // Trigger slide up animation after a brief delay
      setTimeout(() => {
        setTranslateY(0);
      }, 50);
      
      // Prevent background scrolling
      document.body.style.overflow = 'hidden';
    } else {
      // Slide down animation
      setTranslateY(window.innerHeight);
      setTimeout(() => {
        setVisible(false);
      }, 200);
      
      // Restore background scrolling
      document.body.style.overflow = '';
    }
    
    return () => {
      // Cleanup: restore scrolling if component unmounts
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const closeWithDelay = () => {
    // Slide down animation
    setTranslateY(window.innerHeight);
    setTimeout(() => {
      setVisible(false);
      onClose();
    }, 200);
  };

  const handleTouchStart = (e) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    
    const newY = e.touches[0].clientY;
    setCurrentY(newY);
    
    const deltaY = newY - startY;
    if (deltaY > 0) { // Only allow downward drag
      setTranslateY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    const deltaY = currentY - startY;
    const threshold = 100; // Minimum drag distance to close
    
    if (deltaY > threshold) {
      // Close the sheet
      setTranslateY(window.innerHeight);
      closeWithDelay();
    } else {
      // Snap back to original position
      setTranslateY(0);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === backdropRef.current) {
      closeWithDelay();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => e.key === 'Escape' && closeWithDelay();
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) return null;

  return createPortal(
    <div 
      ref={backdropRef}
      className="fixed inset-0 z-[200] flex items-end pointer-events-auto"
      style={{ 
        background: 'var(--color-backdrop-overlay)',
        backdropFilter: `blur(var(--color-backdrop-blur))`
      }}
      onClick={handleBackdropClick}
    >
      <div
        ref={sheetRef}
        className="w-full bg-white shadow-2xl transition-all flex flex-col rounded-t-2xl border pointer-events-auto"
        style={{
          height: maxHeight,
          transform: `translateY(${translateY}px)`,
          opacity: visible ? 1 : 0,
          transition: isDragging ? 'none' : 'all 0.2s ease',
          borderColor: 'var(--color-border-primary)',
          boxShadow: '0 -25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          position: 'relative',
          zIndex: 201
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div 
            className="w-12 h-1 rounded-full cursor-grab active:cursor-grabbing"
            style={{ background: 'var(--color-border-primary)' }}
          />
        </div>

        
        {/* Content area */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
} 