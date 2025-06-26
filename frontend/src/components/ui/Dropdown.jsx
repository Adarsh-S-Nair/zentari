import React, { useState, useRef, useEffect } from 'react'
import { FiChevronDown } from 'react-icons/fi'

function Dropdown({ label, name, value, onChange, options }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
        setIsFocused(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedLabel = options.find(opt => opt.value === value)?.label || ''

  const handleSelect = (val) => {
    const fakeEvent = {
      target: {
        name,
        value: val
      }
    }
    onChange(fakeEvent)
    setIsOpen(false)
    setIsFocused(false)
  }

  const getDropdownStyles = () => {
    return {
      width: '100%',
      height: '30px',
      borderRadius: '6px',
      backgroundColor: '#374151',
      color: '#e5e7eb',
      fontSize: '13px',
      boxSizing: 'border-box',
      fontFamily: '"Inter", system-ui, sans-serif',
      padding: '0 10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: isFocused 
        ? '0 0 0 3px rgba(59, 130, 246, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        : '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      border: `1px solid ${isFocused ? '#3b82f6' : '#4b5563'}`,
      transition: 'all 0.15s ease-in-out'
    }
  }

  return (
    <div style={{ width: '100%' }} ref={dropdownRef}>
      <label className="text-[11px] font-medium mb-[4px]" style={{ color: '#d1d5db' }}>
        {label}
      </label>
      <div
        onClick={() => {
          setIsOpen(!isOpen)
          setIsFocused(true)
        }}
        className="relative cursor-pointer select-none"
        style={getDropdownStyles()}
      >
        <span>{selectedLabel}</span>
        <FiChevronDown
          size={16}
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
        {isOpen && (
          <div
            className="absolute z-10 w-full rounded-[6px] shadow-lg"
            style={{
              top: 'calc(100% + 4px)',
              left: 0,
              backgroundColor: '#374151',
              boxSizing: 'border-box',
              border: '1px solid #4b5563',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              animation: 'slideDown 0.2s ease-out',
              overflow: 'hidden'
            }}
          >
            {options.map((opt, idx) => (
              <div
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className={`px-[10px] py-[6px] text-[13px] transition-colors duration-150 cursor-pointer ${
                  idx === 0 ? 'rounded-t-[6px]' : ''
                } ${idx === options.length - 1 ? 'rounded-b-[6px]' : ''}`}
                style={{ 
                  color: '#e5e7eb',
                  borderBottom: idx < options.length - 1 ? '1px solid #4a5568' : 'none'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#4b5563';
                  e.target.style.color = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#e5e7eb';
                }}
              >
                {opt.label}
              </div>
            ))}
          </div>
        )}
      </div>
      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}

export default Dropdown
