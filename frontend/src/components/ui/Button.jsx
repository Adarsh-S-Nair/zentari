import React, { useState } from 'react'

// Blend a hex color with gray to make it duller and darker
function mixWithGray(hex, gray = 'var(--color-gray-600)', ratio = 0.7) {
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
        border: '1.5px solid var(--color-text-white)',
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

  const baseBg = color
  const hoverBg = mixWithGray(color, 'var(--color-gray-800)', 0.3) // darker hover
  const inactiveBg = mixWithGray(color, 'var(--color-gray-600)', 0.5) // duller inactive

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
    boxShadow: '0 2px 5px var(--color-shadow-medium)',
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
