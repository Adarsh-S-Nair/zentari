import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiArrowLeft } from 'react-icons/fi';

export default function RightDrawer({ isOpen, onClose, children, header, onBack = null, viewKey = 0, navDirection = 'forward' }) {
  const [isVisible, setIsVisible] = useState(false);
  const drawerRef = useRef(null);

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
    // If key didn't change, just update rendered child without animation
    // This protects against re-renders without navigation
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

    // Animate on next frames
    requestAnimationFrame(() => {
      const prevEl = prevRef.current;
      const curEl = currRef.current;
      if (!prevEl || !curEl) { setIsAnimating(false); setPrevChild(null); setIncomingChild(null); setRenderedChild(children); return; }
      // Initialize positions
      prevEl.style.transition = 'none';
      prevEl.style.transform = 'translateX(0px)';
      curEl.style.transition = 'none';
      curEl.style.transform = `translateX(${dirRef.current * 28}px)`;
      // Animate
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

  useEffect(() => {
    const handleKeyDown = (e) => e.key === 'Escape' && onClose();
    const handleClickOutside = (e) => drawerRef.current && !drawerRef.current.contains(e.target) && onClose();
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-end" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>
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
        {(header || onBack) && (
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border-primary)' }}>
            <div className="flex items-center gap-2">
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
            <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-100 cursor-pointer" title="Close" aria-label="Close" style={{ color: 'var(--color-text-muted)' }}>
              <FiX size={18} />
            </button>
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