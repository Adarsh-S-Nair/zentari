import React, { useState } from 'react'

// Blend a hex color with gray to make it duller and darker
function mixWithGray(hex, gray = '#6b7280', ratio = 0.7) {
  const hexToRgb = h => {
    const bigint = parseInt(h.replace('#', ''), 16)
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255]
  }

  const rgbToString = ([r, g, b]) => `rgb(${r}, ${g}, ${b})`

  const blend = (c1, c2, ratio) =>
    Math.round(c1 * (1 - ratio) + c2 * ratio)

  const [r1, g1, b1] = hexToRgb(hex)
  const [r2, g2, b2] = hexToRgb(gray)

  return rgbToString([
    blend(r1, r2, ratio),
    blend(g1, g2, ratio),
    blend(b1, b2, ratio)
  ])
}

// Make a color darker for button backgrounds
function darkenColor(hex, amount = 0.3) {
  const hexToRgb = h => {
    const bigint = parseInt(h.replace('#', ''), 16)
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255]
  }

  const rgbToString = ([r, g, b]) => `rgb(${r}, ${g}, ${b})`

  const [r, g, b] = hexToRgb(hex)
  
  return rgbToString([
    Math.max(0, Math.round(r * (1 - amount))),
    Math.max(0, Math.round(g * (1 - amount))),
    Math.max(0, Math.round(b * (1 - amount)))
  ])
}

// Smaller mini spinner
function MiniSpinner({ center = false }) {
  return (
    <div
      className={`inline-block align-middle border-2 border-white border-t-transparent rounded-full animate-spin${center ? '' : ' mr-2'}`}
      style={{ width: 12, height: 12 }}
    />
  )
}

const colorMap = {
  networth: 'text-white',
  blue: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white',
  red: 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white',
  green: 'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white',
  yellow: 'bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 text-white',
  gray: 'bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-800 shadow-sm border border-gray-200',
  white: 'bg-white hover:bg-gray-100 active:bg-gray-200 text-gray-900 shadow-sm border border-gray-200',
}

function Button({
  label,
  children,
  onClick,
  color = 'networth',
  width = 'w-full',
  loading = false,
  disabled = false,
  darkText = false,
  className = '',
  type = 'button',
  icon = null,
  ...props
}) {
  const [isHovering, setIsHovering] = useState(false)
  const isInactive = disabled || loading

  // Pick color classes
  const colorClasses =
    color in colorMap
      ? colorMap[color]
      : color.includes(' ')
        ? color
        : colorMap.networth
  const baseClasses = `inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-semibold text-[13px] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-300 ${width} cursor-pointer hover:scale-105`
  const inactiveClasses = 'opacity-60 cursor-not-allowed'
  const activeClasses = !isInactive ? 'hover:scale-[1.06] active:scale-95 cursor-pointer' : ''

  // Convert CSS variable to hex for color blending
  const getComputedColor = (cssVar) => {
    if (cssVar.startsWith('var(--')) {
      // For CSS variables, use a fallback approach
      if (cssVar === 'var(--color-primary)') return '#3b82f6'
      if (cssVar === 'var(--color-danger)') return '#dc2626'
      if (cssVar === 'var(--color-gray-200)') return '#e5e7eb'
      if (cssVar === 'var(--color-success)') return '#16a34a'
      if (cssVar === 'var(--color-warning)') return '#f59e0b'
      if (cssVar === 'var(--color-white)') return '#ffffff'
      return '#6b7280' // fallback
    }
    return cssVar
  }

  const baseColor = getComputedColor(color)
  
  // Special handling for white colors
  const isWhite = baseColor === '#ffffff' || baseColor === 'var(--color-white)'
  
  let darkerBg, hoverBg
  
  if (isWhite) {
    darkerBg = '#f1f3f4' // Slightly darker gray, still very light
    hoverBg = '#e8eaed'  // Darker on hover for better feedback
  } else {
    darkerBg = darkenColor(baseColor, 0.15) // Make background slightly darker
    hoverBg = darkenColor(baseColor, 0.25) // Darker on hover
  }
  
  const inactiveBg = mixWithGray(baseColor, '#6b7280', 0.5) // duller inactive

  const lightText = {
    base: 'var(--color-text-white)',
    hover: 'var(--color-gray-100)',
    inactive: 'var(--color-gray-300)'
  }

  const darkTextColors = {
    base: 'var(--color-text-secondary)',     // dark gray, not black
    hover: 'var(--color-text-primary)',    // even darker gray
    inactive: 'var(--color-text-muted)'  // medium muted gray
  }

  const text = darkText ? darkTextColors : lightText

  return (
    <button
      type={type}
      onClick={isInactive ? undefined : onClick}
      disabled={isInactive}
      className={[
        baseClasses,
        colorClasses,
        isInactive ? inactiveClasses : activeClasses,
        'relative',
        className,
      ].join(' ')}
      aria-busy={loading}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onFocus={() => setIsHovering(true)}
      onBlur={() => setIsHovering(false)}
      style={{ 
        color: 'var(--color-text-white)',
        background: color === 'networth' ? 'var(--color-gradient-primary)' : undefined,
        ...(color === 'networth' && isHovering && !isInactive && { background: 'var(--color-gradient-primary-hover)' }),
        ...(color === 'networth' && isInactive && { background: 'var(--color-gradient-primary-active)' })
      }}
      {...props}
    >
      {loading ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <MiniSpinner center />
        </span>
      ) : (
        <span className="whitespace-nowrap flex items-center">
          {icon && <span className="inline-flex items-center mr-1">{icon}</span>}
          {label || children}
        </span>
      )}
      {/* Invisible text for width preservation when loading */}
      {loading && (
        <span className="invisible select-none whitespace-nowrap flex items-center">
          {icon && <span className="inline-flex items-center mr-1">{icon}</span>}
          {label || children}
        </span>
      )}
    </button>
  )
}

export default Button
