import React, { useState, useRef, useEffect } from 'react';
import { FiChevronDown } from 'react-icons/fi';

function LightDropdown({ label, name, value, onChange, options, style = {} }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLabel = options.find((opt) => opt.value === value)?.label || '';

  const handleSelect = (val) => {
    onChange({ target: { name, value: val } });
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', ...style }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          height: 32,
          padding: '0 10px',
          border: '1px solid #d1d5db',
          boxSizing: 'border-box',
          borderRadius: 6,
          backgroundColor: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          fontWeight: 500,
          color: '#374151',
          cursor: 'pointer',
          boxShadow: isOpen ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
          transition: 'box-shadow 0.2s ease',
          minWidth: 140,
        }}
      >
        <span>{selectedLabel}</span>
        <FiChevronDown size={12} style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : '' }} />
      </div>
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 36,
            left: 0,
            width: '100%',
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: 6,
            boxShadow: '0 6px 12px rgba(0,0,0,0.05)',
            zIndex: 10,
            overflow: 'hidden',
          }}
        >
          {options.map((opt, idx) => (
            <div
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              style={{
                padding: '6px 10px',
                fontSize: 12,
                cursor: 'pointer',
                color: '#374151',
                backgroundColor: 'transparent',
                borderBottom: idx < options.length - 1 ? '1px solid #f3f4f6' : 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default LightDropdown;
