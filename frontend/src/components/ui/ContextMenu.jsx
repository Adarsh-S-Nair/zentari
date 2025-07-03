import React, { useEffect, useRef } from 'react';

const ContextMenu = ({
  isOpen,
  onClose,
  items = [],
  position = { top: 40, right: 0 },
  width = 192
}) => {
  const menuRef = useRef(null);

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

  return (
    <div
      ref={menuRef}
      style={{
        position: 'absolute',
        right: position.right,
        top: position.top,
        width,
        backgroundColor: '#fff',
        borderRadius: 8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        border: '1px solid #e5e7eb',
        zIndex: 50,
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
              onClick={isDisabled ? undefined : item.onClick}
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
                lineHeight: '1.25rem', // ensures text and icon align nicely
              }}
              onMouseEnter={(e) => {
                if (!isDisabled) e.currentTarget.style.backgroundColor = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                if (!isDisabled) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%'
              }}>
                {item.icon}
              </div>
              <span style={{ lineHeight: '1.25rem' }}>{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ContextMenu;
