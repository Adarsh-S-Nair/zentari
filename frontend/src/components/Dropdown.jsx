import React, { useState, useRef, useEffect } from 'react'
import { FiChevronDown } from 'react-icons/fi'

function Dropdown({ label, name, value, onChange, options }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
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
  }

  return (
    <div style={{ width: '100%' }} ref={dropdownRef}>
      <label className="text-[11px] font-medium mb-[4px]" style={{ color: '#d1d5db' }}>
        {label}
      </label>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="relative cursor-pointer select-none"
        style={{
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
          justifyContent: 'space-between'
        }}
      >
        <span>{selectedLabel}</span>
        <FiChevronDown
          size={16}
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
        {isOpen && (
          <div
            className="absolute z-10 mt-[4px] w-full rounded-[6px] shadow-lg"
            style={{
              top: '100%',
              left: 0,
              backgroundColor: '#374151',
              boxSizing: 'border-box'
            }}
          >
            {options.map((opt, idx) => (
              <div
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className={`px-[10px] py-[6px] text-[13px] hover:bg-[#4b5563] transition-colors duration-150 cursor-pointer ${
                  idx === 0 ? 'rounded-t-[6px]' : ''
                } ${idx === options.length - 1 ? 'rounded-b-[6px]' : ''}`}
                style={{ color: '#e5e7eb' }}
              >
                {opt.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dropdown
