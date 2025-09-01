import React, { useMemo } from 'react'
import Carousel from './Carousel'
import Badge from './Badge'
import Meter from './Meter'
import { formatCurrency, formatPercentage } from '../../utils/formatters'
import { getIndustryColor } from '../../utils/sectorColors'

function hexToRgba(hex, alpha = 1) {
  const h = String(hex || '').replace('#','')
  if (!h || (h.length !== 6 && h.length !== 3)) return `rgba(0,0,0,${alpha})`
  const full = h.length === 3 ? h.split('').map(c=>c+c).join('') : h
  const r = parseInt(full.substring(0,2),16)
  const g = parseInt(full.substring(2,4),16)
  const b = parseInt(full.substring(4,6),16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
      <div className="text-[12px] font-medium" style={{ color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  )
}

function PositionCard({ position, index = 0, snapAlign = 'center', totalMV = 0 }) {
  const p = position || {}
  const qty = Math.abs(Number(p.quantity || 0))
  const avg = Number(p.avg_entry_price || 0)
  const mv = avg * qty
  const invested = avg * qty
  const delta = mv - invested
  const pct = invested > 0 ? (delta / invested) * 100 : 0
  const sector = String(p.sector || 'Other')
  const sectorColor = getIndustryColor(sector)
  const weight = totalMV > 0 ? (mv / totalMV) * 100 : 0

  return (
    <div className={`min-w-[280px] relative rounded-xl p-4 transition-colors`} style={{ scrollSnapAlign: snapAlign, border: '1px solid var(--color-border-primary)', background: 'var(--color-bg-secondary)', boxShadow: '0 10px 22px var(--color-shadow-light)' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {p.logo_url ? (
            <img src={p.logo_url} alt={p.ticker} className="w-8 h-8 rounded-full object-cover flex-shrink-0" style={{ border: '1px solid var(--color-border-primary)' }} />
          ) : (
            <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border-primary)' }} />
          )}
          <div className="min-w-0">
            <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{p.company_name || (p.ticker || '').toUpperCase()}</div>
            <div className="flex items-center gap-2 mt-0.5 min-w-0">
              <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{(p.ticker || '').toUpperCase()}</div>
              <Badge label={sector} color={sectorColor} />
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(mv)}</div>
          <div className="text-[10px] flex items-center gap-1 justify-end" style={{ color: delta >= 0 ? 'var(--color-success)' : 'var(--color-danger)', fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ fontSize: 10, lineHeight: '10px' }}>{delta >= 0 ? '▲' : '▼'}</span>
            {formatPercentage(pct)}
          </div>
        </div>
      </div>
      <Meter valuePct={weight} color={sectorColor} className="mt-3" />
      <div className="mt-3 flex items-start justify-between gap-6">
        <Stat label="Quantity" value={qty} />
        <Stat label="Avg Price" value={formatCurrency(avg)} />
        <Stat label="Weight" value={`${(weight || 0).toFixed(1)}%`} />
      </div>
      <div className="mt-2 flex items-start justify-between gap-6">
        <Stat label="Cost Basis" value={formatCurrency(invested)} />
        <Stat label="Market Value" value={formatCurrency(mv)} />
        <Stat label="P/L" value={`${delta >= 0 ? '+' : ''}${formatCurrency(delta)}`} />
      </div>
    </div>
  )
}

export default function PositionCardsCarousel({ positions = [], className = '', style = {}, onCardClick }) {
  const sorted = useMemo(() => {
    const arr = (positions || []).slice(0, 48)
    return arr.sort((a, b) => {
      const aMv = Math.abs(Number(a.quantity || 0)) * Number(a.avg_entry_price || 0)
      const bMv = Math.abs(Number(b.quantity || 0)) * Number(b.avg_entry_price || 0)
      return bMv - aMv
    })
  }, [positions])
  const totalMV = useMemo(() => (sorted || []).reduce((s, p) => s + Math.abs(Number(p.quantity || 0)) * Number(p.avg_entry_price || 0), 0), [sorted])

  return (
    <div className={`relative ${className}`} style={style}>
      <Carousel
        items={sorted}
        itemWidth={280}
        gap={12}
        getKey={(pos, i) => pos?.id || `${pos?.ticker || 'pos'}-${i}`}
        renderItem={({ item, index, snapAlign }) => (
          <PositionCard position={item} index={index} snapAlign={snapAlign} totalMV={totalMV} />
        )}
        onItemClick={onCardClick ? (e, pos) => onCardClick(e, pos) : undefined}
        showPagination={true}
      />
    </div>
  )
}


