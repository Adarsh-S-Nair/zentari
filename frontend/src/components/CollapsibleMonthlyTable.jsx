import MonthlyRow from './MonthlyRow'

function CollapsibleMonthlyTable({ monthlyReturns }) {
  console.log(monthlyReturns)
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
          <div className="grid grid-cols-[1fr_1fr_1fr_32px] text-[12px] font-medium text-gray-500 pr-[12px]">
            <div className="text-left">Date</div>
            <div className="text-right">Portfolio Value</div>
            <div className="text-right">Benchmark Value</div>
            <div></div>
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
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default CollapsibleMonthlyTable
