import React, { useEffect, useRef } from 'react';
import { FiX } from 'react-icons/fi';
import Button from './Button';

export default function Modal({ 
  isOpen, 
  onClose, 
  header, 
  description, 
  headerIcon = null,
  buttons = [
    { 
      text: 'Cancel', 
      color: 'gray', 
      onClick: null,
      icon: null
    },
    { 
      text: 'Confirm', 
      color: 'networth', 
      onClick: null,
      icon: null
    }
  ]
}) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    const handleKeyDown = (e) => e.key === 'Escape' && onClose();
    const handleClickOutside = (e) =>
      modalRef.current && !modalRef.current.contains(e.target) && onClose();

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[500] flex items-center justify-center p-4"
      style={{ 
        background: 'var(--color-backdrop-overlay)',
        backdropFilter: `blur(var(--color-backdrop-blur))`
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
              <div
          ref={modalRef}
          className="w-full max-w-md bg-white shadow-2xl transition-all flex flex-col rounded-2xl border"
          style={{
            borderColor: 'var(--color-border-primary)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b rounded-t-2xl" 
             style={{ borderColor: 'var(--color-border-primary)' }}>
          <div className="flex items-center gap-3">
            {headerIcon && (
              <div className="flex items-center justify-center">
                {headerIcon}
              </div>
            )}
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
              {header}
            </h2>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-2 hover:bg-gray-100 rounded-full transition-all duration-200 cursor-pointer"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <FiX size={20} />
          </button>
        </div>
        
        {/* Content */}
        <div className="px-6 py-4">
          {typeof description === 'string' ? (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {description}
            </p>
          ) : (
            <div className="text-sm leading-relaxed">
              {description}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 px-6 py-4 border-t rounded-b-2xl" 
             style={{ borderColor: 'var(--color-border-primary)' }}>
          {buttons.map((button, index) => (
            <Button
              key={index}
              label={button.text}
              onClick={(e) => {
                e.stopPropagation();
                if (button.onClick) {
                  button.onClick();
                } else {
                  onClose();
                }
              }}
              color={button.color}
              width="flex-1"
              darkText={button.color === 'gray'}
              icon={button.icon}
              disabled={button.disabled}
            />
          ))}
        </div>
      </div>
    </div>
  );
} 