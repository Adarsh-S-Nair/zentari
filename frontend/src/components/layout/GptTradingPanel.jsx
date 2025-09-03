import React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Container, Pill, Input, Button, Card, ToggleTabs, Spinner, NumericInput, SegmentedBar, PositionCardsCarousel } from '../ui'
import { getIndustryColor } from '../../utils/sectorColors'
import SimpleDrawer from '../ui/SimpleDrawer'
import OrderDetail from './OrderDetail'
import { FaSearch, FaMinus, FaPlus, FaChartLine, FaChartPie, FaDollarSign, FaPiggyBank, FaCalendarAlt } from 'react-icons/fa'
import { formatCurrency, formatPercentage, formatDate } from '../../utils/formatters'
import { useFinancial } from '../../contexts/FinancialContext'
import { usePortfolio } from '../../contexts/PortfolioContext'


function SmoothLineChart({ series = [], height = 320, onHoverIndexChange }) {
  const containerRef = useRef(null)
  const [width, setWidth] = useState(700)
  const [hoverIdx, setHoverIdx] = useState(-1)
  const [labelX, setLabelX] = useState(24)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        setWidth(Math.max(320, Math.floor(e.contentRect.width)))
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const margin = { top: 56, right: 24, bottom: 24, left: 24 }
  const innerW = Math.max(0, width - margin.left - margin.right)
  const innerH = Math.max(0, height - margin.top - margin.bottom)

  const points = series.map((d, i) => ({ x: i, y: d.y, label: d.x }))
  const xCount = Math.max(1, points.length - 1)
  const minY = Math.min(...points.map(p => p.y))
  const maxY = Math.max(...points.map(p => p.y))
  const yPad = (maxY - minY) * 0.08 || 1
  const yMin = minY - yPad
  const yMax = maxY + yPad

  const xToPx = (i) => margin.left + (innerW * (i / (xCount || 1)))
  const yToPx = (v) => margin.top + innerH - ((v - yMin) / (yMax - yMin)) * innerH

  const buildPath = (pts) => {
    if (pts.length === 0) return ''
    if (pts.length === 1) {
      // For single data point, create a horizontal line spanning the full width
      const y = yToPx(pts[0].y)
      return `M ${margin.left} ${y} L ${width - margin.right} ${y}`
    }
    const path = []
    for (let i = 0; i < pts.length; i++) {
      const p0 = pts[i - 1] || pts[i]
      const p1 = pts[i]
      const p2 = pts[i + 1] || pts[i]
      const p3 = pts[i + 2] || p2
      if (i === 0) path.push(`M ${xToPx(p1.x)} ${yToPx(p1.y)}`)
      const cp1x = xToPx(p1.x + (p2.x - p0.x) / 6)
      const cp1y = yToPx(p1.y + (p2.y - p0.y) / 6)
      const cp2x = xToPx(p2.x - (p3.x - p1.x) / 6)
      const cp2y = yToPx(p2.y - (p3.y - p1.y) / 6)
      const x = xToPx(p2.x)
      const y = yToPx(p2.y)
      path.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x} ${y}`)
    }
    return path.join(' ')
  }

  const pathD = buildPath(points)
  const firstPx = points.length ? { x: xToPx(points[0].x), y: yToPx(points[0].y) } : null
  const lastPx = points.length ? { x: xToPx(points[points.length-1].x), y: yToPx(points[points.length-1].y) } : null
  const baseY = margin.top + innerH
  
  // Create area fill - for single point, create a horizontal rectangle
  const areaD = points.length ? (
    points.length === 1 
      ? `M ${margin.left} ${yToPx(points[0].y)} L ${width - margin.right} ${yToPx(points[0].y)} L ${width - margin.right} ${baseY} L ${margin.left} ${baseY} Z`
      : `${pathD} L ${lastPx.x} ${baseY} L ${firstPx.x} ${baseY} Z`
  ) : ''

  const gridLines = []
  const gridCount = 4
  for (let i = 0; i <= gridCount; i++) {
    const v = yMin + (i / gridCount) * (yMax - yMin)
    const y = yToPx(v)
    gridLines.push({ y })
  }

  const handleMove = (e) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const mouseX = e.clientX - rect.left
    let nearestIdx = 0
    let minDist = Infinity
    for (let i = 0; i < points.length; i++) {
      const px = xToPx(points[i].x)
      const d = Math.abs(px - mouseX)
      if (d < minDist) { minDist = d; nearestIdx = i }
    }
    setHoverIdx(nearestIdx)
    setLabelX(Math.min(rect.width - 24, Math.max(24, mouseX)))
    onHoverIndexChange && onHoverIndexChange(nearestIdx)
  }

  const handleLeave = () => { setHoverIdx(-1); onHoverIndexChange && onHoverIndexChange(-1) }

  const activeIdx = hoverIdx >= 0 ? hoverIdx : (points.length - 1)
  const activePoint = points[activeIdx]

  return (
    <div ref={containerRef} className="w-full relative" style={{ height }}>
      {/* Only show date label when hovering */}
      {hoverIdx >= 0 && activePoint && (
        <div
          style={{ position: 'absolute', top: 12, left: labelX, transform: 'translateX(-50%)', color: 'var(--color-text-secondary)', fontSize: 12, whiteSpace: 'nowrap', zIndex: 5 }}
        >
          {activePoint.label}
        </div>
      )}

      <svg width={width} height={height} style={{ overflow: 'visible' }} onMouseMove={handleMove} onMouseEnter={handleMove} onMouseLeave={handleLeave}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-income-hex)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--brand-income-hex)" stopOpacity="0.02" />
          </linearGradient>
          <clipPath id="chartClip">
            <rect x={margin.left} y={margin.top} width={innerW} height={innerH} />
          </clipPath>
        </defs>
        <g>
          {gridLines.map((g, idx) => (
            <line key={idx} x1={margin.left} x2={width - margin.right} y1={g.y} y2={g.y} stroke={'var(--color-border-secondary)'} strokeWidth="1" strokeDasharray={'2 6'} />
          ))}
        </g>
        {areaD && (<path d={areaD} fill="url(#areaGrad)" stroke="none" clipPath="url(#chartClip)" />)}
        {hoverIdx >= 0 && (
          <line x1={margin.left + (innerW * (activePoint.x / (xCount || 1)))} x2={margin.left + (innerW * (activePoint.x / (xCount || 1)))} y1={margin.top} y2={height - margin.bottom} stroke={'var(--color-border-primary)'} strokeWidth="1.5" />
        )}
        <path d={pathD} fill="none" stroke={'var(--brand-income-hex)'} strokeWidth="3" clipPath="url(#chartClip)" />
      </svg>
    </div>
  )
}

// (Removed legacy AiBackgroundOverlay in favor of global MatrixOverlay when LLM is running)

function PulsingCardHalo({ active, radius = 12 }) {
  if (!active) return null
  return (
    <>
      <style>{`@keyframes haloPulse { 0%{ opacity:0.35; box-shadow: 0 0 12px 0 var(--brand-income-hex);} 50%{ opacity:0.85; box-shadow: 0 0 28px 4px var(--brand-income-hex);} 100%{ opacity:0.35; box-shadow: 0 0 12px 0 var(--brand-income-hex);} }`}</style>
      <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: radius, border: '2px solid var(--brand-income-hex)', animation: 'haloPulse 1500ms ease-in-out infinite' }} />
    </>
  )
}

function RacingBorder({ active, radius = 12, thickness = 3, segmentDeg = 22, speedMs = 1600 }) {
  if (!active) return null
  const start = 360 - segmentDeg
  const mid = 360 - Math.floor(segmentDeg / 2)
  const track = `conic-gradient(from 0deg, rgba(102,126,234,0) 0deg, rgba(102,126,234,0) ${start}deg, rgba(102,126,234,0) ${start}deg, rgba(102,126,234,1) ${mid}deg, rgba(102,126,234,0) 360deg)`
  const mask = 'linear-gradient(#000, #000) content-box, linear-gradient(#000, #000)'
  return (
    <>
      <style>{`@keyframes orbitRotate { to { transform: rotate(360deg); } }`}</style>
      <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: radius, padding: thickness, background: track, WebkitMask: mask, WebkitMaskComposite: 'xor', maskComposite: 'exclude', animation: `orbitRotate ${speedMs}ms linear infinite` }} />
      <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: radius, padding: thickness, background: track, filter: 'blur(6px)', opacity: 0.35, WebkitMask: mask, WebkitMaskComposite: 'xor', maskComposite: 'exclude', animation: `orbitRotate ${speedMs}ms linear infinite` }} />
    </>
  )
}

export default function GptTradingPanel({ isMobile, tradeMode }) {
  const { portfolio, portfolioLoading, fetchPortfolio, user } = useFinancial()
  const { positions = [], positionsLoading: poLoading, orders = [], ordersLoading, llmStatus, refreshPositions, refreshOrders } = usePortfolio()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerStack, setDrawerStack] = useState([])
  
  const positionsMarketValue = useMemo(() => {
    if (!Array.isArray(positions)) return 0
    return positions.reduce((sum, p) => {
      const currentPrice = Number(p.latest_price || 0) || Number(p.avg_entry_price || 0)
      return sum + Math.abs(Number(p.quantity || 0)) * currentPrice
    }, 0)
  }, [positions])
  const portfolioValue = useMemo(() => {
    return Number(portfolio?.cash_balance || 0) + positionsMarketValue
  }, [portfolio?.cash_balance, positionsMarketValue])
  const allSeries = useMemo(() => {
    if (!portfolio?.created_at) return []
    
    const out = []
    const todayValue = Math.round(portfolioValue)
    
    // Convert UTC portfolio creation date to EST/EDT (America/New_York handles DST automatically)
    const portfolioCreatedAt = new Date(portfolio.created_at)
    const portfolioCreatedEST = new Date(portfolioCreatedAt.toLocaleString("en-US", {timeZone: "America/New_York"}))
    
    // Get today's date in EST/EDT
    const now = new Date()
    const todayEST = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}))
    
    // Calculate the number of days between portfolio creation and today
    const timeDiff = todayEST.getTime() - portfolioCreatedEST.getTime()
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))
    
    // If portfolio was created today or in the future, show just today
    const days = Math.max(1, daysDiff)
    
    // Generate series data starting from portfolio creation date
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(portfolioCreatedEST)
      d.setDate(portfolioCreatedEST.getDate() + (days - 1 - i))
      out.push({ 
        x: d.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          timeZone: "America/New_York"
        }), 
        y: todayValue 
      })
    }
    return out
  }, [portfolioValue, portfolio?.created_at])

  const [range, setRange] = useState('1M')
  const [hoverIdx, setHoverIdx] = useState(-1)

  // Set default range based on portfolio age
  useEffect(() => {
    if (!portfolio?.created_at) return
    
    const portfolioCreatedAt = new Date(portfolio.created_at)
    const portfolioCreatedEST = new Date(portfolioCreatedAt.toLocaleString("en-US", {timeZone: "America/New_York"}))
    const now = new Date()
    const todayEST = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}))
    const portfolioAgeDays = Math.ceil((todayEST.getTime() - portfolioCreatedEST.getTime()) / (1000 * 60 * 60 * 24))
    
    if (portfolioAgeDays <= 1) setRange('1D')
    else if (portfolioAgeDays <= 7) setRange('1W')
    else if (portfolioAgeDays <= 30) setRange('1M')
    else if (portfolioAgeDays <= 90) setRange('3M')
    else if (portfolioAgeDays <= 365) setRange('1Y')
    else setRange('ALL')
  }, [portfolio?.created_at])

  const rangedSeries = useMemo(() => {
    if (!portfolio?.created_at) return []
    
    // Calculate portfolio age in days
    const portfolioCreatedAt = new Date(portfolio.created_at)
    const portfolioCreatedEST = new Date(portfolioCreatedAt.toLocaleString("en-US", {timeZone: "America/New_York"}))
    const now = new Date()
    const todayEST = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}))
    const portfolioAgeDays = Math.ceil((todayEST.getTime() - portfolioCreatedEST.getTime()) / (1000 * 60 * 60 * 24))
    
    // Calculate YTD days from portfolio creation or year start, whichever is later
    const yearStart = new Date(todayEST.getFullYear(), 0, 1)
    const ytdStart = portfolioCreatedEST > yearStart ? portfolioCreatedEST : yearStart
    const ytdDays = Math.ceil((todayEST.getTime() - ytdStart.getTime()) / (1000 * 60 * 60 * 24))
    
    const map = { 
      '1D': Math.min(1, portfolioAgeDays), 
      '1W': Math.min(7, portfolioAgeDays), 
      '1M': Math.min(30, portfolioAgeDays), 
      '3M': Math.min(90, portfolioAgeDays), 
      'YTD': Math.max(1, ytdDays), 
      '1Y': Math.min(365, portfolioAgeDays), 
      'ALL': allSeries.length 
    }
    const n = map[range] || Math.min(30, portfolioAgeDays)
    return allSeries.slice(-n)
  }, [range, allSeries, portfolio?.created_at])

  const investedValue = useMemo(() => {
    return positionsMarketValue
  }, [positionsMarketValue])

  const initialHoldings = [
    { ticker: 'AAPL', qty: 12, price: 189.32, avgCost: 175.5 },
    { ticker: 'MSFT', qty: 6, price: 415.84, avgCost: 318.1 },
    { ticker: 'NVDA', qty: 3, price: 905.12, avgCost: 620.0 },
  ]
  const [holdings] = useState(initialHoldings)

  const hoveredValue = useMemo(() => {
    if (hoverIdx >= 0 && hoverIdx < rangedSeries.length) return rangedSeries[hoverIdx].y
    return rangedSeries.length ? rangedSeries[rangedSeries.length - 1].y : 0
  }, [hoverIdx, rangedSeries])

  const pctChange = useMemo(() => {
    if (rangedSeries.length < 2) return 0
    const first = rangedSeries[0].y
    const last = hoveredValue
    return ((last - first) / first) * 100
  }, [rangedSeries, hoveredValue])

  const [ticker, setTicker] = useState('')
  const [side, setSide] = useState('BUY')
  const [orderType, setOrderType] = useState('market')
  const [quantity, setQuantity] = useState(0)
  const [limitPrice, setLimitPrice] = useState('')
  const [quotePrice, setQuotePrice] = useState(null)
  const [quoteError, setQuoteError] = useState('')
  const [quoteLoading, setQuoteLoading] = useState(false)
  const formContentRef = useRef(null)
  const [formBlockHeight, setFormBlockHeight] = useState(260)
  const hasQuote = quotePrice != null && !Number.isNaN(Number(quotePrice))

  const mockPrice = useMemo(() => 150 + Math.round(Math.random() * 100), [])
  const estPrice = orderType === 'limit' && limitPrice ? Number(limitPrice) : (quotePrice ?? mockPrice)
  const estCost = Math.max(0, (Number(quantity) || 0) * (Number(estPrice) || 0))
  const lookupQuote = async () => {
    try {
      const symbol = (ticker || '').trim()
      if (!symbol) { setQuoteError('Enter a symbol'); return }
      setQuoteLoading(true)
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'localhost:8000'
      const protocol = window.location.protocol === 'https:' ? 'https' : 'http'
      const cleanBaseUrl = baseUrl.replace(/^https?:\/\//,'')
      const resp = await fetch(`${protocol}://${cleanBaseUrl}/market/quote/${encodeURIComponent(symbol)}`)
      if(!resp.ok){ setQuoteError('We could not find that symbol.'); setQuotePrice(null); return }
      const data = await resp.json()
      if(data?.price){
        const p = Number(data.price)
        const rounded = Math.round(p * 100) / 100
        setQuotePrice(isFinite(rounded) ? rounded : null)
        setLimitPrice(isFinite(rounded) ? String(rounded.toFixed(2)) : '')
        setQuoteError('')
        setQuantity(q => (Number(q) || 0) > 0 ? q : 1)
      } else { setQuoteError('We could not find that symbol.'); setQuotePrice(null) }
    } catch (e) {
      console.error('quote error', e)
      setQuoteError('Symbol lookup failed')
    }
    finally { setQuoteLoading(false) }
  }

  useEffect(() => {
    if (!quoteLoading && formContentRef.current) {
      const h = formContentRef.current.offsetHeight
      if (h && Math.abs(h - formBlockHeight) > 2) setFormBlockHeight(h)
    }
  }, [quoteLoading, orderType, limitPrice, quantity, side])

  const stepQty = (delta) => setQuantity(q => Math.max(0, (Number(q) || 0) + delta))
  const isPlaceDisabled = !hasQuote || !ticker || (orderType === 'limit' && (!limitPrice || Number(limitPrice) <= 0)) || (Number(quantity) || 0) <= 0
  const handlePlaceOrder = async () => {
    if (isPlaceDisabled || !portfolio?.id) return
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'localhost:8000'
      const protocol = window.location.protocol === 'https:' ? 'https' : 'http'
      const cleanBaseUrl = baseUrl.replace(/^https?:\/\//,'')
      const resp = await fetch(`${protocol}://${cleanBaseUrl}/database/portfolios/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolio_id: portfolio.id,
          ticker: ticker.trim().toUpperCase(),
          side: side.toLowerCase(),
          order_type: orderType,
          quantity: Number(quantity),
          limit_price: orderType === 'limit' ? Number(limitPrice) : (quotePrice ?? null)
        })
      })
      const data = await resp.json().catch(()=>({}))
      if (!resp.ok || !data?.success) throw new Error(data?.detail || data?.error || 'Order failed')
      setQuoteError('')
      refreshPositions()
      if (user?.id && typeof fetchPortfolio === 'function') {
        fetchPortfolio(user.id)
      }
      refreshOrders()
    } catch (e) {
      console.error('place order error', e)
      setQuoteError(String(e.message || e))
    }
  }
  const rangeOptions = ['1D','1W','1M','3M','YTD','1Y','ALL']

  const sideColor = (s) => {
    const v = String(s || '').toLowerCase()
    if (v === 'buy') return 'var(--brand-income-hex)'
    if (v === 'sell') return 'var(--brand-spending-hex)'
    return 'var(--color-text-secondary)'
  }

  if (portfolioLoading) {
    return (
      <Container size="xl" className="py-6">
        <div className="w-full flex items-center justify-center" style={{ minHeight: 360 }}>
          <Spinner label="Loading portfolio..." />
        </div>
      </Container>
    )
  }

  if (!portfolio) {
    return (
      <Container size="xl" className="py-6">
        <div className="w-full flex flex-col items-center justify-center text-center gap-2" style={{ minHeight: 360 }}>
          <div className="text-[16px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>No portfolios found</div>
          <div className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>Create a paper portfolio to get started with GPT trading.</div>
        </div>
      </Container>
    )
  }

  const isLLMRunning = String(llmStatus?.status || '').toLowerCase() === 'running'

  if (poLoading) {
    return (
      <Container size="xl" className="py-6">
        <div className="w-full flex items-center justify-center" style={{ minHeight: 420 }}>
          <Spinner label="Loading portfolio data..." />
        </div>
      </Container>
    )
  }

  return (
    <Container size="xl" className="py-6">
      {/* Remove legacy background animation; use global MatrixOverlay when LLM is running */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-0 relative overflow-hidden" elevation="md">
            <div className="px-4 pt-4 pb-3 flex items-start justify-between">
              <div className="flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
                <FaDollarSign size={14} />
                <span className="text-[12px] font-medium">Portfolio Overview</span>
              </div>
              <Pill value={Math.abs(pctChange)} isPositive={pctChange >= 0} isZero={Math.abs(pctChange) < 0.01} />
            </div>

            <div className="px-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="pt-1">
                  <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Total value</div>
                  <div className="text-[22px] font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{formatCurrency(portfolioValue)}</div>
                </div>
                {(() => {
                  const cash = Number(portfolio?.cash_balance || 0)
                  const invested = investedValue
                  const total = Math.max(0, cash + invested)
                  const pct = (v) => ((v / (total || 1)) * 100).toFixed(1)
                  return (
                    <div className="flex items-start gap-8 flex-wrap justify-end w-full sm:w-auto">
                      <div className="min-w-[160px] pt-1">
                        <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Invested</div>
                        <div className="text-[18px] font-semibold" style={{ color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                          {formatCurrency(invested)}
                          <span className="ml-2 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>({pct(invested)}%)</span>
                        </div>
                        <div className="mt-1 h-[3px] rounded-full" style={{ background: 'linear-gradient(90deg, var(--brand-income-hex), rgba(99,102,241,0.15))' }} />
                      </div>
                      <div className="hidden sm:block" style={{ height: 38, width: 1, background: 'var(--color-border-primary)' }} />
                      <div className="min-w-[140px] pt-1">
                        <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Cash</div>
                        <div className="text-[18px] font-semibold" style={{ color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                          {formatCurrency(cash)}
                          <span className="ml-2 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>({pct(cash)}%)</span>
                        </div>
                        <div className="mt-1 h-[3px] rounded-full" style={{ background: 'linear-gradient(90deg, var(--color-text-muted), rgba(148,163,184,0.12))' }} />
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>

            <div className="px-4 pt-3">
              <SmoothLineChart series={rangedSeries} height={320} onHoverIndexChange={setHoverIdx} />
            </div>
            <div className="px-4 pt-2 pb-3 flex items-center gap-2 text-[11px]">
              {rangeOptions.map(opt => (
                <button key={opt} onClick={() => setRange(opt)} className={`px-2.5 py-1 rounded-md transition-all ${range===opt ? 'text-white' : ''}`} style={{ background: range===opt ? 'var(--color-gradient-primary)' : 'transparent', color: range===opt ? 'var(--color-text-white)' : 'var(--color-text-secondary)', cursor: 'pointer' }} onMouseEnter={(e)=>{ if(range!==opt){ e.currentTarget.style.transform='scale(1.06)'; e.currentTarget.style.background='var(--color-bg-hover)'} }} onMouseLeave={(e)=>{ if(range!==opt){ e.currentTarget.style.transform='scale(1.0)'; e.currentTarget.style.background='transparent'} }}>{opt}</button>
              ))}
            </div>
            {/* Removed the footer stats row per design preference */}

            {/* Simplified footer removed per design preference */}
          </Card>

          <Card className="p-0 relative overflow-hidden" elevation="md">
            <div className="px-5 pt-5 pb-2 flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
              <FaChartLine size={12} />
              <span className="text-[12px] font-medium">Positions</span>
            </div>
            <div className="relative z-10 px-3 pt-2 pb-3">
              {positions && positions.length > 0 ? (
                <PositionCardsCarousel positions={positions} />
              ) : (
                <div className="flex-1 flex items-center justify-center py-8"><div className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>No positions found</div></div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-0" elevation="md">
            <div className="px-5 pt-5 pb-0 flex items-center justify-between">
              <div className="text-[12px] font-medium flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
                <FaChartPie size={14} />
                <span>Investment Overview</span>
              </div>
              <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Holdings</div>
            </div>
            <div className="px-5 pt-2 pb-5 space-y-3">
              {(() => {
                const total = positionsMarketValue
                const sectorTotals = new Map()
                const sectorColors = new Map()
                for (const p of (positions || [])) {
                  const label = (p.sector || 'Other')
                  const currentPrice = Number(p.latest_price || 0) || Number(p.avg_entry_price || 0)
                  const val = Math.abs((p.quantity || 0) * currentPrice)
                  sectorTotals.set(label, (sectorTotals.get(label) || 0) + val)
                  if (!sectorColors.has(label) && p.sector_color) {
                    sectorColors.set(label, p.sector_color)
                  }
                }
                const items = Array.from(sectorTotals.entries())
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([label, value]) => ({ label, value, color: sectorColors.get(label) || getIndustryColor(label) }))
                const shownSum = items.reduce((s, c) => s + (c.value || 0), 0)
                const others = Math.max(0, total - shownSum)
                const segs = others > 0 ? [...items, { label: 'Other', value: others, color: '#94a3b8' }] : items
                return (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-[28px] leading-[28px] font-medium tracking-[-0.01em]" style={{ color: 'var(--color-text-secondary)', opacity: 0.95 }}>{formatCurrency(total)}</div>
                      </div>
                    </div>
                    <SegmentedBar items={segs} total={total} height={16} gap={3} radius={6} />
                    <div className="space-y-1">
                      {segs.slice(0, 3).map((c, idx) => (
                        <div key={c.label + idx} className="grid grid-cols-2 items-center rounded-md px-2 py-1 transition" style={{ outline: '1px solid transparent' }}>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="inline-block w-3 h-3 rounded-full" style={{ background: c.color }} />
                            <span className="text-[12px] truncate" style={{ color: 'var(--color-text-secondary)' }}>{c.label}</span>
                          </div>
                          <div className="text-right text-[12px] font-medium" style={{ color: 'var(--color-text-primary)', opacity: 0.92, fontVariantNumeric: 'tabular-nums' }}>
                            {formatCurrency(c.value)}
                            <span className="ml-2" style={{ color: 'var(--color-text-muted)' }}>({((c.value / (total || 1)) * 100 || 0).toFixed(1)}%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )
              })()}
            </div>
          </Card>

          {/* Next Rebalance Card - countdown and progress */}
          <Card className="p-0 overflow-hidden relative" elevation="md" style={{ background: 'var(--color-gradient-primary)' }}>
            <style>{`@keyframes barStripes { 0%{ background-position: 0 0;} 100%{ background-position: 14px 0;} }`}</style>
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(1200px 200px at -10% -40%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 60%)', opacity: 0.2 }} />
            <div className="px-5 pt-5 pb-3 flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <FaCalendarAlt size={14} color="white" />
                <div className="text-[12px] font-medium" style={{ color: 'var(--color-text-white)', opacity: 0.95 }}>Next Rebalance</div>
              </div>
              {portfolio?.rebalance_cadence && (
                <span className="text-[10px] px-2 py-1 rounded-sm" style={{ color: 'var(--color-text-white)', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}>
                  {String(portfolio.rebalance_cadence).toUpperCase()}
                </span>
              )}
            </div>
            <div className="px-5 pb-5 relative z-10">
              {(() => {
                const dueIso = portfolio?.next_rebalance_due
                if (!dueIso) {
                  return (
                    <div className="flex items-center justify-between">
                      <div className="text-[20px] font-semibold tracking-[-0.01em]" style={{ color: 'var(--color-text-white)' }}>Not scheduled</div>
                      <span className="text-[11px] px-2 py-1 rounded-sm" style={{ color: 'var(--color-text-white)', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}>Set in settings</span>
                    </div>
                  )
                }
                try {
                  const now = new Date()
                  const due = new Date(dueIso)
                  const cadence = String(portfolio?.rebalance_cadence || 'weekly').toLowerCase()
                  const windowMs = cadence === 'daily' ? 24*60*60*1000 : cadence === 'weekly' ? 7*24*60*60*1000 : cadence === 'monthly' ? 30*24*60*60*1000 : 90*24*60*60*1000
                  const start = new Date(due.getTime() - windowMs)
                  const total = windowMs
                  const elapsed = Math.max(0, Math.min(total, now.getTime() - start.getTime()))
                  const remaining = Math.max(0, total - elapsed)
                  const pct = Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)))
                  const hLeft = Math.floor(remaining / (1000*60*60))
                  const dLeft = Math.floor(hLeft / 24)
                  const hRem = hLeft % 24
                  const mLeft = Math.floor((remaining % (1000*60*60)) / (1000*60))
                  const leftLabel = dLeft > 0 ? `${dLeft}d ${hRem}h` : (hLeft > 0 ? `${hLeft}h ${mLeft}m` : `${mLeft}m`)
                  const dueLabel = due.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

                  return (
                    <>
                      <div className="flex items-center justify-start">
                        <div className="text-[18px] font-semibold tracking-[-0.01em]" style={{ color: 'var(--color-text-white)' }}>{dueLabel}</div>
                      </div>
                      <div className="mt-3">
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.25)' }}>
                          <div className="h-full" style={{ width: `${pct}%`, background: 'rgba(255,255,255,0.95)', boxShadow: '0 0 10px rgba(255,255,255,0.55)', backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.9) 25%, rgba(255,255,255,0.6) 25%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.9) 75%, rgba(255,255,255,0.6) 75%, rgba(255,255,255,0.6) 100%)', backgroundSize: '14px 14px', animation: 'barStripes 1000ms linear infinite' }} />
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="text-[11px]" style={{ color: 'var(--color-text-white)', opacity: 0.85 }}>Elapsed: {pct}%</div>
                          <div className="text-[11px]" style={{ color: 'var(--color-text-white)', opacity: 0.85 }}>Remaining: {leftLabel}</div>
                        </div>
                      </div>
                    </>
                  )
                } catch {
                  return (
                    <div className="text-[20px] font-semibold tracking-[-0.01em]" style={{ color: 'var(--color-text-white)' }}>{formatDate(portfolio?.next_rebalance_due)}</div>
                  )
                }
              })()}
            </div>
          </Card>

          <Card className="p-0 relative overflow-hidden" elevation="md">
            <div className="relative z-10 px-5 pt-5 pb-2 flex items-center justify-between" style={{ color: 'var(--color-text-muted)' }}>
              <div className="flex items-center gap-2"><FaChartLine size={12} /><span className="text-[12px] font-medium">Recent Activity</span></div>
              <button
                type="button"
                className="text-[11px] font-medium px-2 py-1 rounded-sm cursor-pointer"
                style={{ color: 'var(--color-text-secondary)', background: 'transparent' }}
                onClick={() => { setDrawerStack([{ title: 'All Recent Orders', element: (
                  <div className="p-3">
                    {ordersLoading ? (<div className="w-full flex items-center justify-center py-6"><Spinner label="Loading orders..." /></div>) : (
                      <div className="flex flex-col">
                        {orders.map((o, i) => {
                          const isBuy = String(o.side||'').toLowerCase()==='buy'
                          const qty = Number(o.filled_quantity ?? o.quantity ?? 0)
                          const px = Number(o.avg_fill_price ?? o.limit_price ?? 0)
                          const amt = Math.abs(qty * px)
                          return (
                            <div key={o.id || i} className="py-3 px-2 cursor-pointer transition-colors duration-150" style={{ borderTop: i === 0 ? 'none' : '1px solid var(--color-border-primary)', outline: '1px solid transparent', borderRadius: 8 }}
                              onClick={() => {
                                setDrawerStack(prev => [...prev, { title: 'Order Detail', element: (<OrderDetail order={o} inBottomSheet />) }])
                              }}
                              onMouseEnter={(e) => {
                                const color = isBuy ? 'var(--brand-income-hex)' : 'var(--brand-spending-hex)'
                                e.currentTarget.style.background = 'var(--color-bg-secondary)'
                                e.currentTarget.style.outline = '1px solid rgba(148,163,184,0.25)'
                                e.currentTarget.style.boxShadow = `inset 3px 0 0 ${color}`
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent'
                                e.currentTarget.style.outline = '1px solid transparent'
                                e.currentTarget.style.boxShadow = 'none'
                              }}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  {o.logo_url ? (<img src={o.logo_url} alt={o.ticker} className="w-7 h-7 rounded-full object-cover flex-shrink-0" style={{ border: '1px solid var(--color-border-primary)' }} />) : (<div className="w-7 h-7 rounded-full flex-shrink-0" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)' }} />)}
                                  <div className="min-w-0">
                                    <div className="text-[12px] font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{o.company_name || (o.ticker || '').toUpperCase()}</div>
                                    <div className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
                                      <span style={{ color: 'var(--color-text-muted)' }}>{(o.ticker || '').toUpperCase()}</span>
                                      <span className="mx-1" style={{ color: 'var(--color-text-light)' }}>•</span>
                                      {formatDate(o.filled_at || o.submitted_at)}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right self-center">
                                  <div className="text-[12px] font-semibold" style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(amt)}</div>
                                  <div className="text-[10px]" style={{ color: isBuy ? 'var(--color-success)' : 'var(--color-danger)', fontVariantNumeric: 'tabular-nums' }}>{isBuy ? '+' : '-'}{qty} shares</div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ) }]); setDrawerOpen(true) }}
                onMouseEnter={(e)=>{ e.currentTarget.style.textDecoration='underline'; e.currentTarget.style.color='var(--color-text-primary)'; }}
                onMouseLeave={(e)=>{ e.currentTarget.style.textDecoration='none'; e.currentTarget.style.color='var(--color-text-secondary)'; }}
              >View all</button>
            </div>
            <div className="relative z-10 px-3 pt-2 pb-3 flex flex-col">
              {ordersLoading ? (
                <div className="w-full flex items-center justify-center py-6"><Spinner label="Loading orders..." /></div>
              ) : (orders && orders.length > 0) ? (
                (orders.slice(0, 4)).map((o, i) => {
                  const isBuy = String(o.side||'').toLowerCase()==='buy'
                  const qty = Number(o.filled_quantity ?? o.quantity ?? 0)
                  const px = Number(o.avg_fill_price ?? o.limit_price ?? 0)
                  const amt = Math.abs(qty * px)
                  return (
                    <div key={o.id || i} className="py-3 px-4 cursor-pointer transition-colors duration-150" style={{ borderTop: i === 0 ? 'none' : '1px solid var(--color-border-primary)', outline: '1px solid transparent', borderRadius: 8 }}
                      onClick={() => {
                        setDrawerStack([{ title: 'Order Detail', element: (<OrderDetail order={o} inBottomSheet />) }])
                        setDrawerOpen(true)
                      }}
                      onMouseEnter={(e) => {
                        const color = isBuy ? 'var(--brand-income-hex)' : 'var(--brand-spending-hex)'
                        e.currentTarget.style.background = 'var(--color-bg-secondary)'
                        e.currentTarget.style.outline = '1px solid rgba(148,163,184,0.25)'
                        e.currentTarget.style.boxShadow = `inset 3px 0 0 ${color}`
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.outline = '1px solid transparent'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {o.logo_url ? (
                            <img src={o.logo_url} alt={o.ticker} className="w-8 h-8 rounded-full object-cover flex-shrink-0" style={{ border: '1px solid var(--color-border-primary)' }} />
                          ) : (
                            <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)' }} />
                          )}
                          <div className="min-w-0">
                            <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{(o.ticker || '').toUpperCase()}</div>
                            <div className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{formatDate(o.filled_at || o.submitted_at)}</div>
                          </div>
                        </div>
                        <div className="text-right self-center">
                          <div className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(amt)}</div>
                          <div className="text-[11px]" style={{ color: isBuy ? 'var(--color-success)' : 'var(--color-danger)', fontVariantNumeric: 'tabular-nums' }}>{isBuy ? '+' : '-'}{qty} shares</div>
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="flex-1 flex items-center justify-center py-8">
                  {isLLMRunning ? (
                    <div className="text-[12px] px-3 py-2 rounded-md" style={{ color: 'var(--color-text-secondary)', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)' }}>
                      Analyzing opportunities with GPT-5…
                    </div>
                  ) : (
                    <div className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>No orders yet</div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
      <SimpleDrawer
        isOpen={drawerOpen}
        stack={drawerStack}
        onClose={() => { setDrawerOpen(false); setDrawerStack([]) }}
        onBack={() => setDrawerStack(prev => prev.slice(0, -1))}
      />
    </Container>
  )
}


