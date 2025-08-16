import React, { useEffect, useMemo, useRef, useState } from 'react'
import { getRawBalance } from '../layout/accountsUtils'
import { formatCurrency } from '../../utils/formatters'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import SimpleDrawer from './SimpleDrawer'

const LazyAccountDetail = React.lazy(() => import('../layout/AccountDetail'))

function detectNetwork(nameOrSubtype = '') {
  const s = (nameOrSubtype || '').toLowerCase()
  if (/(visa)/.test(s)) return 'visa'
  if (/(mastercard|master card|mc)/.test(s)) return 'mastercard'
  if (/(amex|american express)/.test(s)) return 'amex'
  if (/(discover)/.test(s)) return 'discover'
  return 'generic'
}

export function AccountCard({ account, index = 0, fitWidth = false, className = '', style = {}, snapAlign = 'center' }) {
  const a = account || {}
  const i = index
  const net = detectNetwork(`${a.name || ''} ${a.subtype || ''} ${a.type || ''}`)
  const cx1 = `${(i * 37) % 100}%`
  const cy1 = `${(i * 19) % 100}%`
  const cx2 = `${(100 - (i * 23) % 100)}%`
  const cy2 = `${(100 - (i * 13) % 100)}%`
  const bg = (() => {
    const t = (a.subtype || a.type || '').toLowerCase()
    if (t.includes('cash') || t.includes('checking') || t.includes('savings')) return 'var(--color-gradient-assets)'
    if (t.includes('invest') || t.includes('broker')) return 'var(--color-gradient-networth)'
    if (t.includes('credit') || t.includes('loan')) return 'var(--color-gradient-liabilities)'
    return 'var(--color-gradient-primary)'
  })()
  const balance = getRawBalance(a)
  const baseClass = fitWidth ? 'w-full' : 'min-w-[280px]'
  const baseStyle = fitWidth ? { aspectRatio: '7 / 4' } : { height: 160 }
  return (
    <div className={`${baseClass} ${className} relative rounded-2xl p-4 text-white transition-transform`} style={{ scrollSnapAlign: snapAlign, border: '1px solid rgba(255,255,255,0.18)', boxShadow: '0 6px 14px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.15)', backdropFilter: 'blur(2px)', background: bg, marginBottom: 2, ...baseStyle, ...style }}>
      <svg className="absolute inset-0 rounded-2xl" width="100%" height="100%" style={{ mixBlendMode: 'overlay', opacity: 0.55, pointerEvents: 'none' }}>
        <defs>
          <radialGradient id={`rg1-${i}`} cx={cx1} cy={cy1} r="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
            <stop offset="60%" stopColor="rgba(255,255,255,0.08)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <radialGradient id={`rg2-${i}`} cx={cx2} cy={cy2} r="90%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
            <stop offset="70%" stopColor="rgba(255,255,255,0.05)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>
        <rect x="-20" y="-20" width="140%" height="140%" rx="20" fill={`url(#rg1-${i})`} />
        <rect x="-20" y="-20" width="140%" height="140%" rx="20" fill={`url(#rg2-${i})`} />
      </svg>
      <svg className="absolute inset-0" width="100%" height="100%" style={{ opacity: 0.45, pointerEvents: 'none' }}>
        <path d={`M0 ${140 - (i % 4) * 8} C 80 ${80 + (i % 5) * 6}, 160 ${40 + (i % 7) * 4}, 320 ${20 + (i % 3) * 10} L 320 0 L 0 0 Z`} fill="rgba(255,255,255,0.08)" />
        <path d={`M0 ${120 - (i % 4) * 10} C 100 ${90 + (i % 6) * 7}, 180 ${60 + (i % 5) * 5}, 320 ${40 + (i % 4) * 10} L 320 0 L 0 0 Z`} fill="rgba(0,0,0,0.10)" />
        <path d={`M0 ${150 - (i % 5) * 6} C 60 ${120 + (i % 3) * 5}, 140 ${90 + (i % 4) * 6}, 320 ${70 + (i % 5) * 8} L 320 180 L 0 180 Z`} fill="rgba(0,0,0,0.12)" />
      </svg>
      <div className="pointer-events-none absolute inset-0 rounded-2xl" style={{ background: 'linear-gradient(60deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 40%, rgba(255,255,255,0) 65%)' }} />
      <div className="flex items-center justify-between relative z-10">
        <div className="text-[11px] font-semibold tracking-widest" style={{ letterSpacing: '0.08em', color: 'rgba(255,255,255,0.92)' }}>{(a.subtype || a.type || 'Account').toString().toUpperCase()}</div>
        {a.institution_logo || a.institution?.logo ? (
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.22)', border: '1px solid rgba(255,255,255,0.45)', boxShadow: '0 2px 8px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.6)', backdropFilter: 'blur(2px)' }}>
            <img src={a.institution_logo || a.institution?.logo} alt="institution" className="w-5 h-5 rounded-full object-cover" />
          </div>
        ) : (
          <span className="w-8 h-8 rounded-full inline-flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.22)', border: '1px solid rgba(255,255,255,0.35)' }}>
            <span className="w-4 h-4 rounded-full inline-block" style={{ background: 'rgba(255,255,255,0.6)' }} />
          </span>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between relative z-10">
        <svg width="38" height="26" style={{ borderRadius: 6, display: 'block', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.25))' }}>
          <defs>
            <linearGradient id={`chipGray-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e5e7eb" />
              <stop offset="100%" stopColor="#9ca3af" />
            </linearGradient>
            <linearGradient id={`chipShine-${i}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="38" height="26" rx="6" fill={`url(#chipGray-${i})`} stroke="rgba(0,0,0,0.18)" />
          <rect x="1" y="1" width="36" height="24" rx="5" fill="none" stroke="rgba(255,255,255,0.55)" />
          <g stroke="#6b7280" strokeWidth="1.1" strokeLinecap="round" opacity="0.85">
            <path d="M7 6 v14" />
            <path d="M14 6 v14" />
            <path d="M21 6 v14" />
            <path d="M28 6 v14" />
            <path d="M7 13 h21" />
            <path d="M7 10 h8" />
            <path d="M20 16 h8" />
          </g>
          <g fill="#6b7280" opacity="0.95">
            <rect x="5.5" y="12.5" width="2.6" height="2.6" rx="0.6" />
            <rect x="12.5" y="12.5" width="2.6" height="2.6" rx="0.6" />
            <rect x="19.5" y="12.5" width="2.6" height="2.6" rx="0.6" />
            <rect x="26.5" y="12.5" width="2.6" height="2.6" rx="0.6" />
          </g>
          <rect x="0" y="0" width="38" height="26" rx="6" fill={`url(#chipShine-${i})`} />
        </svg>
        <div className="text-[12px] opacity-90 truncate max-w-[160px] text-right" style={{ color: 'rgba(255,255,255,0.92)' }}>{a.name || (a.subtype || a.type || 'Account')}</div>
      </div>
      <div className="mt-4 relative z-10">
        <div className="text-[18px] font-semibold tracking-wide" style={{ color: 'rgba(255,255,255,0.96)' }}>{formatCurrency(balance)}</div>
      </div>
      <div className="absolute left-4 right-4 bottom-3 text-[12px] opacity-90 flex items-center justify-start" style={{ letterSpacing: '0.08em' }}>
        <span className="tracking-widest" style={{ color: 'rgba(255,255,255,0.92)' }}>{a.mask ? `••••  ••••  ••••  ${String(a.mask).slice(-4)}` : ''}</span>
      </div>
      {(() => {
        if (net === 'mastercard') return (
          <div className="absolute right-3 bottom-3 opacity-80 flex -space-x-2">
            <span className="w-6 h-6 rounded-full inline-block" style={{ background: '#f59e0b' }} />
            <span className="w-6 h-6 rounded-full inline-block" style={{ background: '#ef4444', mixBlendMode: 'screen' }} />
          </div>
        )
        if (net === 'visa') return (
          <div className="absolute right-3 bottom-3 opacity-90 text-[11px] font-semibold tracking-widest">VISA</div>
        )
        if (net === 'amex') return (
          <div className="absolute right-3 bottom-3 opacity-90 text-[10px] font-semibold" style={{ padding: '2px 6px', borderRadius: 6, background: 'rgba(255,255,255,0.18)' }}>AMEX</div>
        )
        if (net === 'discover') return (
          <div className="absolute right-3 bottom-3 opacity-80"><span className="w-6 h-6 rounded-full inline-block" style={{ background: '#f59e0b' }} /></div>
        )
        return null
      })()}
    </div>
  )
}

export default function AccountCardsCarousel({ accounts = [], className = '', style = {}, onCardClick }) {
  const rootRef = useRef(null)
  const carouselRef = useRef(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerStack, setDrawerStack] = useState([])

  const sorted = useMemo(() => (accounts || [])
    .map(a => ({ ...a, balance: getRawBalance(a) }))
    .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
    .slice(0, 12), [accounts])

  const CARD_W = 280
  const GAP = 12

  const computeNearestIndex = (el) => {
    if (!el) return 0
    const itemWidth = CARD_W + GAP
    const viewportCenter = el.scrollLeft + el.clientWidth / 2
    let nearest = 0
    let minDist = Infinity
    for (let i = 0; i < sorted.length; i++) {
      const cardCenter = i * itemWidth + CARD_W / 2
      const dist = Math.abs(cardCenter - viewportCenter)
      if (dist < minDist) { minDist = dist; nearest = i }
    }
    return nearest
  }

  const updateArrowsAndActive = () => {
    const el = carouselRef.current
    if (!el) return
    const maxScrollLeft = Math.max(0, el.scrollWidth - el.clientWidth - 2)
    const atStart = el.scrollLeft <= 2
    const atEnd = el.scrollLeft >= maxScrollLeft - 2
    setCanLeft(!atStart)
    setCanRight(!atEnd)
    if (atStart) { setActiveIndex(0); return }
    if (atEnd) { setActiveIndex(Math.max(0, sorted.length - 1)); return }
    setActiveIndex(computeNearestIndex(el))
  }

  const scrollToIndex = (idx) => {
    const el = carouselRef.current
    if (!el) return
    const maxIdx = Math.max(0, sorted.length - 1)
    const i = Math.max(0, Math.min(idx, maxIdx))
    const itemWidth = CARD_W + GAP
    let target
    if (i === 0) {
      target = 0
    } else if (i === maxIdx) {
      target = el.scrollWidth - el.clientWidth
    } else {
      target = i * itemWidth + CARD_W / 2 - el.clientWidth / 2
    }
    const clamped = Math.max(0, Math.min(target, el.scrollWidth - el.clientWidth))
    el.scrollTo({ left: clamped, behavior: 'smooth' })
    setTimeout(updateArrowsAndActive, 220)
  }

  useEffect(() => {
    const el = carouselRef.current
    if (!el) return
    updateArrowsAndActive()
    const onScroll = () => updateArrowsAndActive()
    const onResize = () => updateArrowsAndActive()
    el.addEventListener('scroll', onScroll)
    window.addEventListener('resize', onResize)
    return () => { el.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onResize) }
  }, [sorted.length])

  const scrollByAmount = (dir = 1) => {
    const el = carouselRef.current
    if (!el) return
    const perView = Math.max(1, Math.floor((el.clientWidth + GAP) / (CARD_W + GAP)))
    const nextIndex = Math.max(0, Math.min(sorted.length - 1, activeIndex + dir * perView))
    scrollToIndex(nextIndex)
  }

  const getSnapAlignForIndex = (i) => {
    if (i === 0) return 'start'
    if (i === sorted.length - 1) return 'end'
    return 'center'
  }

  const openAccountDrawer = (account) => {
    const title = account?.name || (account?.subtype || account?.type || 'Account')
    setDrawerStack([{ title, element: (
      <React.Suspense fallback={null}>
        <LazyAccountDetail account={account} inBottomSheet />
      </React.Suspense>
    ) }])
    setDrawerOpen(true)
  }

  const handleCardClick = (e, account) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault()
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation()
    openAccountDrawer(account)
  }

  return (
    <div ref={rootRef} className={`relative ${className}`} style={style}>
      {/* Edge fades for scroll affordance */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-10 w-6" style={{ background: 'linear-gradient(90deg, var(--color-bg-secondary) 10%, rgba(0,0,0,0))' }} />
      <div className="pointer-events-none absolute right-0 top-0 bottom-10 w-6" style={{ background: 'linear-gradient(270deg, var(--color-bg-secondary) 10%, rgba(0,0,0,0))' }} />

      {/* Arrow controls */}
      {canLeft && (
        <button
          aria-label="Scroll left"
          onClick={() => scrollByAmount(-1)}
          className="absolute left-1 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full shadow-md transition-transform hover:scale-110 cursor-pointer"
          style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)' }}
        >
          <FiChevronLeft size={16} />
        </button>
      )}
      {canRight && (
        <button
          aria-label="Scroll right"
          onClick={() => scrollByAmount(1)}
          className="absolute right-1 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full shadow-md transition-transform hover:scale-110 cursor-pointer"
          style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)' }}
        >
          <FiChevronRight size={16} />
        </button>
      )}

      <div ref={carouselRef} className="flex gap-3 overflow-x-auto overflow-y-visible hide-scrollbar scroll-smooth" style={{ scrollSnapType: 'x mandatory', paddingTop: 6, paddingBottom: 28 }}>
        {sorted.map((a, i) => (
          <div key={i} style={{ flex: '0 0 auto' }}>
            <div role="button" onClick={(e) => handleCardClick(e, a)} className="cursor-pointer" title={a.name || 'Open account'}>
              <AccountCard account={a} index={i} snapAlign={getSnapAlignForIndex(i)} />
            </div>
          </div>
        ))}
      </div>

      {/* Pagination bubbles */}
      {sorted.length > 1 && (
        <div className="absolute left-0 right-0 bottom-2 flex items-center justify-center gap-1.5 select-none">
          {sorted.map((_, i) => {
            const isActive = i === activeIndex
            return (
              <button
                key={i}
                aria-label={`Go to card ${i + 1}`}
                onClick={() => scrollToIndex(i)}
                className="rounded-full transition-all duration-200 ease-out cursor-pointer"
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.15)'
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--brand-income-hex)'
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(103, 80, 164, 0.20)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = isActive ? 'scale(1.1)' : 'scale(1.0)'
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(148,163,184,0.5)'
                    e.currentTarget.style.boxShadow = 'none'
                  }
                }}
                style={{
                  height: 6,
                  width: isActive ? 18 : 6,
                  background: isActive ? 'var(--brand-income-hex)' : 'rgba(148,163,184,0.5)',
                  transform: isActive ? 'scale(1.1)' : 'scale(1.0)',
                  willChange: 'transform'
                }}
              />
            )
          })}
        </div>
      )}

      {/* Account detail drawer */}
      <SimpleDrawer
        isOpen={drawerOpen}
        stack={drawerStack}
        onClose={() => setDrawerOpen(false)}
        onBack={() => setDrawerStack(s => s.slice(0, -1))}
      />
    </div>
  )
} 