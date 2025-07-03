import React, { useEffect, useRef, useLayoutEffect, useState } from 'react';
import ReactDOM from 'react-dom';

const ContextMenu = ({
  isOpen,
  onClose,
  items = [],
  width = 192,
  triggerRef, // Pass in the button/div that triggers the menu
  offset = { x: 0, y: 0 }
}) => {
  const menuRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (isOpen && triggerRef?.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const menuHeight = 90; // Approx height for 2 items
      const menuWidth = width;
  
      let top = rect.top + window.scrollY + offset.y;
      let left = rect.left + window.scrollX + offset.x;
  
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
  
      // If menu overflows bottom, shift it up
      if (top + menuHeight > viewportHeight) {
        top = rect.bottom + window.scrollY - menuHeight - offset.y;
      }
  
      // If menu overflows right, shift it left
      if (left + menuWidth > viewportWidth) {
        left = rect.right + window.scrollX - menuWidth - offset.x;
      }
  
      setPosition({ top, left });
    }
  }, [isOpen, triggerRef, offset, width]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        width,
        backgroundColor: '#fff',
        borderRadius: 8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        border: '1px solid #e5e7eb',
        zIndex: 1000,
        fontSize: 13,
        color: '#374151'
      }}
    >
      <div style={{ padding: '8px 0' }}>
        {items.map((item, index) => {
          const isDisabled = item.disabled;
          return (
            <div
              key={index}
              role={isDisabled ? undefined : 'button'}
              onClick={
                isDisabled
                  ? undefined
                  : () => {
                      onClose();
                      item.onClick?.();
                    }
              }
              style={{
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: isDisabled ? 'default' : 'pointer',
                transition: 'background-color 0.2s ease',
                fontWeight: isDisabled ? 500 : 400,
                color: isDisabled ? '#111827' : '#374151',
                borderBottom: index === 0 ? '1px solid #f3f4f6' : 'none',
                lineHeight: '1.25rem'
              }}
              onMouseEnter={(e) => {
                if (!isDisabled) e.currentTarget.style.backgroundColor = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                if (!isDisabled) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                {item.icon}
              </div>
              <span style={{ lineHeight: '1.25rem' }}>{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>,
    document.body
  );
};

export default ContextMenu;
