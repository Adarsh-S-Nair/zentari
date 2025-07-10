import React, { useEffect, useState, useRef } from 'react';
import { FiX } from 'react-icons/fi';

export default function RightDrawer({ isOpen, onClose, children, header }) {
  const [visible, setVisible] = useState(false);
  const drawerRef = useRef(null);

  useEffect(() => {
    if (isOpen) setVisible(true);

    const handleKeyDown = (e) => e.key === 'Escape' && closeWithDelay();
    const handleClickOutside = (e) =>
      drawerRef.current && !drawerRef.current.contains(e.target) && closeWithDelay();

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const closeWithDelay = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  if (!isOpen) return null;

  return (
    <>
      <style>
        {`
          .right-drawer-scroll::-webkit-scrollbar {
            width: 10px;
            background: var(--color-bg-secondary);
          }
          .right-drawer-scroll::-webkit-scrollbar-thumb {
            background: var(--color-border-primary);
            border-radius: 8px;
          }
          .right-drawer-scroll::-webkit-scrollbar-thumb:hover {
            background: var(--color-border-secondary);
          }
          .right-drawer-scroll::-webkit-scrollbar-corner {
            background: var(--color-bg-secondary);
          }
        `}
      </style>
      <div 
        className="fixed inset-0 z-[300] flex items-start justify-end"
        style={{ 
          background: 'var(--color-backdrop-overlay)',
          backdropFilter: `blur(var(--color-backdrop-blur))`
        }}
      >
      <div
        ref={drawerRef}
        className="z-[400] h-full w-[430px] bg-white shadow-2xl transition-all flex flex-col"
        style={{
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          opacity: visible ? 1 : 0,
          transition: 'all 0.2s ease',
        }}
      >
        {/* Header with close button */}
        <div className="flex items-center justify-between px-7 py-3 border-b" style={{ borderColor: 'var(--color-border-primary)' }}>
          {header && (
            <h2 className="text-lg font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              {header}
            </h2>
          )}
          <button
            onClick={closeWithDelay}
            className="p-1 hover:scale-110 transition-transform duration-200 cursor-pointer"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <FiX size={24} />
          </button>
        </div>
        
        {/* Content area */}
        <div className="flex-1 overflow-y-auto right-drawer-scroll" style={{ 
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--color-border-primary) var(--color-bg-secondary)'
        }}>
          {children}
        </div>
      </div>
    </div>
    </>
  );
} 