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
  const ticker = (p.ticker || '').toUpperCase()
  
  // Get current price from database or fallback to average entry price
  const currentPrice = Number(p.latest_price || 0) || avg
  const hasCurrentPrice = p.latest_price !== null && p.latest_price !== undefined
  const priceAsOf = p.latest_price_as_of
  const priceSource = p.latest_price_source
  
  // Calculate market value using current price
  const mv = currentPrice * qty
  const invested = avg * qty
  const weight = totalMV > 0 ? (mv / totalMV) * 100 : 0
  const sector = String(p.sector || 'Other')
  const sectorColor = p.sector_color || getIndustryColor(sector)
  
  // Calculate gain/loss
  const gainLoss = mv - invested
  const gainLossPct = invested > 0 ? (gainLoss / invested) * 100 : 0

  return (
    <div
      className={`min-w-[280px] relative rounded-xl p-4`}
      style={{
        scrollSnapAlign: snapAlign,
        border: '1px solid var(--color-border-primary)',
        background: 'var(--color-bg-secondary)',
        boxShadow: '0 10px 22px var(--color-shadow-light)'
      }}
    >
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
          <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            {hasCurrentPrice ? (
              <div className="flex flex-col items-end gap-0.5">
                <span style={{ color: gainLoss >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)} ({gainLossPct >= 0 ? '+' : ''}{gainLossPct.toFixed(1)}%)
                </span>
                {priceAsOf && (
                  <span className="text-[9px]" style={{ color: 'var(--color-text-light)', opacity: 0.7 }}>
                    {new Date(priceAsOf).toLocaleDateString()}
                  </span>
                )}
              </div>
            ) : (
              `Weight ${(weight || 0).toFixed(1)}%`
            )}
          </div>
        </div>
      </div>
      <Meter valuePct={weight} color={sectorColor} className="mt-3" />
      <div className="mt-3 grid grid-cols-3 gap-6">
        <Stat label="Quantity" value={qty} />
        <Stat label={hasCurrentPrice ? "Current Price" : "Avg Price"} value={formatCurrency(hasCurrentPrice ? currentPrice : avg)} />
        <Stat label="Position" value={`${(weight || 0).toFixed(1)}%`} />
      </div>
    </div>
  )
}

export default function PositionCardsCarousel({ positions = [], className = '', style = {}, onCardClick }) {
  const sorted = useMemo(() => {
    const arr = (positions || []).slice(0, 48)
    return arr.sort((a, b) => {
      // Use latest_price for sorting if available, otherwise fallback to avg entry price
      const aPrice = Number(a.latest_price || 0) || Number(a.avg_entry_price || 0)
      const bPrice = Number(b.latest_price || 0) || Number(b.avg_entry_price || 0)
      const aMv = Math.abs(Number(a.quantity || 0)) * aPrice
      const bMv = Math.abs(Number(b.quantity || 0)) * bPrice
      return bMv - aMv
    })
  }, [positions])
  
  const totalMV = useMemo(() => {
    return (sorted || []).reduce((s, p) => {
      const price = Number(p.latest_price || 0) || Number(p.avg_entry_price || 0)
      return s + Math.abs(Number(p.quantity || 0)) * price
    }, 0)
  }, [sorted])

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


