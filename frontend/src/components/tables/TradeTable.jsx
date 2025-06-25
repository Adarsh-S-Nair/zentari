import React from 'react'
import { Pill } from '../ui'
import { formatCurrency, formatDate, formatShares } from '../../utils/formatters'
import { Table } from './index'

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

  const columns = [
    {
      key: 'ticker',
      header: 'Symbol',
      width: '50px',
      align: 'text-left',
      headerAlign: 'text-left',
      type: 'text'
    },
    {
      key: 'position_type',
      header: 'Position',
      width: '70px',
      align: 'text-center',
      headerAlign: 'text-center',
      type: 'pill',
      pillType: 'position',
      render: (value, row) => {
        const isOpen = row.status === 'open'
        return (
          <div className="flex justify-center items-center gap-1">
            <Pill type="position" value={value} />
            {isOpen && (
              <Pill 
                type="status" 
                customText="Open"
                customBgColor="var(--color-status-open-bg)"
                customTextColor="var(--color-status-open)"
              />
            )}
          </div>
        )
      }
    },
    {
      key: 'entry_order.date',
      header: 'Entry Date',
      width: '90px',
      align: 'text-right',
      headerAlign: 'text-right',
      type: 'date'
    },
    {
      key: 'entry_order.price',
      header: 'Entry Price',
      width: '70px',
      align: 'text-right',
      headerAlign: 'text-right',
      type: 'currency'
    },
    {
      key: 'entry_order.quantity',
      header: 'Shares',
      width: '70px',
      align: 'text-right',
      headerAlign: 'text-right',
      type: 'shares'
    },
    {
      key: 'exit_order.date',
      header: 'Exit Date',
      width: '90px',
      align: 'text-right',
      headerAlign: 'text-right',
      type: 'date'
    },
    {
      key: 'exit_order.price',
      header: 'Exit Price',
      width: '70px',
      align: 'text-right',
      headerAlign: 'text-right',
      type: 'currency'
    },
    {
      key: 'pnl',
      header: 'P&L',
      width: '78px',
      align: 'text-right',
      headerAlign: 'text-right',
      type: 'currency'
    },
    {
      key: 'pnl_pct',
      header: '%',
      width: '60px',
      align: 'text-center',
      headerAlign: 'text-center',
      type: 'pill-with-condition'
    }
  ]

  // Transform data to flatten nested objects for easier access
  const transformedData = sortedTrades.map(trade => ({
    ...trade,
    'entry_order.date': trade.entry_order?.date,
    'entry_order.price': trade.entry_order?.price,
    'entry_order.quantity': trade.entry_order?.quantity,
    'exit_order.date': trade.exit_order?.date,
    'exit_order.price': trade.exit_order?.price,
    'pnl': trade.status === 'open' ? trade.entry_order?.amount * 0.1 : trade.pnl, // Placeholder for open trades
    'pnl_pct': trade.status === 'open' ? 10 : trade.pnl_pct // Placeholder for open trades
  }))

  return (
    <Table
      data={transformedData}
      columns={columns}
      isMobile={isMobile}
      emptyMessage="No trades found"
      minWidth="648px"
    />
  )
}

export default TradeTable 