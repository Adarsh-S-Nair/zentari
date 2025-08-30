import React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Container, Pill, Input, Button, Card, ToggleTabs, Spinner, NumericInput } from '../ui'
import { FaSearch, FaMinus, FaPlus, FaChartLine } from 'react-icons/fa'
import { formatCurrency, formatPercentage } from '../../utils/formatters'
import { useFinancial } from '../../contexts/FinancialContext'

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
    if (pts.length === 1) return `M ${xToPx(0)} ${yToPx(pts[0].y)}`
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
        <g>
          {gridLines.map((g, idx) => (
            <line key={idx} x1={margin.left} x2={width - margin.right} y1={g.y} y2={g.y} stroke={'var(--color-border-secondary)'} strokeWidth="1" strokeDasharray={'2 6'} />
          ))}
        </g>
        {hoverIdx >= 0 && (
          <line x1={margin.left + (innerW * (activePoint.x / (xCount || 1)))} x2={margin.left + (innerW * (activePoint.x / (xCount || 1)))} y1={margin.top} y2={height - margin.bottom} stroke={'var(--color-border-primary)'} strokeWidth="1.5" />
        )}
        <path d={pathD} fill="none" stroke={'var(--brand-income-hex)'} strokeWidth="3" />
      </svg>
    </div>
  )
}

export default function GptTradingPanel({ isMobile, tradeMode }) {
  const { portfolio, portfolioLoading, fetchPortfolio, user } = useFinancial()
  // Positions are needed to compute portfolio value (cash + market value)
  const [positions, setPositions] = useState(null)
  const positionsMarketValue = useMemo(() => {
    if (!Array.isArray(positions)) return 0
    return positions.reduce((sum, p) => sum + Math.abs(Number(p.quantity || 0)) * Number(p.avg_entry_price || 0), 0)
  }, [positions])
  const portfolioValue = useMemo(() => {
    return Number(portfolio?.cash_balance || 0) + positionsMarketValue
  }, [portfolio?.cash_balance, positionsMarketValue])
  const allSeries = useMemo(() => {
    const days = 60
    const out = []
    const todayValue = Math.round(portfolioValue)
    const now = new Date()
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      out.push({ x: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), y: todayValue })
    }
    return out
  }, [portfolioValue])

  const [range, setRange] = useState('1M')
  const [hoverIdx, setHoverIdx] = useState(-1)

  const rangedSeries = useMemo(() => {
    const map = { '1D': 5, '1W': 7, '1M': 30, '3M': 90, 'YTD': (() => { const now = new Date(); const start = new Date(now.getFullYear(), 0, 1); return Math.max(1, Math.round((now - start) / (1000*60*60*24))) })(), '1Y': 365, 'ALL': allSeries.length }
    const n = map[range] || 30
    return allSeries.slice(-n)
  }, [range, allSeries])

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
  // Lookup helper with rounding and error handling
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
        // Prefill limit with 2-decimals string
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

  // Measure the full form block height so the spinner uses the same height
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
      // Refresh orders/positions and portfolio cash
      setQuoteError('')
      // reload positions
      const posResp = await fetch(`${protocol}://${cleanBaseUrl}/database/portfolios/${portfolio.id}/positions`)
      const pos = await posResp.json().catch(()=>({}))
      setPositions(pos?.positions || [])
      // Refresh portfolio from server to reflect new cash after order
      if (user?.id && typeof fetchPortfolio === 'function') {
        fetchPortfolio(user.id)
      }
    } catch (e) {
      console.error('place order error', e)
      setQuoteError(String(e.message || e))
    }
  }
  const rangeOptions = ['1D','1W','1M','3M','YTD','1Y','ALL']

  // Hard-coded orders (Robinhood-style rows)
  const orders = [
    { ticker: 'AVGO', type: 'Limit', side: 'Sell', date: 'Jun 11', amount: 97.28, shares: 0.385517, price: 252.35 },
    { ticker: 'VST', type: 'Market', side: 'Sell', date: 'Jun 11', amount: 88.61, shares: 0.536126, price: 165.27 },
    { ticker: 'TEM', type: 'AI Market', side: 'Sell', date: 'Jun 11', amount: 90.19, shares: 1.30868, price: 68.92 },
  ]

  // Load positions for current portfolio
  const [poLoading, setPoLoading] = useState(false)

  const sideColor = (s) => {
    const v = String(s || '').toLowerCase()
    if (v === 'buy') return 'var(--brand-income-hex)'
    if (v === 'sell') return 'var(--brand-spending-hex)'
    return 'var(--color-text-secondary)'
  }

  useEffect(() => {
    const load = async () => {
      if (!portfolio?.id) return
      setPoLoading(true)
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'localhost:8000'
        const protocol = window.location.protocol === 'https:' ? 'https' : 'http'
        const cleanBaseUrl = baseUrl.replace(/^https?:\/\//,'')
        const posResp = await fetch(`${protocol}://${cleanBaseUrl}/database/portfolios/${portfolio.id}/positions`)
        const pos = await posResp.json().catch(()=>({}))
        setPositions(pos?.positions || [])
      } catch (e) {
        console.error('Load positions/orders error', e)
        setPositions([])
      } finally {
        setPoLoading(false)
      }
    }
    load()
  }, [portfolio?.id])

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

  // Gate the whole panel until positions and orders have loaded
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Toggle moved to toolbar */}

          <div>
            <div className="text-[12px] font-medium" style={{ color: 'var(--color-text-muted)' }}>Portfolio Value</div>
            <div className="flex items-center gap-3 mt-1">
              <div className="text-[32px] font-semibold tracking-[-0.01em]" style={{ color: 'var(--color-text-secondary)' }}>{formatCurrency(portfolioValue)}</div>
              <Pill value={Math.abs(pctChange)} isPositive={pctChange >= 0} isZero={Math.abs(pctChange) < 0.01} />
            </div>
            <div className="mt-1 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
              Cash balance: <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(portfolio?.cash_balance || 0)}</span>
            </div>
          </div>

          <div className="w-full">
            <SmoothLineChart series={rangedSeries} height={320} onHoverIndexChange={setHoverIdx} />
            <div className="mt-2 flex items-center gap-2 text-[11px]">
              {rangeOptions.map(opt => (
                <button key={opt} onClick={() => setRange(opt)} className={`px-2.5 py-1 rounded-md transition-all ${range===opt ? 'text-white' : ''}`} style={{ background: range===opt ? 'var(--color-gradient-primary)' : 'transparent', color: range===opt ? 'var(--color-text-white)' : 'var(--color-text-secondary)', cursor: 'pointer' }} onMouseEnter={(e)=>{ if(range!==opt){ e.currentTarget.style.transform='scale(1.06)'; e.currentTarget.style.background='var(--color-bg-hover)'} }} onMouseLeave={(e)=>{ if(range!==opt){ e.currentTarget.style.transform='scale(1.0)'; e.currentTarget.style.background='transparent'} }}>{opt}</button>
              ))}
            </div>
          </div>

          {/* Removed Orders card per design change */}
        </div>

        <div className="space-y-4">
          <Card className="p-0" elevation="md">
            <div className="px-5 pt-5 pb-2"><div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--color-text-muted)' }}><FaSearch size={12} /><span>Ticker Lookup & Trade</span></div></div>
            <div className="px-5 pb-4 space-y-4">
              {/* Symbol + Lookup */}
              <div className="grid grid-cols-[1fr_40px] gap-2 items-end">
                <div className="w-full">
                  <div className="text-[12px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>Symbol</div>
                  <Input 
                    value={ticker}
                    onChange={(e) => { setTicker(e.target.value.toUpperCase()); setQuoteError('') }} 
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); lookupQuote() } }}
                    placeholder="Enter symbol (e.g., AAPL)" 
                    className="w-full h-10" 
                  />
                </div>
                <div className="w-full flex flex-col">
                  <div className="text-[12px] mb-1 invisible select-none">Search</div>
                  <button
                    aria-label="Lookup"
                    onClick={lookupQuote}
                    className="h-10 w-10 rounded-md border flex items-center justify-center"
                    style={{ borderColor: 'var(--color-input-border)', background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', cursor: 'pointer', transition: 'transform 120ms ease, background 120ms ease' }}
                    onMouseEnter={(e)=>{ e.currentTarget.style.transform='scale(1.05)'; e.currentTarget.style.background='var(--color-bg-hover)'; }}
                    onMouseLeave={(e)=>{ e.currentTarget.style.transform='scale(1.0)'; e.currentTarget.style.background='var(--color-bg-secondary)'; }}
                  >
                    <FaSearch size={14} />
                  </button>
                </div>
              </div>
              {!quoteLoading && quoteError && (
                <div className="text-[12px]" style={{ color: 'var(--color-danger)' }}>{quoteError}</div>
              )}

              {quoteLoading ? (
                <div className="w-full flex items-center justify-center" style={{ height: formBlockHeight }}>
                  <Spinner label="Loading quote..." />
                </div>
              ) : (
                <div style={{ overflow: 'hidden', maxHeight: hasQuote ? formBlockHeight : 0, opacity: hasQuote ? 1 : 0, transition: 'max-height 200ms ease, opacity 160ms ease' }}>
                  <div ref={formContentRef}>
                    {/* Compact quote banner */}
                    <div className="flex items-center justify-between mb-2 px-3 py-2 rounded-md" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)' }}>
                      <div className="text-[12px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                        {ticker.trim().toUpperCase()} Quote
                      </div>
                      <div className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {formatCurrency(quotePrice || 0)}
                      </div>
                    </div>
                    {/* Side and Type */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-[12px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>Side</div>
                        <ToggleTabs options={[{ label: 'BUY', value: 'BUY' }, { label: 'SELL', value: 'SELL' }]} value={side} onChange={setSide} />
                      </div>
                      <div>
                        <div className="text-[12px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>Order Type</div>
                        <select value={orderType} onChange={(e)=> setOrderType(e.target.value)} className="w-full px-3 py-2 text-[13px] rounded-md border bg-transparent" style={{ borderColor: 'var(--color-input-border)', color: 'var(--color-text-primary)' }}>
                          <option value="market">Market</option>
                          <option value="limit">Limit</option>
                        </select>
                      </div>
                    </div>

                    {/* Price and Quantity */}
                    {orderType === 'limit' ? (
                      <div className="grid grid-cols-2 gap-3 w-full">
                        <div>
                          <div className="text-[12px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>Limit Price</div>
                          <Input 
                            value={limitPrice}
                            onChange={(e)=> setLimitPrice(e.target.value)} 
                            placeholder={(() => { const v = quotePrice ?? ''; return v ? String((Math.round(v*100)/100).toFixed(2)) : '' })()} 
                            className="text-[13px] h-10" 
                          />
                        </div>
                        <div>
                          <div className="text-[12px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>Quantity</div>
                          <NumericInput value={quantity} onChange={setQuantity} min={1} placeholder="Enter quantity" />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 w-full">
                        <div>
                          <div className="text-[12px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>Quantity</div>
                          <NumericInput value={quantity} onChange={setQuantity} min={1} placeholder="Enter quantity" />
                        </div>
                      </div>
                    )}

                    {(Number(quantity) || 0) > 0 && (
                      <div className="flex items-center justify-between text-[12px] mt-1"><div style={{ color: 'var(--color-text-muted)' }}>Est. {side==='BUY' ? 'Cost' : 'Proceeds'}</div><div className="font-semibold" style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(estCost)}</div></div>
                    )}

                    <div className="flex items-center gap-2 pt-2">
                      <Button label={`Place Order${(Number(quantity)||0)>0?` • ${formatCurrency(estCost)}`:''}`} width="w-full" color="networth" className="px-4 py-2 text-[13px]" disabled={quoteLoading || isPlaceDisabled} onClick={handlePlaceOrder} />
                      <Button label="Clear" width="w-auto" color="white" className="px-3 py-2 text-[13px]" onClick={()=>{ setTicker(''); setQuantity(0); setLimitPrice(''); setOrderType('market'); setQuotePrice(null); setQuoteError('') }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-0" elevation="md">
            <div className="px-5 pt-5 pb-2 flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
              <FaChartLine size={12} />
              <span className="text-[12px] font-medium">Positions</span>
            </div>
            <div className="px-3 pt-2 pb-3 flex flex-col">
              {(positions && positions.length > 0) ? (
                positions.map((p, i) => {
                  const isLong = (p.quantity || 0) >= 0
                  const qty = Math.abs(p.quantity || 0)
                  const mv = (p.avg_entry_price || 0) * qty
                  const invested = (p.avg_entry_price || 0) * qty
                  const delta = mv - invested
                  const pct = invested > 0 ? (delta / invested) * 100 : 0
                  return (
                    <div
                      key={p.id || i}
                      className="py-3 px-4 transition-colors duration-150"
                      style={{ borderTop: i === 0 ? 'none' : '1px solid var(--color-border-primary)', cursor: 'default', outline: '1px solid transparent', borderRadius: 8 }}
                      onMouseEnter={(e) => {
                        const color = p.logo_url ? '#64748b' : '#64748b'
                        e.currentTarget.style.background = 'var(--color-bg-secondary)'
                        e.currentTarget.style.outline = `1px solid rgba(148,163,184,0.25)`
                        e.currentTarget.style.boxShadow = `inset 3px 0 0 rgba(148,163,184,0.8)`
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.outline = '1px solid transparent'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        {/* Left: logo + names */}
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Company logo if present, otherwise placeholder */}
                          {p.logo_url ? (
                            <img src={p.logo_url} alt={p.ticker} className="w-8 h-8 rounded-full object-cover flex-shrink-0" style={{ border: '1px solid var(--color-border-primary)' }} />
                          ) : (
                            <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)' }} />
                          )}
                          <div className="min-w-0">
                            <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{p.company_name || p.ticker}</div>
                            <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{(p.ticker || '').toUpperCase()}</div>
                          </div>
                        </div>
                        {/* Middle spacer (removed dotted line) */}
                        <div className="hidden sm:block flex-1 mx-3" />
                        {/* Right: value and badge */}
                        <div className="text-right">
                          <div className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(mv)}</div>
                          <div className="text-[10px] flex items-center gap-1 justify-end" style={{ color: delta >= 0 ? 'var(--color-success)' : 'var(--color-danger)', fontVariantNumeric: 'tabular-nums' }}>
                            <span style={{ fontSize: 10, lineHeight: '10px' }}>{delta >= 0 ? '▲' : '▼'}</span>
                            {formatPercentage(pct)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="flex-1 flex items-center justify-center py-8"><div className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>No positions found</div></div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </Container>
  )
}


