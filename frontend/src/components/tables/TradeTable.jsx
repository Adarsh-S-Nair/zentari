import React from 'react'
import { Pill } from '../ui'
import { formatCurrency, formatDate, formatShares } from '../../utils/formatters'

function TradeTable({ trades, isMobile }) {
  // Sort trades: open trades first, then by exit date (most recent first)
  const sortedTrades = [...(trades || [])].sort((a, b) => {
    // Open trades come first
    if (a.status === 'open' && b.status !== 'open') return -1
    if (a.status !== 'open' && b.status === 'open') return 1
    
    // If both are open, sort by entry date (most recent first)
    if (a.status === 'open' && b.status === 'open') {
      return new Date(b.entry_order.date) - new Date(a.entry_order.date)
    }
    
    // For closed trades, sort by exit date (most recent first)
    if (a.exit_order && b.exit_order) {
      return new Date(b.exit_order.date) - new Date(a.exit_order.date)
    }
    
    // If one has exit order and other doesn't, the one with exit order comes first
    if (a.exit_order && !b.exit_order) return -1
    if (!a.exit_order && b.exit_order) return 1
    
    // Fallback to entry date
    return new Date(b.entry_order.date) - new Date(a.entry_order.date)
  })

  if (!sortedTrades || sortedTrades.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--color-text-muted)',
        fontSize: '13px',
        fontStyle: 'italic'
      }}>
        No trades found
      </div>
    )
  }

  return (
    <div
      className="w-full max-w-[700px] h-full bg-white rounded-[8px] flex flex-col"
      style={{
        boxShadow: '0 2px 8px var(--color-shadow-light)',
        border: '1px solid var(--color-border-primary)',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      {/* Scrollable Container */}
      <div
        className="px-[20px]"
        style={{
          overflowY: 'scroll',
          overflowX: 'auto',
          flexGrow: 1,
          boxSizing: 'border-box',
          position: 'relative'
        }}
      >
        <div className="flex flex-col" style={{ minWidth: '648px' }}>
          {/* Header - Inside scroll container but sticky */}
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              backgroundColor: 'var(--color-bg-primary)',
              borderBottom: '1px solid var(--color-border-primary)',
              padding: '10px 0',
              boxSizing: 'border-box'
            }}
          >
            <div className="pr-[16px] pl-[6px]">
              <div
                className="grid text-[12px] font-medium text-gray-500"
                style={{
                  gridTemplateColumns: '50px 70px 90px 70px 70px 90px 70px 70px 60px',
                  minWidth: '648px'
                }}
              >
                <div className="text-left">Symbol</div>
                <div className="text-center">Position</div>
                <div className="text-right">Entry Date</div>
                <div className="text-right">Entry Price</div>
                <div className="text-right">Shares</div>
                <div className="text-right">Exit Date</div>
                <div className="text-right">Exit Price</div>
                <div className="text-right">P&L</div>
                <div className="text-center">%</div>
              </div>
            </div>
          </div>

          {/* Rows */}
          {sortedTrades.map((trade, index) => {
            const isOpen = trade.status === 'open'
            const pnl = isOpen ? trade.entry_order.amount * 0.1 : trade.pnl // Placeholder for open trades
            const pnlPct = isOpen ? 10 : trade.pnl_pct // Placeholder for open trades
            const isPnlZero = pnl === null || pnl === 0

            return (
              <div
                key={trade.trade_id || index}
                style={{
                  backgroundColor: 'var(--color-bg-primary)',
                  borderBottom: '1px solid var(--color-border-primary)',
                  transition: 'background-color 0.2s ease',
                  width: '100%'
                }}
                onMouseEnter={(e) => {
                  // Only change background of the row container, not child elements
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'
                }}
                onMouseLeave={(e) => {
                  // Only change background of the row container, not child elements
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-primary)'
                }}
              >
                <div className="py-[12px] pr-[16px] pl-[6px]">
                  <div
                    className="grid text-[13px] text-gray-700 items-center"
                    style={{
                      gridTemplateColumns: '50px 70px 90px 70px 70px 90px 70px 70px 60px'
                    }}
                  >
                    <div className="text-left font-medium">{trade.ticker}</div>
                    
                    <div className="flex justify-center items-center gap-1">
                      <Pill 
                        type="position" 
                        value={trade.position_type} 
                      />
                      {isOpen && (
                        <Pill 
                          type="status" 
                          customText="Open"
                          customBgColor="var(--color-status-open-bg)"
                          customTextColor="var(--color-status-open)"
                        />
                      )}
                    </div>
                    
                    <div className="text-right">
                      {formatDate(trade.entry_order.date)}
                    </div>
                    
                    <div className="text-right">
                      {formatCurrency(trade.entry_order.price)}
                    </div>
                    
                    <div className="text-right">
                      {formatShares(trade.entry_order.quantity)}
                    </div>
                    
                    <div className="text-right">
                      {trade.exit_order ? formatDate(trade.exit_order.date) : '-'}
                    </div>
                    
                    <div className="text-right">
                      {trade.exit_order ? formatCurrency(trade.exit_order.price) : '-'}
                    </div>
                    
                    <div className="text-right">
                      {formatCurrency(pnl)}
                    </div>
                    
                    <div className="flex justify-center items-center">
                      <Pill value={pnlPct} isPositive={pnlPct > 0} isZero={isPnlZero} />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default TradeTable 