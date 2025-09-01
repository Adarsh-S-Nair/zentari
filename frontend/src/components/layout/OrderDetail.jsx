import React from 'react'
import { formatCurrency, formatDate } from '../../utils/formatters'

function DetailRow({ label, children, isFirst = false }) {
  return (
    <div className={`flex justify-between items-center py-4 px-4 text-sm ${!isFirst ? 'border-top' : ''}`} style={{ borderColor: 'var(--color-border-primary)' }}>
      <span className="text-[14px]" style={{ color: 'var(--color-text-primary)' }}>{label}</span>
      {children}
    </div>
  )
}

export default function OrderDetail({ order, onBack, inBottomSheet = false }) {
  if (!order) {
    return (
      <div className="w-full flex items-center justify-center min-h-[300px]" style={{ color: 'var(--color-text-muted)' }}>
        Order not found.
      </div>
    )
  }

  const isBuy = String(order.side || '').toLowerCase() === 'buy'
  const qty = Number(order.filled_quantity ?? order.quantity ?? 0)
  const px = Number(order.avg_fill_price ?? order.limit_price ?? 0)
  const amt = Math.abs(qty * px)

  return (
    <div className="w-full h-full relative overflow-hidden rounded-2xl" style={{ background: 'var(--color-bg-primary)' }}>
      <main className="w-full max-w-[700px] mx-auto h-full flex flex-col">
        <div className="flex flex-col gap-8 pt-8 pb-6 flex-1 overflow-y-auto">
          {/* Header with logo, ticker, and meta */}
          <div className="flex items-center justify-between gap-3 px-3">
            <div className="flex items-center gap-3 min-w-0">
              {order.logo_url ? (
                <img src={order.logo_url} alt={order.ticker} className="w-10 h-10 rounded-full object-cover flex-shrink-0" style={{ border: '1px solid var(--color-border-primary)' }} />
              ) : (
                <div className="w-10 h-10 rounded-full flex-shrink-0" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)' }} />
              )}
              <div className="min-w-0">
                <div className="text-[16px] font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{(order.ticker || '').toUpperCase()}</div>
                <div className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>{formatDate(order.filled_at || order.submitted_at)}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[18px] font-semibold" style={{ color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(amt)}</div>
              <div className="text-[12px]" style={{ color: isBuy ? 'var(--color-success)' : 'var(--color-danger)', fontVariantNumeric: 'tabular-nums' }}>{isBuy ? '+' : '-'}{qty} shares</div>
            </div>
          </div>

          <div className="text-sm flex flex-col px-2 space-y-1">
            <DetailRow label="Status" isFirst>
              <span className="text-[12px] px-3 py-1.5 rounded-full" style={{
                color: 'var(--color-primary)',
                background: 'linear-gradient(135deg, var(--color-primary-bg) 0%, rgba(59, 130, 246, 0.10) 100%)',
                border: '1px solid rgba(59, 130, 246, 0.12)',
                boxShadow: '0 1px 2px rgba(59, 130, 246, 0.07)'
              }}>{(order.status || '').toString()}</span>
            </DetailRow>
            <DetailRow label="Type"><span className="text-[14px]" style={{ color: 'var(--color-text-secondary)' }}>{(order.type || '').toString()}</span></DetailRow>
            <DetailRow label="Side"><span className="text-[14px]" style={{ color: isBuy ? 'var(--color-success)' : 'var(--color-danger)' }}>{isBuy ? 'Buy' : 'Sell'}</span></DetailRow>
            <DetailRow label="Ticker"><span className="text-[14px]" style={{ color: 'var(--color-text-secondary)' }}>{(order.ticker || '').toUpperCase()}</span></DetailRow>
            <DetailRow label="Quantity"><span className="text-[14px]" style={{ color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{qty}</span></DetailRow>
            <DetailRow label="Price"><span className="text-[14px]" style={{ color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(px)}</span></DetailRow>
            <DetailRow label="Notional"><span className="text-[14px]" style={{ color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(amt)}</span></DetailRow>
            {order.limit_price != null && (
              <DetailRow label="Limit Price"><span className="text-[14px]" style={{ color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(Number(order.limit_price))}</span></DetailRow>
            )}
            {order.stop_price != null && (
              <DetailRow label="Stop Price"><span className="text-[14px]" style={{ color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(Number(order.stop_price))}</span></DetailRow>
            )}
            <DetailRow label="Submitted"><span className="text-[14px]" style={{ color: 'var(--color-text-secondary)' }}>{formatDate(order.submitted_at)}</span></DetailRow>
            {order.filled_at && (<DetailRow label="Filled"><span className="text-[14px]" style={{ color: 'var(--color-text-secondary)' }}>{formatDate(order.filled_at)}</span></DetailRow>)}
            {order.rationale && (
              <div className="border-top py-4 px-4 text-[14px]" style={{ borderColor: 'var(--color-border-primary)' }}>
                <div className="text-[14px] mb-1" style={{ color: 'var(--color-text-primary)' }}>Rationale</div>
                <div className="text-[13px] leading-5" style={{ color: 'var(--color-text-secondary)' }}>{order.rationale}</div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}


