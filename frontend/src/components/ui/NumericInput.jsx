import React from 'react'

// NumericInput: positive integer native number input with guards against e,+,- and non-digits
// Props: value (number), onChange(number), min (number, default 0), placeholder, className, style, disabled
export default function NumericInput({ value, onChange, min = 0, placeholder = '', className = '', style = {}, disabled = false }) {
  const handleKeyDown = (e) => {
    // Block scientific notation and +/-
    if (['e', 'E', '+', '-'].includes(e.key)) {
      e.preventDefault()
      return
    }
  }

  const handleChange = (e) => {
    const raw = e.target.value
    // Allow empty to let user clear, otherwise parse
    if (raw === '' || raw === null) {
      onChange && onChange(0)
      return
    }
    const num = parseInt(raw, 10)
    const clamped = Math.max(min ?? 0, Number.isFinite(num) ? num : 0)
    onChange && onChange(clamped)
  }

  return (
    <input
      type="number"
      min={min}
      step={1}
      value={Number.isFinite(value) && value !== 0 ? String(value) : ''}
      onKeyDown={handleKeyDown}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full px-3 py-2.5 text-sm rounded-md border bg-transparent ${className}`}
      style={{ borderColor: 'var(--color-input-border)', color: 'var(--color-text-primary)', placeholderColor: 'var(--color-text-muted)', ...style }}
    />
  )
}


