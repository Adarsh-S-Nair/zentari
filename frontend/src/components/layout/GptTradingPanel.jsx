import React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Container, Pill, Input, Button, Card, ToggleTabs } from '../ui'
import { FaSearch, FaMinus, FaPlus } from 'react-icons/fa'
import { formatCurrency } from '../../utils/formatters'

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

export default function GptTradingPanel({ isMobile }) {
  const allSeries = useMemo(() => {
    const now = new Date()
    const days = 365
    const out = []
    let base = 10000
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const drift = (Math.random() - 0.5) * 40
      base = Math.max(8500, base + drift)
      out.push({ x: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), y: Math.round(base) })
    }
    return out
  }, [])

  const [range, setRange] = useState('1M')
  const [hoverIdx, setHoverIdx] = useState(-1)
  const [tradeMode, setTradeMode] = useState('PAPER')

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

  const [ticker, setTicker] = useState('AAPL')
  const [side, setSide] = useState('BUY')
  const [orderType, setOrderType] = useState('market')
  const [quantity, setQuantity] = useState(1)
  const [limitPrice, setLimitPrice] = useState('')

  const mockPrice = useMemo(() => 150 + Math.round(Math.random() * 100), [])
  const estPrice = orderType === 'limit' && limitPrice ? Number(limitPrice) : mockPrice
  const estCost = Math.max(0, (Number(quantity) || 0) * (Number(estPrice) || 0))

  const stepQty = (delta) => setQuantity(q => Math.max(0, (Number(q) || 0) + delta))
  const isPlaceDisabled = !ticker || (orderType === 'limit' && (!limitPrice || Number(limitPrice) <= 0)) || (Number(quantity) || 0) <= 0
  const rangeOptions = ['1D','1W','1M','3M','YTD','1Y','ALL']

  // Hard-coded orders (Robinhood-style rows)
  const orders = [
    { ticker: 'AVGO', type: 'Limit', side: 'Sell', date: 'Jun 11', amount: 97.28, shares: 0.385517, price: 252.35 },
    { ticker: 'VST', type: 'Market', side: 'Sell', date: 'Jun 11', amount: 88.61, shares: 0.536126, price: 165.27 },
    { ticker: 'TEM', type: 'AI Market', side: 'Sell', date: 'Jun 11', amount: 90.19, shares: 1.30868, price: 68.92 },
  ]

  return (
    <Container size="xl" className="py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <ToggleTabs options={[{ label: 'PAPER', value: 'PAPER' }, { label: 'LIVE', value: 'LIVE', disabled: true }]} value={tradeMode} onChange={setTradeMode} activeStyles={{ PAPER: { background: 'var(--color-gradient-primary)', color: 'var(--color-text-white)' }, LIVE: { background: 'var(--color-danger)', color: 'var(--color-text-white)' } }} className="max-w-[260px]" />

          <div>
            <div className="text-[12px] font-medium" style={{ color: 'var(--color-text-muted)' }}>Portfolio Value</div>
            <div className="flex items-center gap-3 mt-1">
              <div className="text-[32px] font-semibold tracking-[-0.01em]" style={{ color: 'var(--color-text-secondary)' }}>{formatCurrency(hoveredValue)}</div>
              <Pill value={Math.abs(pctChange)} isPositive={pctChange >= 0} isZero={Math.abs(pctChange) < 0.01} />
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

          {/* Orders as a Card with header */}
          <Card className="p-0" elevation="md">
            <div className="px-5 pt-5 pb-2" style={{ color: 'var(--color-text-muted)' }}>
              <span className="text-[12px] font-medium">Orders</span>
            </div>
            <div>
              {orders.map((o, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3" style={{ borderTop: i === 0 ? 'none' : '1px solid var(--color-border-primary)' }}>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{o.ticker} {o.type} {o.side}</div>
                    <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{o.date}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(o.amount)}</div>
                    <div className="text-[11px]" style={{ color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums' }}>{o.shares.toFixed(6)} shares at {formatCurrency(o.price)}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-0" elevation="md">
            <div className="px-5 pt-5 pb-0"><div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--color-text-muted)' }}><FaSearch size={12} /><span>Ticker Lookup & Trade</span></div></div>
            <div className="px-5 pb-4 space-y-3">
              <div>
                <div className="text-[12px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>Symbol</div>
                <div className="flex items-center gap-2"><Input value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} placeholder="AAPL" className="flex-1" /><Button label="Go" width="w-auto" color="networth" className="px-3 py-1.5 text-[12px]" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[12px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>Side</div>
                  <ToggleTabs options={[{ label: 'BUY', value: 'BUY' }, { label: 'SELL', value: 'SELL' }]} value={side} onChange={setSide} activeStyles={{ BUY: { background: 'var(--color-gradient-primary)', color: 'var(--color-text-white)' }, SELL: { background: 'var(--color-danger)', color: 'var(--color-text-white)' } }} />
                </div>
                <div>
                  <div className="text-[12px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>Order Type</div>
                  <select value={orderType} onChange={(e)=> setOrderType(e.target.value)} className="w-full px-3 py-2.5 text-sm rounded-md border bg-transparent" style={{ borderColor: 'var(--color-input-border)', color: 'var(--color-text-primary)' }}><option value="market">Market</option><option value="limit">Limit</option></select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[12px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>Price</div>
                  <Input value={orderType==='limit' ? limitPrice : estPrice} onChange={(e)=> setLimitPrice(e.target.value)} disabled={orderType!=='limit'} placeholder={String(estPrice)} />
                </div>
                <div>
                  <div className="text-[12px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>Quantity</div>
                  <div className="flex items-center gap-2"><button aria-label="decrease" className="w-8 h-8 rounded-md border flex items-center justify-center" style={{ borderColor: 'var(--color-border-primary)', color: 'var(--color-text-secondary)' }} onClick={() => stepQty(-1)}>−</button><Input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value || 0))} min={0} step={1} className="flex-1" /><button aria-label="increase" className="w-8 h-8 rounded-md border flex items-center justify-center" style={{ borderColor: 'var(--color-border-primary)', color: 'var(--color-text-secondary)' }} onClick={() => stepQty(1)}>+</button></div>
                </div>
              </div>
              <div className="flex items-center justify-between text-[12px] mt-1"><div style={{ color: 'var(--color-text-muted)' }}>Est. {side==='BUY' ? 'Cost' : 'Proceeds'}</div><div className="font-semibold" style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(estCost)}</div></div>
              <div className="flex items-center gap-2 pt-1"><Button label="Place Order" width="w-full" color="networth" className="px-4 py-2 text-[12px]" disabled={isPlaceDisabled} /><Button label="Clear" width="w-auto" color="white" className="px-3 py-2 text-[12px]" onClick={()=>{ setQuantity(0); setLimitPrice(''); setOrderType('market') }} /></div>
            </div>
          </Card>

          <Card className="p-0" elevation="md">
            <div className="px-5 pt-5 pb-2" style={{ color: 'var(--color-text-muted)' }}><span className="text-[12px] font-medium">Holdings</span></div>
            <div className="px-3 pt-2 pb-4">
              {holdings.map((h, i) => {
                const pl = (h.price - 0) * h.qty // simplified since avgCost omitted here
                const plPct = 0 // placeholder percentage if needed
                const marketValue = h.qty * h.price
                const shareLabel = `${h.qty} ${h.qty === 1 ? 'share' : 'shares'}`
                return (
                  <div key={h.ticker + i} className="py-3 px-2 flex items-center justify-between gap-3" style={{ borderTop: i === 0 ? 'none' : '1px solid var(--color-border-primary)' }}>
                    <div className="min-w-0"><div className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{h.ticker}</div><div className="text-[11px] truncate" style={{ color: 'var(--color-text-muted)' }}>{shareLabel}</div></div>
                    <div className="text-right flex flex-col items-end"><div className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(marketValue)}</div><div className="mt-0.5"><Pill value={Math.abs(plPct)} isPositive={plPct >= 0} /></div></div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </div>
    </Container>
  )
}


