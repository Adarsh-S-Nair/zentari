import Pill from '../ui/Pill'

function TradeBreakdown({ trades }) {
  return (
    <div className="w-full text-[12px]">
      {/* Header Row */}
      <div
        className="grid grid-cols-[1fr_1fr_1fr_1fr_1.5fr_0.8fr] font-medium text-gray-500 mb-[6px]"
        style={{
          borderBottom: '2px solid #e5e7eb',
          paddingBottom: '4px'
        }}
      >
        <div>Ticker</div>
        <div>Action</div>
        <div className="text-right">Price</div>
        <div className="text-right">Shares</div>
        <div className="text-right">Amount</div>
        <div className="flex justify-end pr-[12px]">Return</div>
      </div>

      {/* Trade Rows */}
      {trades.map((trade, idx) => {
        const {
          ticker,
          action,
          price,
          shares,
          amount,
          return_pct
        } = trade

        const isPositive = return_pct > 0
        const isZero = return_pct === 0
        const isBuy = action.toLowerCase() === 'buy'

        const amountFormatted = `$${amount.toLocaleString('en-US', {
          minimumFractionDigits: 2
        })}`

        return (
          <div
            key={idx}
            className="grid grid-cols-[1fr_1fr_1fr_1fr_1.5fr_0.8fr] text-gray-700 py-[6px]"
            style={{
              borderTop: idx !== 0 ? '1px solid #e5e7eb' : 'none'
            }}
          >
            <div>{ticker}</div>

            <div
              style={{
                color: isBuy ? '#16a34a' : '#dc2626',
                fontWeight: 600
              }}
            >
              {action.toUpperCase()}
            </div>

            <div className="text-right">${price.toFixed(2)}</div>
            <div className="text-right">{shares}</div>
            <div className="text-right">{amountFormatted}</div>

            <div className="flex justify-end items-center">
              {isBuy ? (
                <div
                  style={{
                    backgroundColor: '#f3f4f6',
                    width: '60px',
                    height: '5px',
                    borderRadius: '9999px'
                  }}
                ></div>
              ) : (
                <Pill
                  value={return_pct}
                  isPositive={isPositive}
                  isZero={isZero}
                />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default TradeBreakdown
