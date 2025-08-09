import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiArrowLeft } from 'react-icons/fi';

export default function BottomSheet({ isOpen, onClose, children, header, maxHeight = '80vh', onBack = null, viewKey = 0, navDirection = 'forward' }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const sheetRef = useRef(null);
  const backdropRef = useRef(null);

  // Explicit staged children for transitions
  const [renderedChild, setRenderedChild] = useState(children);
  const [prevChild, setPrevChild] = useState(null);
  const [incomingChild, setIncomingChild] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const dirRef = useRef(1);
  const prevRef = useRef(null);
  const currRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setIsVisible(true);
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    // No nav change: update child without animation
    // eslint-disable-next-line eqeqeq
    if (!isAnimating && viewKey == null) {
      setRenderedChild(children);
      return;
    }
  }, [children]);

  useEffect(() => {
    // Start animation when viewKey changes
    setPrevChild(renderedChild);
    setIncomingChild(children);
    setIsAnimating(true);
    dirRef.current = navDirection === 'forward' ? 1 : -1;
    requestAnimationFrame(() => {
      const prevEl = prevRef.current;
      const curEl = currRef.current;
      if (!prevEl || !curEl) { setIsAnimating(false); setPrevChild(null); setIncomingChild(null); setRenderedChild(children); return; }
      prevEl.style.transition = 'none';
      prevEl.style.transform = 'translateX(0px)';
      curEl.style.transition = 'none';
      curEl.style.transform = `translateX(${dirRef.current * 28}px)`;
      requestAnimationFrame(() => {
        prevEl.style.transition = 'transform 220ms ease';
        curEl.style.transition = 'transform 220ms ease';
        prevEl.style.transform = `translateX(${dirRef.current * -28}px)`;
        curEl.style.transform = 'translateX(0px)';
      });
    });
    const t = setTimeout(() => {
      setRenderedChild((prev) => incomingChild || prev);
      setIsAnimating(false);
      setPrevChild(null);
      setIncomingChild(null);
    }, 240);
    return () => clearTimeout(t);
  }, [viewKey]);

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
    if (deltaY > 100) onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === backdropRef.current) onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div ref={backdropRef} className="fixed inset-0 z-[200] flex items-end justify-center" style={{ background: 'rgba(0, 0, 0, 0.5)' }} onClick={handleBackdropClick}>
      <div
        ref={sheetRef}
        className="w-full shadow-2xl transition-transform duration-150 ease-out flex flex-col rounded-t-2xl border pointer-events-auto"
        style={{ height: maxHeight, transform: isVisible ? 'translateY(0)' : 'translateY(100%)', borderColor: 'var(--color-border-primary)', boxShadow: '0 -25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)', background: 'var(--color-bg-primary)' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 rounded-full" style={{ background: 'var(--color-border-primary)' }} />
        </div>

        {(header || onBack) && (
          <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--color-border-primary)' }}>
            {onBack && (
              <button onClick={onBack} className="p-2 rounded-md hover:bg-gray-100 cursor-pointer" title="Back" aria-label="Back" style={{ color: 'var(--color-text-muted)' }}>
                <FiArrowLeft size={18} />
              </button>
            )}
            {header && (
              <h2 className="text-[14px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {header}
              </h2>
            )}
          </div>
        )}

        {/* Content with smooth slide */}
        <div className="flex-1 overflow-y-auto relative">
          {isAnimating && prevChild && (
            <div ref={prevRef} className="absolute inset-0">
              {prevChild}
            </div>
          )}
          {isAnimating && incomingChild && (
            <div ref={currRef} className="absolute inset-0">
              {incomingChild}
            </div>
          )}
          {!isAnimating && (
            <div className="absolute inset-0">
              {renderedChild}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
} 