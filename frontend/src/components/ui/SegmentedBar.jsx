import React, { useRef, useState } from 'react'

function hexToRgba(hex, alpha = 1) {
  const h = (hex || '').replace('#', '')
  if (!h || (h.length !== 6 && h.length !== 3)) return `rgba(0,0,0,${alpha})`
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const r = parseInt(full.substring(0, 2), 16)
  const g = parseInt(full.substring(2, 4), 16)
  const b = parseInt(full.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default function SegmentedBar({ items = [], total = 0, height = 16, gap = 3, radius = 6, onItemClick }) {
  const safeTotal = total > 0 ? total : items.reduce((s, i) => s + (i.value || 0), 0)
  const count = items.length
  const containerRef = useRef(null)
  const [tt, setTt] = useState({ visible: false, x: 0, label: '', value: 0, pct: 0, color: '#999' })

  const handleLeave = () => setTt((p) => ({ ...p, visible: false }))

  return (
    <div ref={containerRef} className="relative w-full rounded-[10px]" style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-primary)', padding: 2 }} onMouseLeave={handleLeave}>
      {tt.visible && (
        <div style={{ position: 'absolute', left: tt.x, top: -36, background: 'var(--color-bg-primary)', border: '1px solid var(--color-border-primary)', borderRadius: 10, padding: '8px 10px', fontSize: 11, boxShadow: '0 6px 14px rgba(0,0,0,0.14)', pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 5 }}>
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: tt.color, marginRight: 8, verticalAlign: 'middle' }} />
          <span style={{ color: 'var(--color-text-secondary)' }}>{tt.label}</span>
          <span style={{ marginLeft: 8, color: 'var(--color-text-primary)', fontWeight: 600 }}>{Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(tt.value)}</span>
          <span style={{ marginLeft: 6, color: 'var(--color-text-muted)' }}>({((tt.value / safeTotal) * 100 || 0).toFixed(1)}%)</span>
        </div>
      )}
      <div className="flex items-stretch w-full" style={{ gap: `${gap}px`, height }}>
        {items.map((seg, idx) => {
          const widthPct = safeTotal ? (seg.value / safeTotal) * 100 : 0
          const isFirst = idx === 0
          const isLast = idx === count - 1
          const br = `${isFirst ? radius : 0}px ${isLast ? radius : 0}px ${isLast ? radius : 0}px ${isFirst ? radius : 0}px`
          const onMove = (e) => {
            const rect = containerRef.current?.getBoundingClientRect()
            const x = Math.min(Math.max(10, e.clientX - (rect?.left || 0)), (rect?.width || 0) - 10)
            setTt({ visible: true, x, label: seg.label || 'Item', value: seg.value || 0, pct: widthPct, color: seg.color || '#999' })
          }
          const isClickable = typeof onItemClick === 'function' && (seg?.id != null)
          return (
            <div
              key={idx}
              onMouseEnter={onMove}
              onMouseMove={onMove}
              onMouseLeave={handleLeave}
              onClick={isClickable ? () => onItemClick(seg) : undefined}
              className="transition-all"
              style={{
                width: `${widthPct}%`,
                background: seg.background || seg.color,
                height: '100%',
                borderRadius: br,
                cursor: isClickable ? 'pointer' : 'default',
                outline: '1px solid var(--color-border-primary)',
                filter: tt.visible && tt.label === (seg.label || 'Item') ? 'brightness(1.06) saturate(1.05)' : 'none',
                boxShadow: tt.visible && tt.label === (seg.label || 'Item') ? `0 0 0 3px ${hexToRgba(seg.color || '#000000', 0.25)}, 0 2px 8px rgba(0,0,0,0.12)` : 'none'
              }}
            />
          )
        })}
      </div>
    </div>
  )
}




