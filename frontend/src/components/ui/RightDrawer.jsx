import React, { useEffect, useState, useRef } from 'react';
import { FiX } from 'react-icons/fi';

export default function RightDrawer({ isOpen, onClose, children, header }) {
  const [visible, setVisible] = useState(false);
  const drawerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
    } else {
      setVisible(false);
    }

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
      <style jsx>{`
        .drawer-scroll::-webkit-scrollbar {
          width: 8px;
          background: var(--color-gray-100);
        }
        .drawer-scroll::-webkit-scrollbar-thumb {
          background: var(--color-gray-300);
          border-radius: 4px;
          transition: background-color 0.2s ease;
        }
        .drawer-scroll::-webkit-scrollbar-thumb:hover,
        .drawer-scroll::-webkit-scrollbar-thumb:active {
          background: var(--color-gray-400) !important;
        }
        .drawer-scroll::-webkit-scrollbar-corner {
          background: var(--color-gray-100);
        }
        [data-theme="dark"] .drawer-scroll::-webkit-scrollbar {
          background: var(--color-gray-100);
        }
        [data-theme="dark"] .drawer-scroll::-webkit-scrollbar-thumb {
          background: var(--color-gray-400);
        }
        [data-theme="dark"] .drawer-scroll::-webkit-scrollbar-thumb:hover,
        [data-theme="dark"] .drawer-scroll::-webkit-scrollbar-thumb:active {
          background: var(--color-gray-500) !important;
        }
        [data-theme="dark"] .drawer-scroll::-webkit-scrollbar-corner {
          background: var(--color-gray-100);
        }
      `}</style>
      <div 
        className="fixed inset-0 z-[200] flex items-start justify-end p-4"
        style={{ 
          background: 'var(--color-backdrop-overlay)',
          backdropFilter: `blur(var(--color-backdrop-blur))`
        }}
      >
        <div
          ref={drawerRef}
          className="z-[300] h-[calc(100vh-2rem)] w-[420px] bg-white shadow-2xl transition-all flex flex-col rounded-2xl border"
          style={{
            transform: visible ? 'translateX(0)' : 'translateX(100%)',
            opacity: visible ? 1 : 0,
            transition: 'all 0.2s ease',
            borderColor: 'var(--color-border-primary)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
          }}
        >
          {/* Content area */}
          <div className="flex-1 overflow-y-auto drawer-scroll" style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--color-gray-300) var(--color-gray-100)'
          }}>
            <div className="py-4">
              {children}
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 