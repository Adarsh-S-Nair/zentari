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
function MiniSpinner() {
  return (
    <div
      className="mini-spinner"
      style={{
        width: '8px',
        height: '8px',
        border: '1px solid var(--color-text-white)',
        borderTop: '1px solid transparent',
        borderRadius: '50%',
        marginRight: '4px',
        animation: 'spin 0.6s linear infinite'
      }}
    />
  )
}

function Button({
  label,
  children,
  onClick,
  color = 'var(--color-primary)',
  width = '100%',
  loading = false,
  disabled = false,
  darkText = false,
  style = {},
  type = 'button'
}) {
  const [isHovering, setIsHovering] = useState(false)

  const isInactive = disabled || loading

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

  const buttonStyle = {
    width,
    backgroundColor: isInactive ? inactiveBg : isHovering ? hoverBg : darkerBg,
    color: isInactive ? text.inactive : isHovering ? text.hover : text.base,
    padding: '6px 12px',
    border: `1px solid ${baseColor}`,
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    cursor: isInactive ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    boxShadow: '0 1px 3px var(--color-shadow-medium)',
    transition: 'background-color 0.2s, color 0.2s',
    fontFamily: '"Inter", system-ui, sans-serif',
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
    textRendering: 'optimizeLegibility',
    ...style
  }

  return (
    <>
      <button
        type={type}
        onClick={isInactive ? null : onClick}
        disabled={isInactive}
        style={buttonStyle}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {loading && <MiniSpinner />}
        {label || children}
      </button>

      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </>
  )
}

export default Button
