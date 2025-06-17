import { useState, useRef, useEffect } from 'react'
import { FiChevronDown } from 'react-icons/fi'
import Pill from './Pill'
import TradeBreakdown from './TradeBreakdown'

function MonthlyRow({ date, value, benchmark, portfolioChange, benchmarkChange, trades, isMobile }) {
  const [expanded, setExpanded] = useState(false)
  const [height, setHeight] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const contentRef = useRef(null)

  const formatCurrency = val =>
    `$${val.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
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

  const safePortfolioChange = portfolioChange ?? 0
  const safeBenchmarkChange = benchmarkChange ?? 0
  const isPortfolioZero = portfolioChange === null || portfolioChange === 0
  const isBenchmarkZero = benchmarkChange === null || benchmarkChange === 0

  return (
    <div
      onClick={() => setExpanded(prev => !prev)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: isHovered ? '#fdfdfd' : 'white',
        borderBottom: '1px solid #e5e7eb',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
        width: '100%'
      }}
    >
      <div className="py-[10px] pr-[16px] pl-[6px]">
        <div className={`grid ${isMobile ? 'grid-cols-[1fr_1fr_32px]' : 'grid-cols-[1fr_1fr_1fr_32px]'} text-[13px] text-gray-700 items-center`}>
          <div className="text-left">{formattedDate}</div>

          <div className="flex justify-end items-center gap-[6px]">
            {formatCurrency(value)}
            <Pill
              value={safePortfolioChange}
              isPositive={safePortfolioChange > 0}
              isZero={isPortfolioZero}
            />
          </div>

          {!isMobile && (
            <div className="flex justify-end items-center gap-[6px]">
              {formatCurrency(benchmark)}
              <Pill
                value={safeBenchmarkChange}
                isPositive={safeBenchmarkChange > 0}
                isZero={isBenchmarkZero}
              />
            </div>
          )}

          <div className="flex justify-end">
            <FiChevronDown
              style={{ color: '#9ca3af' }}
              className={`transition-transform duration-300 ${expanded ? 'rotate-180' : 'rotate-0'}`}
              size={18}
            />
          </div>
        </div>
      </div>

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
          <TradeBreakdown trades={trades} />
        </div>
      </div>
    </div>
  )
}

export default MonthlyRow
