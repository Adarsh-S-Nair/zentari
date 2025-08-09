import React, { useMemo } from 'react'
import Pill from './Pill'

/*
Props:
- label: string
- value: string | number (already formatted outside)
- subtitle: string (e.g., 'vs last period' or 'Avg / day')
- deltaPercent: number | null
- icon: ReactNode (optional small icon on the right)
- className: string (optional)
- compact: boolean (optional) use tighter spacing
- sparklineData: number[] (optional) small background trend
- sparklineColor: string (optional) CSS color for sparkline
*/
export default function KPIStatCard({ label, value, subtitle, deltaPercent = null, icon = null, className = '', compact = false, sparklineData, sparklineColor = 'var(--color-primary)' }) {
  const isPositive = typeof deltaPercent === 'number' ? deltaPercent >= 0 : false
  const showDelta = typeof deltaPercent === 'number' && isFinite(deltaPercent)

  const padding = compact ? 'p-4' : 'p-5'

  // Prepare sparkline path
  const { pathD, viewBox } = useMemo(() => {
    if (!sparklineData || sparklineData.length === 0) return { pathD: null, viewBox: '0 0 100 40' }
    const w = 100, h = 40, padX = 0, padY = 4
    const min = Math.min(...sparklineData)
    const max = Math.max(...sparklineData)
    const range = Math.max(1, max - min)
    const stepX = sparklineData.length > 1 ? (w - padX * 2) / (sparklineData.length - 1) : w
    const points = sparklineData.map((v, i) => {
      const x = padX + i * stepX
      const y = h - padY - ((v - min) / range) * (h - padY * 2)
      return [x, y]
    })
    const d = points.map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`)).join(' ')
    return { pathD: d, viewBox: `0 0 ${w} ${h}` }
  }, [sparklineData])

  return (
    <div
      className={`relative rounded-xl border ${className}`}
      style={{
        background: 'var(--color-bg-secondary)',
        borderColor: 'var(--color-border-primary)',
        boxShadow: '0 1px 3px 0 var(--color-shadow-light)'
      }}
    >
      {/* Subtle background sparkline */}
      {pathD && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.18 }}>
          <svg viewBox={viewBox} preserveAspectRatio="none" width="100%" height="100%">
            {/* Soft area */}
            {(() => {
              if (!sparklineData || sparklineData.length === 0) return null
              // Build area from path back to baseline
              const w = 100, h = 40
              const areaD = `${pathD} L 100 ${h} L 0 ${h} Z`
              return <path d={areaD} fill={sparklineColor} opacity="0.12" />
            })()}
            {/* Line */}
            <path d={pathD} fill="none" stroke={sparklineColor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </div>
      )}

      <div className={`${padding} pb-2 flex items-start justify-between`}>
        <div className="flex flex-col min-w-0">
          <div className="text-[11px] font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
          <div className="text-[19px] font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
            {value}
          </div>
        </div>
        {icon && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center border"
            style={{ background: 'var(--color-bg-primary)', borderColor: 'var(--color-border-primary)' }}
          >
            {icon}
          </div>
        )}
      </div>
      <div className={`${padding} pt-0 pb-3 flex items-center gap-2`}>
        <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{subtitle}</div>
        {showDelta && (
          <Pill value={Math.abs(deltaPercent)} isPositive={isPositive} />
        )}
      </div>
    </div>
  )
} 