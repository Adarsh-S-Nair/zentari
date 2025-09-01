import React from 'react'

export default function GlassMeter({ valuePct = 0, color = '#6b8afd', height = 6, className = '', style = {} }) {
  const track = {
    height,
    borderRadius: 9999,
    background: 'linear-gradient(180deg, rgba(148,163,184,0.22), rgba(148,163,184,0.08))',
    border: '1px solid rgba(148,163,184,0.28)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 2px 8px rgba(0,0,0,0.06)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)'
  }
  const fill = {
    width: `${Math.min(100, Math.max(0, valuePct))}%`,
    height: '100%',
    borderRadius: 9999,
    background: `linear-gradient(90deg, ${color}, ${color})`,
    opacity: 0.55
  }
  return (
    <div className={className} style={{ ...track, ...style }}>
      <div style={fill} />
    </div>
  )
}


