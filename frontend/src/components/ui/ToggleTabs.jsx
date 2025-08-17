import React, { useMemo } from 'react'

function ToggleTabs({ options = [], value, onChange, activeStyles = {}, className = '' }) {
  const activeIndex = useMemo(() => Math.max(0, options.findIndex(o => String(o.value) === String(value))), [options, value])
  const count = Math.max(1, options.length)
  const indicatorWidth = `${100 / count}%`

  return (
    <div className={`relative inline-flex items-center rounded-md border overflow-hidden ${className}`} style={{ borderColor: 'var(--color-border-primary)', background: 'var(--color-bg-secondary)' }}>
      {/* Sliding indicator */}
      <div
        className="absolute top-0 bottom-0 left-0 rounded-md transition-transform duration-200 ease-out will-change-transform"
        style={{
          width: indicatorWidth,
          transform: `translateX(${activeIndex * 100}%)`,
          background: (activeStyles[options[activeIndex]?.value]?.background) || 'var(--color-gradient-primary)'
        }}
      />
      {/* Separators to prevent color bleed */}
      {Array.from({ length: count - 1 }).map((_, i) => (
        <div key={i} className="absolute top-1 bottom-1 w-px z-[1]" style={{ left: `${(100 / count) * (i + 1)}%`, transform: 'translateX(-0.5px)', background: 'var(--color-border-primary)' }} />
      ))}
      {options.map((opt, idx) => {
        const isActive = idx === activeIndex
        const isDisabled = !!opt.disabled
        const activeStyle = activeStyles[opt.value] || { color: 'var(--color-text-white)' }
        const inactiveStyle = { color: 'var(--color-text-secondary)' }
        return (
          <button
            key={opt.value}
            disabled={isDisabled}
            className={`relative z-[2] text-[12px] px-4 py-1.5 transition-colors ${isActive ? 'font-semibold' : 'font-medium'}`}
            style={{
              ...(isActive ? activeStyle : inactiveStyle),
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              opacity: isDisabled ? 0.6 : 1
            }}
            onClick={() => !isDisabled && onChange && onChange(opt.value)}
          >
            {String(opt.label || opt.value).toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}

export default ToggleTabs
