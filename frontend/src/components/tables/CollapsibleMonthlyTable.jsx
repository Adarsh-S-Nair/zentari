import React from 'react'
import { CollapsibleTable } from './index'
import { formatCurrency, formatDate, formatShares } from '../../utils/formatters'

function CollapsibleMonthlyTable({ portfolioData, isMobile }) {
  const columns = {
    gridTemplateColumns: '90px 70px 70px 70px 70px 70px 70px 70px 48px',
    minWidth: '648px',
    headers: [
      { label: 'Date', className: 'text-left' },
      { label: 'Balance', className: 'text-right' },
      { label: 'Cash', className: 'text-right' },
      { label: 'Equity', className: 'text-right' },
      { label: 'P&L', className: 'text-right' },
      { label: 'P&L %', className: 'text-right' },
      { label: 'Shares', className: 'text-right' },
      { label: 'Trades', className: 'text-right' },
      { label: '', className: 'text-center' }
    ]
  }

  const renderRow = (item, isExpanded, isMobile) => [
    <div key="date" className="text-left font-medium">
      {formatDate(item.date)}
    </div>,
    <div key="balance" className="text-right">
      {formatCurrency(item.balance)}
    </div>,
    <div key="cash" className="text-right">
      {formatCurrency(item.cash)}
    </div>,
    <div key="equity" className="text-right">
      {formatCurrency(item.equity)}
    </div>,
    <div key="pnl" className="text-right">
      {formatCurrency(item.pnl)}
    </div>,
    <div key="pnlPct" className="text-right">
      {item.pnl_pct ? `${item.pnl_pct.toFixed(2)}%` : '-'}
    </div>,
    <div key="shares" className="text-right">
      {formatShares(item.total_shares)}
    </div>,
    <div key="trades" className="text-right">
      {item.trades_count || 0}
    </div>,
    <div key="expand" className="flex justify-center items-center">
      <div
        style={{
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
          color: '#6b7280'
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6,9 12,15 18,9"></polyline>
        </svg>
      </div>
    </div>
  ]

  const renderExpandedContent = (item) => {
    if (!item.holdings || item.holdings.length === 0) {
      return <div className="text-gray-500 italic">No holdings for this period</div>
    }

    return (
      <div className="space-y-2">
        <div className="font-medium text-gray-700 mb-2">Holdings:</div>
        {item.holdings.map((holding, index) => (
          <div key={index} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-b-0">
            <span className="font-medium">{holding.ticker}</span>
            <div className="flex gap-4 text-sm">
              <span>{formatShares(holding.quantity)}</span>
              <span>{formatCurrency(holding.avg_price)}</span>
              <span>{formatCurrency(holding.market_value)}</span>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <CollapsibleTable
      data={portfolioData}
      columns={columns}
      renderRow={renderRow}
      renderExpandedContent={renderExpandedContent}
      isMobile={isMobile}
      emptyMessage="No portfolio data found"
    />
  )
}

export default CollapsibleMonthlyTable
