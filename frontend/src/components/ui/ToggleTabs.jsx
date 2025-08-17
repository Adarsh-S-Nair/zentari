import React from 'react'

function ToggleTabs({ options = [], value, onChange, activeStyles = {}, className = '' }) {
  const cols = Math.max(2, options.length)
  const inactiveBg = 'var(--color-bg-secondary)'
  const inactiveColor = 'var(--color-text-secondary)'
  return (
    <div className={`grid rounded-md overflow-hidden border ${className}`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, borderColor: 'var(--color-border-primary)' }}>
      {options.map((opt, idx) => {
        const isActive = String(value) === String(opt.value)
        const isDisabled = !!opt.disabled
        const baseStyle = isActive
          ? (activeStyles[opt.value] || { background: 'var(--color-gradient-primary)', color: 'var(--color-text-white)' })
          : { background: inactiveBg, color: inactiveColor }
        return (
          <button
            key={opt.value}
            disabled={isDisabled}
            className={`text-[12px] py-2 transition-all ${isActive ? 'font-semibold' : ''}`}
            style={{
              ...baseStyle,
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              opacity: isDisabled ? 0.6 : 1,
              borderLeft: idx === 0 ? 'none' : '1px solid var(--color-border-primary)'
            }}
            onClick={() => !isDisabled && onChange && onChange(opt.value)}
            onMouseEnter={(e) => { if (!isActive && !isDisabled) { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.background = 'var(--color-bg-hover)' } }}
            onMouseLeave={(e) => { if (!isActive && !isDisabled) { e.currentTarget.style.transform = 'scale(1.0)'; e.currentTarget.style.background = inactiveBg } }}
          >
            {String(opt.label || opt.value).toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}

export default ToggleTabs
