import React from 'react'

export default function Badge({ label, color = '#94a3b8', className = '', style = {} }) {
  const dot = { width: 6, height: 6, borderRadius: 9999, background: color }
  return (
    <span className={`inline-flex items-center gap-1.5 px-0 py-0 text-[10px] ${className}`} style={{ ...style }}>
      <span style={dot} />
      <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
    </span>
  )
}


