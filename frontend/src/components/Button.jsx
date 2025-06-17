import React, { useState } from 'react'

// Blend a hex color with gray to make it duller and darker
function mixWithGray(hex, gray = '#4b5563', ratio = 0.7) {
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

// Smaller mini spinner
function MiniSpinner() {
  return (
    <div
      className="mini-spinner"
      style={{
        width: '10px',
        height: '10px',
        border: '1.5px solid white',
        borderTop: '1.5px solid transparent',
        borderRadius: '50%',
        marginRight: '6px',
        animation: 'spin 0.6s linear infinite'
      }}
    />
  )
}

function Button({
  label,
  children,
  onClick,
  color = '#3b82f6',
  width = '100%',
  loading = false,
  disabled = false,
  darkText = false,
  style = {},
  type = 'button'
}) {
  const [isHovering, setIsHovering] = useState(false)

  const isInactive = disabled || loading

  const baseBg = color
  const hoverBg = mixWithGray(color, '#1f2937', 0.3) // darker hover
  const inactiveBg = mixWithGray(color, '#4b5563', 0.5) // duller inactive

  const lightText = {
    base: '#ffffff',
    hover: '#f3f4f6',
    inactive: '#d1d5db'
  }

  const darkTextColors = {
    base: '#374151',     // dark gray, not black
    hover: '#1f2937',    // even darker gray
    inactive: '#6b7280'  // medium muted gray
  }

  const text = darkText ? darkTextColors : lightText

  const buttonStyle = {
    width,
    backgroundColor: isInactive ? inactiveBg : isHovering ? hoverBg : baseBg,
    color: isInactive ? text.inactive : isHovering ? text.hover : text.base,
    padding: '10px 16px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: isInactive ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.12)',
    transition: 'background-color 0.2s, color 0.2s',
    fontFamily: '"Inter", system-ui, sans-serif',
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
