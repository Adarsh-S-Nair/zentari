import React, { useEffect, useMemo, useRef, useState } from 'react'
import { getRawBalance } from '../layout/accountsUtils'
import { formatCurrency } from '../../utils/formatters'

function detectNetwork(nameOrSubtype = '') {
  const s = (nameOrSubtype || '').toLowerCase()
  if (/(visa)/.test(s)) return 'visa'
  if (/(mastercard|master card|mc)/.test(s)) return 'mastercard'
  if (/(amex|american express)/.test(s)) return 'amex'
  if (/(discover)/.test(s)) return 'discover'
  return 'generic'
}

export function AccountCard({ account, index = 0, fitWidth = false, className = '', style = {} }) {
  const a = account || {}
  const i = index
  const net = detectNetwork(`${a.name || ''} ${a.subtype || ''} ${a.type || ''}`)
  const cx1 = `${(i * 37) % 100}%`
  const cy1 = `${(i * 19) % 100}%`
  const cx2 = `${(100 - (i * 23) % 100)}%`
  const cy2 = `${(100 - (i * 13) % 100)}%`
  const bg = (() => {
    const t = (a.subtype || a.type || '').toLowerCase()
    if (t.includes('credit')) return 'linear-gradient(135deg,#7f1d1d 0%, #450a0a 100%)'
    if (t.includes('cash') || t.includes('checking') || t.includes('savings')) return 'linear-gradient(135deg,#1d4ed8 0%, #0f3ab6 100%)'
    if (t.includes('invest') || t.includes('broker')) return 'linear-gradient(135deg,#065f46 0%, #064e3b 100%)'
    return 'linear-gradient(135deg, #4338ca 0%, #312e81 100%)'
  })()
  const balance = getRawBalance(a)
  const baseClass = fitWidth ? 'w-full' : 'min-w-[280px]'
  const baseStyle = fitWidth ? { aspectRatio: '7 / 4' } : { height: 160 }
  return (
    <div className={`${baseClass} ${className} relative rounded-2xl p-4 text-white transition-transform`} style={{ scrollSnapAlign: fitWidth ? 'unset' : 'center', border: '1px solid rgba(255,255,255,0.18)', boxShadow: '0 6px 14px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.15)', backdropFilter: 'blur(2px)', background: bg, marginBottom: 2, ...baseStyle, ...style }}>
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
          <img src={a.institution_logo || a.institution?.logo} alt="inst" className="w-7 h-7 rounded-full object-cover" />
        ) : (
          <span className="w-7 h-7 rounded-full inline-block" style={{ background: 'rgba(255,255,255,0.25)' }} />
        )}
      </div>
      <div className="mt-4 flex items-center justify-between relative z-10">
        <svg width="46" height="32" style={{ borderRadius: 8, display: 'block' }}>
          <defs>
            <linearGradient id={`chipBase-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e8dbc0" />
              <stop offset="100%" stopColor="#b5a682" />
            </linearGradient>
            <linearGradient id={`chipShine-${i}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="46" height="32" rx="8" fill={`url(#chipBase-${i})`} stroke="rgba(0,0,0,0.20)" />
          <rect x="1.5" y="1.5" width="43" height="29" rx="7" fill="none" stroke="rgba(255,255,255,0.35)" />
          <g stroke="#8b7d5a" strokeWidth="1.2" strokeLinecap="round" opacity="0.9">
            <path d="M8 7 v18" />
            <path d="M16 7 v18" />
            <path d="M24 7 v18" />
            <path d="M32 7 v18" />
            <path d="M8 16 h24" />
            <path d="M8 12 h10" />
            <path d="M22 22 h10" />
          </g>
          <g fill="#8b7d5a" opacity="0.95">
            <rect x="6.5" y="14.5" width="3" height="3" rx="0.7" />
            <rect x="14.5" y="14.5" width="3" height="3" rx="0.7" />
            <rect x="22.5" y="14.5" width="3" height="3" rx="0.7" />
            <rect x="30.5" y="14.5" width="3" height="3" rx="0.7" />
          </g>
          <rect x="0" y="0" width="46" height="32" rx="8" fill={`url(#chipShine-${i})`} />
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
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [carouselPages, setCarouselPages] = useState(1)
  const [containerW, setContainerW] = useState(0)

  useEffect(() => {
    const node = rootRef.current
    if (!node) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width || 0
      setContainerW(w)
    })
    ro.observe(node)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const el = carouselRef.current
    if (!el) return
    const CARD_W = 280
    const GAP = 12
    const compute = () => {
      const containerW = el.clientWidth || 1
      const perView = Math.max(1, Math.floor((containerW + GAP) / (CARD_W + GAP)))
      setCarouselPages(Math.max(1, Math.ceil((Array.isArray(accounts) ? accounts.length : 0) / perView)))
      const idx = Math.round(el.scrollLeft / ((CARD_W + GAP) * perView))
      setCarouselIndex(idx)
    }
    const onScroll = () => {
      const containerW = el.clientWidth || 1
      const perView = Math.max(1, Math.floor((containerW + GAP) / (CARD_W + GAP)))
      const idx = Math.round(el.scrollLeft / ((CARD_W + GAP) * perView))
      setCarouselIndex(idx)
    }
    compute()
    el.addEventListener('scroll', onScroll)
    window.addEventListener('resize', compute)
    return () => { el.removeEventListener('scroll', onScroll); window.removeEventListener('resize', compute) }
  }, [accounts])

  const sorted = useMemo(() => (accounts || [])
    .map(a => ({ ...a, balance: getRawBalance(a) }))
    .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
    .slice(0, 12), [accounts])

  const CARD_W = 280
  const CARD_H = 160
  const scale = useMemo(() => {
    if (!containerW) return 1
    const available = containerW - 24 // padding/gaps safety
    const s = Math.min(1, Math.max(0.78, available / CARD_W))
    return s
  }, [containerW])
  const padLR = useMemo(() => {
    const scaledW = CARD_W * scale
    return Math.max(0, (containerW - scaledW) / 2)
  }, [containerW, scale])

  return (
    <div ref={rootRef} className={`relative ${className}`} style={style}>
      {/* Edge fades for scroll affordance */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-6 w-6 rounded-l-2xl" style={{ background: 'linear-gradient(90deg, var(--color-bg-secondary) 10%, rgba(0,0,0,0))' }} />
      <div className="pointer-events-none absolute right-0 top-0 bottom-6 w-6 rounded-r-2xl" style={{ background: 'linear-gradient(270deg, var(--color-bg-secondary) 10%, rgba(0,0,0,0))' }} />

      <div ref={carouselRef} className="flex gap-3 overflow-x-auto overflow-y-visible hide-scrollbar scroll-smooth" style={{ scrollSnapType: 'x mandatory', paddingTop: 6, paddingBottom: 12, paddingLeft: padLR, paddingRight: padLR, minHeight: CARD_H * scale + 24, overflowY: 'visible' }}>
        {sorted.map((a, i) => (
          <div key={i} onMouseEnter={(e) => { e.currentTarget.style.transform = `translateY(-2px) scale(${scale})` }} onMouseLeave={(e) => { e.currentTarget.style.transform = `translateY(0) scale(${scale})` }} style={{ transform: `translateY(0) scale(${scale})`, transformOrigin: 'left top', transition: 'transform 150ms ease' }}>
            <div role="button" onClick={() => onCardClick && onCardClick(a)} style={{ cursor: onCardClick ? 'pointer' : 'default' }}>
              <AccountCard account={a} index={i} />
            </div>
          </div>
        ))}
      </div>

      {/* Paging dots */}
      <div className="flex items-center justify-center gap-1.5 mt-2">
        {Array.from({ length: carouselPages }).map((_, i) => {
          const isActive = carouselIndex === i
          return (
            <button
              key={i}
              aria-current={isActive}
              onClick={() => {
                const el = carouselRef.current; if (!el) return; const CARD_W = 280; const GAP = 12; const perView = Math.max(1, Math.floor((el.clientWidth + GAP) / (CARD_W + GAP))); el.scrollTo({ left: i * (CARD_W + GAP) * perView, behavior: 'smooth' });
              }}
              className={`rounded-full transition-all transform ${isActive ? 'w-5 h-1.5' : 'w-2.5 h-1.5'} hover:scale-110`} 
              style={{ background: isActive ? 'linear-gradient(90deg,#667eea 0%, #764ba2 100%)' : 'var(--color-border-primary)', boxShadow: isActive ? '0 0 0 2px rgba(118,75,162,0.25)' : 'none', cursor: 'pointer' }}
              title={`Go to page ${i + 1}`}
            />
          )
        })}
      </div>
    </div>
  )
} 