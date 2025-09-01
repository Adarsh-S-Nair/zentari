import React, { useState, useRef, useEffect } from 'react'
import { FiChevronDown } from 'react-icons/fi'

function Dropdown({ label, name, value, onChange, options, placeholder, disabled = false, className = '' }) {
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

  const selectedOption = options.find(opt => opt.value === value)
  const selectedLabel = selectedOption?.label || placeholder || 'Select an option'

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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setIsOpen(!isOpen)
      setIsFocused(true)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setIsFocused(false)
    }
  }

  return (
    <div className={`w-full ${className}`} ref={dropdownRef}>
      {label && (
        <div className="text-[12px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>
          {label}
        </div>
      )}
      
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              setIsOpen(!isOpen)
              setIsFocused(true)
            }
          }}
          onKeyDown={handleKeyDown}
          className={`
            w-full px-3 py-2 rounded-md border text-left text-sm transition-all duration-150
            flex items-center justify-between gap-2
            ${disabled ? 'cursor-not-allowed opacity-60' : ''}
            ${isFocused ? 'ring-2 ring-blue-300' : ''}
          `}
          style={{
            borderColor: isFocused ? 'var(--color-input-focus)' : 'var(--color-input-border)',
            backgroundColor: 'var(--color-input-bg)',
            color: selectedOption ? 'var(--color-text-primary)' : 'var(--color-text-muted)'
          }}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-labelledby={label ? `${name}-label` : undefined}
        >
          <span className="truncate">{selectedLabel}</span>
          <FiChevronDown
            size={16}
            className={`transition-transform duration-200 flex-shrink-0 ${
              isOpen ? 'rotate-180' : ''
            }`}
            style={{ color: 'var(--color-text-muted)' }}
          />
        </button>

        {/* Dropdown menu */}
        {isOpen && (
          <div
            className="absolute z-50 w-full mt-1 rounded-md shadow-lg border overflow-hidden"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              borderColor: 'var(--color-border-primary)',
              boxShadow: 'var(--color-shadow-medium)'
            }}
          >
            <div className="py-1 max-h-60 overflow-auto">
              {options.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`
                    w-full px-3 py-2 text-sm text-left transition-colors duration-150
                    ${option.value === value ? 'font-medium' : 'font-normal'}
                    ${index === 0 ? 'rounded-t-md' : ''}
                    ${index === options.length - 1 ? 'rounded-b-md' : ''}
                  `}
                  style={{
                    color: option.value === value ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                    backgroundColor: option.value === value ? 'var(--color-bg-selected)' : 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (option.value !== value) {
                      e.target.style.backgroundColor = 'var(--color-bg-hover)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (option.value !== value) {
                      e.target.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dropdown
