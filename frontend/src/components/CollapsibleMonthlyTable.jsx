import MonthlyRow from './MonthlyRow'

function CollapsibleMonthlyTable({ monthlyReturns, isMobile }) {
  return (
    <div
      className="w-full max-w-[700px] h-full bg-white rounded-[8px] flex flex-col"
      style={{
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        border: '1px solid #e5e7eb',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      <div className="px-[20px]">
        {/* Sticky Header */}
        <div
          className="sticky top-0 z-10 bg-white"
          style={{
            borderBottom: '1px solid #e5e7eb',
            padding: '10px 0',
            boxSizing: 'border-box'
          }}
        >
          <div
            className={`grid text-[12px] font-medium text-gray-500 ${
              isMobile
                ? 'grid-cols-[1fr_100px_64px_32px]'
                : 'grid-cols-[1fr_100px_68px_20px_100px_64px_32px]'
            }`}
          >
            <div className="text-left">Date</div>
            <div className="text-right">Portfolio</div>
            <div className="text-center">%</div>
            {!isMobile && <div />} {/* spacer */}
            {!isMobile && <div className="text-right">Benchmark</div>}
            {!isMobile && <div className="text-center">%</div>}
            <div></div> {/* chevron column */}
          </div>
        </div>
      </div>

      {/* Scrollable Rows */}
      <div
        className="px-[20px]"
        style={{
          overflowY: 'scroll',
          overflowX: 'hidden',
          flexGrow: 1,
          boxSizing: 'border-box',
          paddingRight: '0px',
          marginRight: '0px'
        }}
      >
        <div className="flex flex-col">
          {[...monthlyReturns].reverse().map((entry) => (
            <MonthlyRow
              key={entry.date}
              date={entry.date}
              value={entry.portfolio_value}
              benchmark={entry.benchmark_value}
              portfolioChange={entry.portfolio_return_pct}
              benchmarkChange={entry.benchmark_return_pct}
              trades={entry.orders}
              isMobile={isMobile}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default CollapsibleMonthlyTable
