import { useState, useRef, useEffect } from 'react'
import Pill from './Pill'

function MonthlyRow({ date, value, benchmark, portfolioChange, benchmarkChange }) {
  const [expanded, setExpanded] = useState(false)
  const [height, setHeight] = useState(0)
  const contentRef = useRef(null)

  const formatCurrency = val =>
    `$${val.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(date + 'T00:00:00Z'))

  useEffect(() => {
    if (expanded && contentRef.current) {
      setHeight(contentRef.current.scrollHeight)
    } else {
      setHeight(0)
    }
  }, [expanded])

  return (
    <div
      onClick={() => setExpanded(prev => !prev)}
      style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        cursor: 'pointer'
      }}
    >
      {/* ➤ Row Summary */}
      <div className="w-full py-[10px] pr-[12px] pl-[6px]">
        <div className="grid grid-cols-3 text-[13px] text-gray-700 items-center">
          <div className="text-left">{formattedDate}</div>

          <div className="flex justify-end items-center">
            {formatCurrency(value)}
            <Pill value={portfolioChange} isPositive={portfolioChange > 0} isZero={portfolioChange === 0} />
          </div>

          <div className="flex justify-end items-center">
            {formatCurrency(benchmark)}
            <Pill value={benchmarkChange} isPositive={benchmarkChange > 0} isZero={benchmarkChange === 0} />
          </div>
        </div>
      </div>

      {/* ➤ Expandable Section with animation */}
      <div
        style={{
          height: `${height}px`,
          transition: 'height 0.3s ease',
          overflow: 'hidden'
        }}
      >
        <div
          ref={contentRef}
          className="text-[12px] text-gray-600 bg-gray-50 rounded-[4px] px-[16px] py-[10px]"
        >
          Ticker breakdown and more details coming soon.
        </div>
      </div>
    </div>
  )
}

export default MonthlyRow
