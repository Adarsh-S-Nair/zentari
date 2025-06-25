import React from 'react'
import { Pill } from '../ui'
import { formatCurrency, formatDate, formatShares } from '../../utils/formatters'

function OrdersTable({ tradeHistoryByDate, isMobile }) {
  // Convert trade_history_by_date to flat array of orders
  const orders = Object.entries(tradeHistoryByDate || {})
    .flatMap(([date, dateOrders]) => 
      dateOrders.map(order => ({
        ...order,
        date
      }))
    )
    .sort((a, b) => new Date(b.date) - new Date(a.date)) // Sort descending

  if (!orders || orders.length === 0) {
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
        No orders found
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
            <div
              className="grid text-[12px] font-medium text-gray-500"
              style={{
                gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr',
                minWidth: '648px'
              }}
            >
              <div className="text-left">Date</div>
              <div className="text-center">Symbol</div>
              <div className="text-center">Type</div>
              <div className="text-right">Price</div>
              <div className="text-right">Quantity</div>
              <div className="text-right">Amount</div>
            </div>
          </div>

          {/* Rows */}
          {orders.map((order, index) => (
            <div
              key={`${order.date}-${order.ticker}-${index}`}
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                borderBottom: '1px solid var(--color-border-primary)',
                transition: 'background-color 0.2s ease',
                width: '100%'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-bg-primary)'
              }}
            >
              <div className="py-[12px]">
                <div
                  className="grid text-[13px] text-gray-700 items-center"
                  style={{
                    gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr'
                  }}
                >
                  <div className="text-left font-medium">
                    {formatDate(order.date)}
                  </div>
                  
                  <div className="text-center font-medium">
                    {order.ticker}
                  </div>
                  
                  <div className="flex justify-center items-center">
                    <Pill 
                      type="action" 
                      value={order.action} 
                    />
                  </div>
                  
                  <div className="text-right">
                    {formatCurrency(order.price)}
                  </div>
                  
                  <div className="text-right">
                    {formatShares(order.shares)}
                  </div>
                  
                  <div className="text-right">
                    {formatCurrency(order.amount)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default OrdersTable 