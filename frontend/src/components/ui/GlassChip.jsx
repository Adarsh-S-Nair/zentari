import React from 'react'

export default function GlassChip({ label, color = '#94a3b8', className = '', style = {} }) {
  const base = {
    background: 'rgba(148,163,184,0.08)',
    border: '1px solid rgba(148,163,184,0.25)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.15)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)'
  }
  const dot = {
    width: 6, height: 6, borderRadius: 9999, background: color,
    boxShadow: `0 0 0 2px rgba(148,163,184,0.18)`
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] ${className}`} style={{ ...base, ...style }}>
      <span style={dot} />
      <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
    </span>
  )
}


