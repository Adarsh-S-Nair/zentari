import React from 'react'

export default function Meter({ valuePct = 0, color = '#6b8afd', height = 6, className = '', style = {} }) {
  const track = {
    height,
    borderRadius: 9999,
    background: 'var(--color-bg-primary)',
    border: '1px solid var(--color-border-primary)'
  }
  const fill = {
    width: `${Math.min(100, Math.max(0, valuePct))}%`,
    height: '100%',
    borderRadius: 9999,
    background: color
  }
  return (
    <div className={className} style={{ ...track, ...style }}>
      <div style={fill} />
    </div>
  )
}


