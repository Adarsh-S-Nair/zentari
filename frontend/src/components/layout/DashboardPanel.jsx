import React, { useContext, useMemo, useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDrawer } from '../../App'
import AccountDetail from './AccountDetail'
import { FinancialContext } from '../../contexts/FinancialContext'
import { Card, Container, Button, Spinner, Pill, AccountCardsCarousel } from '../ui'
import { SpendingEarningChart } from '../charts'
import { FaWallet, FaChartPie, FaChartBar, FaReceipt, FaCalendarAlt, FaPiggyBank } from 'react-icons/fa'
import CategoryIcon from '../ui/CategoryIcon'
import { formatCurrency, formatDate } from '../../utils/formatters'
import { groupAccountsByType, getRawBalance } from './accountsUtils'
import AccountsListDrawer from './AccountsListDrawer'
import SimpleDrawer from '../ui/SimpleDrawer'

function hexToRgba(hex, alpha = 1) {
  const h = hex?.replace('#', '')
  if (!h || (h.length !== 6 && h.length !== 3)) return `rgba(0,0,0,${alpha})`
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const r = parseInt(full.substring(0, 2), 16)
  const g = parseInt(full.substring(2, 4), 16)
  const b = parseInt(full.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function ProgressBar({ value = 0, max = 100, color = 'var(--color-primary)' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className="w-full h-2 rounded-md" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)' }}>
      <div className="h-full rounded-md" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

function SegmentedBar({ items = [], total = 0, height = 16, gap = 3, radius = 6, onItemClick }) {
  const safeTotal = total > 0 ? total : items.reduce((s, i) => s + (i.value || 0), 0)
  const count = items.length
  const containerRef = useRef(null)
  const [tt, setTt] = useState({ visible: false, x: 0, label: '', value: 0, pct: 0, color: '#999' })

  const handleLeave = () => setTt((p) => ({ ...p, visible: false }))

  return (
    <div ref={containerRef} className="relative w-full rounded-[10px]" style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-primary)', padding: 2 }} onMouseLeave={handleLeave}>
      {tt.visible && (
        <div style={{ position: 'absolute', left: tt.x, top: -36, background: 'var(--color-bg-primary)', border: '1px solid var(--color-border-primary)', borderRadius: 10, padding: '8px 10px', fontSize: 11, boxShadow: '0 6px 14px rgba(0,0,0,0.14)', pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 5 }}>
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: tt.color, marginRight: 8, verticalAlign: 'middle' }} />
          <span style={{ color: 'var(--color-text-secondary)' }}>{tt.label}</span>
          <span style={{ marginLeft: 8, color: 'var(--color-text-primary)', fontWeight: 600 }}>{formatCurrency(tt.value)}</span>
          <span style={{ marginLeft: 6, color: 'var(--color-text-muted)' }}>({((tt.value / safeTotal) * 100 || 0).toFixed(1)}%)</span>
        </div>
      )}
      <div className="flex items-stretch w-full" style={{ gap: `${gap}px`, height }}>
        {items.map((seg, idx) => {
          const widthPct = safeTotal ? (seg.value / safeTotal) * 100 : 0
          const isFirst = idx === 0
          const isLast = idx === count - 1
          const br = `${isFirst ? radius : 0}px ${isLast ? radius : 0}px ${isLast ? radius : 0}px ${isFirst ? radius : 0}px`
          const onMove = (e) => {
            const rect = containerRef.current?.getBoundingClientRect()
            const x = Math.min(Math.max(10, e.clientX - (rect?.left || 0)), (rect?.width || 0) - 10)
            setTt({ visible: true, x, label: seg.label || 'Category', value: seg.value || 0, pct: widthPct, color: seg.color || '#999' })
          }
          const isClickable = typeof onItemClick === 'function' && (seg?.id != null)
          return (
            <div
              key={idx}
              onMouseEnter={onMove}
              onMouseMove={onMove}
              onMouseLeave={handleLeave}
              onClick={isClickable ? () => onItemClick(seg) : undefined}
              className="transition-all"
              style={{
                width: `${widthPct}%`,
                background: seg.background || seg.color,
                height: '100%',
                borderRadius: br,
                cursor: isClickable ? 'pointer' : 'default',
                outline: '1px solid var(--color-border-primary)',
                filter: tt.visible && tt.label === (seg.label || 'Category') ? 'brightness(1.06) saturate(1.05)' : 'none',
                boxShadow: tt.visible && tt.label === (seg.label || 'Category') ? `0 0 0 3px ${hexToRgba(seg.color || '#000000', 0.25)}, 0 2px 8px rgba(0,0,0,0.12)` : 'none'
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

export default function DashboardPanel() {
  const { accounts, transactions, loading, spendingEarningSeries, recurringPayments } = useContext(FinancialContext)
  const carouselRef = useRef(null)
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [carouselPages, setCarouselPages] = useState(1)
  // Match Spending vs Earnings colors exactly
  const brandPrimary = 'var(--brand-income-hex)'
  const brandSecondary = 'var(--brand-spending-hex)'
  const gradientSolid = 'var(--brand-income-gradient-x)'
  const gradientLight = 'var(--brand-spending-gradient-x)'
  const [alTab, setAlTab] = useState('assets') // 'assets' | 'liabilities'
  const tabIndicator = 'linear-gradient(90deg, #6e7ff1 0%, #735ec6 100%)'
  const [hoverTab, setHoverTab] = useState(null)
  const [animTab, setAnimTab] = useState(null)
  const navigate = useNavigate()

  // Simple drawer stack for smooth left/right page transitions
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [pages, setPages] = useState([]) // [{ title, element }]
  const top = pages[pages.length - 1] || { title: '', element: null }
  const canGoBack = pages.length > 1
  const [navDir, setNavDir] = useState('forward') // 'forward' | 'back'

  const openAccountsDrawer = () => {
    setNavDir('forward')
    setPages([{ title: 'All Accounts', element: (
      <AccountsListDrawer
        accounts={accounts}
        onAccountClick={(acc) => {
          const lastFour = acc?.mask ? String(acc.mask).slice(-4) : ''
          const title = `${acc?.name || 'Account'}${lastFour ? ' ••••' + lastFour : ''}`
          setNavDir('forward')
          setPages(prev => [...prev, { title, element: (
            <div className="relative w-full h-full">
              <AccountDetail account={acc} />
            </div>
          ) }])
        }}
      />
    ) }])
    setDrawerOpen(true)
  }

  const handleBack = () => {
    setNavDir('back')
    setPages(prev => prev.slice(0, -1))
  }

  const handleAccountCardClick = React.useCallback((account) => {
    const lastFour = account?.mask ? String(account.mask).slice(-4) : ''
    const title = `${account?.name || 'Account'}${lastFour ? ' ••••' + lastFour : ''}`
    navigate(`/accounts/${account.id}`)
  }, [])
  const detectNetwork = (nameOrSubtype = '') => {
    const s = (nameOrSubtype || '').toLowerCase()
    if (/(visa)/.test(s)) return 'visa'
    if (/(mastercard|master card|mc)/.test(s)) return 'mastercard'
    if (/(amex|american express)/.test(s)) return 'amex'
    if (/(discover)/.test(s)) return 'discover'
    return 'generic'
  }
  const networkBadge = (network) => {
    // simple text badge; could be replaced by svgs if added later
    const label = network === 'visa' ? 'VISA' : network === 'mastercard' ? 'MASTERCARD' : network === 'amex' ? 'AMEX' : network === 'discover' ? 'DISCOVER' : 'CARD'
    return (
      <span className="text-[12px] font-semibold tracking-widest" style={{ letterSpacing: '0.08em', color: 'rgba(255,255,255,0.92)' }}>{label}</span>
    )
  }
  useEffect(() => {
    const el = carouselRef.current
    if (!el) return
    const CARD_W = 280
    const GAP = 12 // gap-3
    const compute = () => {
      const containerW = el.clientWidth || 1
      const perView = Math.max(1, Math.floor((containerW + GAP) / (CARD_W + GAP)))
      setCarouselPages(Math.max(1, Math.ceil((Array.isArray(accounts)?accounts.length:0) / perView)))
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

  const { totalBalance, topAccounts, monthCategories, spendingThisMonth, spendingLastMonth, assetTotal, liabilityTotal, accountsCount, cashTotal, investTotal, creditTotal, loanTotal } = useMemo(() => {
    const balances = accounts.map(a => ({
      name: a.name || a.subtype || 'Account',
      balance: a.balances?.current || 0,
      logo: a.institution_logo || a.institution?.logo || null,
      type: a.type || a.subtype || ''
    }))
    let total = balances.reduce((s, a) => s + a.balance, 0)
    const top = balances.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance)).slice(0, 2)

    // Assets vs Liabilities using existing utils
    const grouped = groupAccountsByType(accounts || [])
    const cashTotal = (grouped.cash || []).reduce((s, a) => s + getRawBalance(a), 0)
    const investTotal = (grouped.investment || []).reduce((s, a) => s + getRawBalance(a), 0)
    const creditTotal = (grouped.credit || []).reduce((s, a) => s + getRawBalance(a), 0)
    const loanTotal = (grouped.loan || []).reduce((s, a) => s + getRawBalance(a), 0)
    const assetTotal = cashTotal + investTotal
    const liabilityTotal = creditTotal + loanTotal
    const accountsCount = accounts?.length || 0

    // Current month window
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const startThis = new Date(year, month, 1)
    const endThis = new Date(year, month + 1, 1)
    const startPrev = new Date(year, month - 1, 1)
    const endPrev = new Date(year, month, 1)

    // Category totals for THIS month only
    const catTotals = new Map()
    let thisSp = 0
    let lastSp = 0
    for (const t of transactions) {
      if (t.amount < 0) {
        const d = new Date(t.datetime)
        const amt = Math.abs(t.amount)
        if (d >= startThis && d < endThis) {
          thisSp += amt
          const key = t.category_id || t.personal_finance_category?.primary || t.category_name || 'Other'
          const prev = catTotals.get(key) || { id: t.category_id || null, label: t.category_name || t.personal_finance_category?.primary || 'Other', value: 0, color: t.category_color || null }
          catTotals.set(key, {
            ...prev,
            value: prev.value + amt,
            color: prev.color || t.category_color || '#64748b'
          })
        } else if (d >= startPrev && d < endPrev) {
          lastSp += amt
        }
      }
    }
    const monthCategories = Array.from(catTotals.values())
      .sort((a, b) => b.value - a.value)
      .map((c) => ({ ...c, color: c.color || '#64748b' }))

    total = assetTotal - Math.abs(liabilityTotal);
    return { totalBalance: total, topAccounts: top, monthCategories, spendingThisMonth: thisSp, spendingLastMonth: lastSp, assetTotal, liabilityTotal, accountsCount, cashTotal, investTotal, creditTotal, loanTotal }
  }, [accounts, transactions])

  const monthlySeries = useMemo(() => {
    const now = new Date()
    const labels = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      labels.push(d.toLocaleString('en-US', { month: 'short' }))
    }
    const income = Object.fromEntries(labels.map(l => [l, 0]))
    const spend = Object.fromEntries(labels.map(l => [l, 0]))
    for (const t of transactions) {
      const d = new Date(t.datetime)
      if (isNaN(d)) continue
      const l = d.toLocaleString('en-US', { month: 'short' })
      if (!(l in income)) continue
      if (t.amount > 0) income[l] += t.amount
      else spend[l] += Math.abs(t.amount)
    }
    return [
      { id: 'Income', color: '#16a34a', data: labels.map(x => ({ x, y: Math.round(income[x]) })) },
      { id: 'Spending', color: '#6366f1', data: labels.map(x => ({ x, y: Math.round(spend[x]) })) }
    ]
  }, [transactions])

  const recent = useMemo(() => [...transactions].sort((a, b) => new Date(b.datetime) - new Date(a.datetime)).slice(0, 5), [transactions])

  if (loading) return (<div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>)

  // Build segments for bar and list
  const MIN_SEG_PCT = 1.5
  const MAX_BAR_SEGS = 4
  const totalSp = spendingThisMonth || 0
  const ranked = (monthCategories || []).map((c) => ({ ...c, pct: totalSp ? (c.value / totalSp) * 100 : 0 }))
  const barCandidates = ranked.filter((c) => c.pct >= MIN_SEG_PCT).slice(0, MAX_BAR_SEGS)
  const shownSum = barCandidates.reduce((s, c) => s + (c.value || 0), 0)
  const otherValue = Math.max(0, totalSp - shownSum)
  const segs = [
    ...barCandidates.map((c) => ({ label: c.label, value: c.value, color: c.color, id: c.id })),
    ...(otherValue > 0 ? [{ label: 'Other', value: otherValue, color: '#94a3b8' }] : [])
  ]
  const listItems = (ranked || []).slice(0, 3)
  const deltaPct = spendingLastMonth > 0 ? ((spendingThisMonth - spendingLastMonth) / spendingLastMonth) * 100 : 0
  const isPositive = deltaPct < 0

  const goToCategory = (categoryId) => {
    if (!categoryId) return
    const params = new URLSearchParams({ categories: String(categoryId) })
    navigate(`/transactions?${params.toString()}`)
  }

  return (
    <Container size="xl" className="py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Total Balance - gradient theme with stats */}
            <Card
               className="p-0 border"
               elevation="md"
               style={{
                 overflow: 'visible'
               }}
            >
              <div className="p-5 pb-0 flex items-center justify-between">
                 <div className="text-[12px] font-medium flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                   <FaWallet size={14} />
                   <span>Total Balance</span>
                 </div>
                 <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Accounts: {accountsCount}</div>
               </div>
                <div className="px-5 pb-3">
                  <div className="text-[28px] font-medium tracking-[-0.01em] mb-2" style={{ color: 'var(--color-text-secondary)', opacity: 0.95 }}>{formatCurrency(totalBalance)}</div>
                  {/* Tabs: Assets | Liabilities */}
                  <div className="w-full mb-3">
                    <div className="w-full max-w-[360px] mx-auto">
                      <div className="relative">
                        <div className="grid grid-cols-2">
                          <button
                            className={`py-2 text-[12px] ${alTab==='assets' ? 'font-medium' : ''} transition-colors transition-transform text-center cursor-pointer select-none`}
                            style={{ color: alTab==='assets' ? 'var(--color-text-primary)' : 'var(--color-text-muted)', borderRadius: 6 }}
                            onMouseEnter={(e)=>{ e.currentTarget.style.transform='scale(1.03) translateY(-1px)'; }}
                            onMouseLeave={(e)=>{ e.currentTarget.style.transform='none'; }}
                            onMouseDown={(e)=>{ e.currentTarget.style.transform='scale(0.98) translateY(0px)'; }}
                            onMouseUp={(e)=>{ e.currentTarget.style.transform='scale(1.03) translateY(-1px)'; }}
                            onClick={() => setAlTab('assets')}
                          >Assets</button>
                          <button
                            className={`py-2 text-[12px] ${alTab==='liabilities' ? 'font-medium' : ''} transition-colors transition-transform text-center cursor-pointer select-none`}
                            style={{ color: alTab==='liabilities' ? 'var(--color-text-primary)' : 'var(--color-text-muted)', borderRadius: 6 }}
                            onMouseEnter={(e)=>{ e.currentTarget.style.transform='scale(1.03) translateY(-1px)'; }}
                            onMouseLeave={(e)=>{ e.currentTarget.style.transform='none'; }}
                            onMouseDown={(e)=>{ e.currentTarget.style.transform='scale(0.98) translateY(0px)'; }}
                            onMouseUp={(e)=>{ e.currentTarget.style.transform='scale(1.03) translateY(-1px)'; }}
                            onClick={() => setAlTab('liabilities')}
                          >Liabilities</button>
                        </div>
                        {/* Animated bottom border indicator */}
                        <span
                          aria-hidden
                          className="absolute bottom-0 left-0 h-[4px] w-1/2 transition-transform duration-200 ease-out"
                          style={{ background: '#a78bfa', transform: alTab === 'assets' ? 'translateX(0%)' : 'translateX(100%)', boxShadow: '0 0 0 1px rgba(167,139,250,0.25)' }}
                        />
                        <span aria-hidden className="absolute bottom-0 left-0 right-0 h-[1px]" style={{ background: 'var(--color-border-primary)', opacity: 0.7 }} />
                      </div>
                    </div>
                  </div>

                  {/* Segmented bar by active tab */}
                  {alTab === 'assets' ? (
                    <div>
                      <SegmentedBar
                        items={[
                          { label: 'Cash', value: cashTotal, color: brandPrimary, background: brandPrimary },
                          { label: 'Investments', value: investTotal, color: brandSecondary, background: brandSecondary }
                        ]}
                        total={assetTotal}
                        height={12}
                        gap={0}
                        radius={8}
                      />
                      <div className="mt-1 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: brandPrimary }} />
                            Cash
                          </span>
                          <span style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(cashTotal)}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: brandSecondary }} />
                            Investments
                          </span>
                          <span style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(investTotal)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <SegmentedBar
                        items={[
                          { label: 'Credit', value: Math.abs(creditTotal), color: brandPrimary, background: brandPrimary },
                          { label: 'Loans', value: Math.abs(loanTotal), color: brandSecondary, background: brandSecondary }
                        ]}
                        total={Math.abs(liabilityTotal)}
                        height={12}
                        gap={0}
                        radius={8}
                      />
                      <div className="mt-1 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: brandPrimary }} />
                            Credit
                          </span>
                          <span style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(Math.abs(creditTotal))}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: brandSecondary }} />
                            Loans
                          </span>
                          <span style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(Math.abs(loanTotal))}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
            </Card>

            {/* Spending Overview */}
            <Card className="p-0" elevation="md">
              <div className="px-5 pt-5 pb-0 flex items-center justify-between">
                <div className="text-[12px] font-medium flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
                  <FaChartPie size={14} />
                  <span>Spending Overview</span>
                </div>
                <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>This Month</div>
              </div>
              <div className="px-5 pt-2 pb-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-[28px] leading-[28px] font-medium tracking-[-0.01em]" style={{ color: 'var(--color-text-secondary)', opacity: 0.95 }}>{formatCurrency(spendingThisMonth)}</div>
                    <Pill value={Math.abs(deltaPct)} isPositive={isPositive} />
                  </div>
                </div>
                <SegmentedBar items={segs} total={spendingThisMonth} height={16} gap={3} radius={6} onItemClick={(seg) => seg?.id && goToCategory(seg.id)} />
                <div className="space-y-1">
                  {listItems.map((c) => (
                    <div key={c.label} className="grid grid-cols-2 items-center rounded-md px-2 py-1 cursor-pointer transition"
                      style={{ outline: '1px solid transparent' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = hexToRgba(c.color || '#64748b', 0.10); e.currentTarget.style.outline = `1px solid ${hexToRgba(c.color || '#64748b', 0.25)}`; e.currentTarget.style.boxShadow = `inset 3px 0 0 ${hexToRgba(c.color || '#64748b', 0.8)}` }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.outline = '1px solid transparent'; e.currentTarget.style.boxShadow = 'none' }}
                      onClick={() => c?.id && goToCategory(c.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="inline-block w-3 h-3 rounded-full" style={{ background: c.color }} />
                        <span className="text-[12px] truncate" style={{ color: 'var(--color-text-secondary)' }}>{c.label}</span>
                      </div>
                      <div className="text-right text-[12px] font-medium" style={{ color: 'var(--color-text-primary)', opacity: 0.92, fontVariantNumeric: 'tabular-nums' }}>
                        {formatCurrency(c.value)}
                        <span className="ml-2" style={{ color: 'var(--color-text-muted)' }}>({((c.value / totalSp) * 100 || 0).toFixed(1)}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Spending vs Earnings */}
          <Card className="p-0" elevation="md">
            <div className="p-5 pb-0 flex items-center justify-between">
              <div className="text-[12px] font-medium flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
                <FaChartBar size={14} />
                <span>Spending vs Earnings</span>
              </div>
              <div className="flex items-center gap-4 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full" style={{ background: 'var(--brand-income-hex)' }} />
                  <span>Income</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full" style={{ background: 'var(--brand-spending-hex)' }} />
                  <span>Spending</span>
                </div>
              </div>
            </div>
            <div className="px-2 pb-4 flex items-center justify-center">
              <SpendingEarningChart 
                series={spendingEarningSeries || monthlySeries} 
                height={320}
                onSelectMonth={({ startDate, endDate }) => {
                  const params = new URLSearchParams()
                  params.set('dateRange', 'custom')
                  params.set('start_date', startDate)
                  params.set('end_date', endDate)
                  navigate(`/transactions?${params.toString()}`)
                }}
              />
            </div>
          </Card>

          <Card className="p-0" elevation="md">
            <div className="p-5 pb-0 flex items-center justify-between">
              <div className="text-[12px] font-medium flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
                <FaReceipt size={14} />
                <span>Recent Transactions</span>
              </div>
              <button
                type="button"
                className="text-[11px] font-medium px-2 py-1 rounded-sm cursor-pointer"
                style={{ color: 'var(--color-text-secondary)', background: 'transparent' }}
                onClick={() => navigate('/transactions')}
                onMouseEnter={(e)=>{ e.currentTarget.style.textDecoration='underline'; e.currentTarget.style.color='var(--color-text-primary)'; }}
                onMouseLeave={(e)=>{ e.currentTarget.style.textDecoration='none'; e.currentTarget.style.color='var(--color-text-secondary)'; }}
              >View all</button>
            </div>
            <div className="px-3 pt-3 pb-3">
              {recent.map((t, i) => {
                const isPositiveAmount = t.amount > 0
                const color = t.category_color || '#64748b'
                return (
                  <div
                    key={t.id || i}
                    className="flex items-center justify-between py-3 px-3 transition-colors"
                    style={{ borderTop: i === 0 ? 'none' : '1px solid var(--color-border-primary)', cursor: 'pointer', outline: '1px solid transparent' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = hexToRgba(color, 0.10); e.currentTarget.style.outline = `1px solid ${hexToRgba(color, 0.25)}`; e.currentTarget.style.boxShadow = `inset 3px 0 0 ${hexToRgba(color, 0.8)}` }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.outline = '1px solid transparent'; e.currentTarget.style.boxShadow = 'none' }}
                    onClick={() => navigate('/transactions')}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: t.icon_url ? 'transparent' : (t.category_color || 'var(--color-bg-secondary)') }}>
                        {t.icon_url ? (
                          <img src={t.icon_url} alt="icon" className="w-full h-full object-cover rounded-full" />
                        ) : t.category_icon_lib && t.category_icon_name ? (
                          <CategoryIcon lib={t.category_icon_lib} name={t.category_icon_name} size={14} color={'var(--color-text-white)'} />
                        ) : (
                          <FaReceipt size={14} style={{ color: 'var(--color-text-white)' }} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] truncate" style={{ color: 'var(--color-text-primary)' }}>{t.merchant_name || t.description || 'Transaction'}</div>
                        <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{formatDate(t.datetime)}</div>
                      </div>
                    </div>
                    <div className="text-right text-[13px] font-medium w-[110px]" style={{ color: isPositiveAmount ? 'var(--color-success)' : 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{isPositiveAmount ? '+' : ''}{formatCurrency(Math.abs(t.amount))}</div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          {/* Accounts card with carousel */}
          <Card className="p-0" elevation="md">
            <div className="p-5 pb-0 flex items-center justify-between">
              <div className="text-[12px] font-medium flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
                <FaWallet size={14} />
                <span>Accounts</span>
              </div>
              <button
                type="button"
                className="text-[11px] font-medium px-2 py-1 rounded-sm cursor-pointer"
                style={{ color: 'var(--color-text-secondary)', background: 'transparent' }}
                onClick={openAccountsDrawer}
                onMouseEnter={(e)=>{ e.currentTarget.style.textDecoration='underline'; e.currentTarget.style.color='var(--color-text-primary)'; }}
                onMouseLeave={(e)=>{ e.currentTarget.style.textDecoration='none'; e.currentTarget.style.color='var(--color-text-secondary)'; }}
              >View all</button>
            </div>
            <div className="px-3 pt-4 pb-4"><AccountCardsCarousel accounts={accounts} onCardClick={handleAccountCardClick} /></div>
          </Card>
          <Card className="p-0" elevation="md">
            <div className="p-5 pb-0"><div className="text-[12px] font-medium flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}><FaCalendarAlt size={14} /><span>Payment Schedule</span></div></div>
            <div className="px-3 pt-3 pb-3">
              {(recurringPayments && recurringPayments.length > 0 ? recurringPayments.slice(0,5) : []).map((p, i) => (
                <div
                  key={p.key + i}
                  className="flex items-center justify-between py-3 px-4 border-top transition-colors duration-150"
                  style={{ borderTop: i === 0 ? 'none' : '1px solid var(--color-border-primary)', cursor: 'default', outline: '1px solid transparent' }}
                  onMouseEnter={(e) => {
                    const color = p.categoryColor || '#64748b'
                    e.currentTarget.style.background = hexToRgba(color, 0.10)
                    e.currentTarget.style.outline = `1px solid ${hexToRgba(color, 0.25)}`
                    e.currentTarget.style.boxShadow = `inset 3px 0 0 ${hexToRgba(color, 0.8)}`
                  }}
                  onMouseLeave={(e) => { 
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.outline = '1px solid transparent'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center" style={{ background: p.imageUrl ? 'transparent' : (p.categoryColor || 'var(--color-bg-secondary)') }}>
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt="icon" className="w-full h-full object-cover" />
                      ) : p.categoryIconLib && p.categoryIconName ? (
                        <CategoryIcon lib={p.categoryIconLib} name={p.categoryIconName} size={14} color={'var(--color-text-white)'} />
                      ) : (
                        <FaCalendarAlt size={14} style={{ color: 'var(--color-text-white)' }} />
                      )}
                    </div>
                    <div>
                      <div className="text-[13px]" style={{ color: 'var(--color-text-primary)' }}>{p.label}</div>
                      <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Due {formatDate(p.nextDate)}</div>
                    </div>
                  </div>
                  <div className="text-[13px] font-medium" style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(p.averageAmount)}</div>
                </div>
              ))}
              {(!recurringPayments || recurringPayments.length === 0) && recent.map((t, i) => (
                <div
                  key={t.id || i}
                  className="flex items-center justify-between py-3 px-4 border-top transition-colors duration-150"
                  style={{ borderTop: i === 0 ? 'none' : '1px solid var(--color-border-primary)', cursor: 'default', outline: '1px solid transparent' }}
                  onMouseEnter={(e) => { 
                    const color = t.category_color || '#64748b'
                    e.currentTarget.style.background = hexToRgba(color, 0.10)
                    e.currentTarget.style.outline = `1px solid ${hexToRgba(color, 0.25)}`
                    e.currentTarget.style.boxShadow = `inset 3px 0 0 ${hexToRgba(color, 0.8)}`
                  }}
                  onMouseLeave={(e) => { 
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.outline = '1px solid transparent'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center" style={{ background: t.icon_url ? 'transparent' : (t.category_color || 'var(--color-bg-secondary)') }}>
                      {t.icon_url ? (
                        <img src={t.icon_url} alt="icon" className="w-full h-full object-cover" />
                      ) : t.category_icon_lib && t.category_icon_name ? (
                        <CategoryIcon lib={t.category_icon_lib} name={t.category_icon_name} size={14} color={'var(--color-text-white)'} />
                      ) : (
                        <FaCalendarAlt size={14} style={{ color: 'var(--color-text-white)' }} />
                      )}
                    </div>
                    <div>
                      <div className="text-[13px]" style={{ color: 'var(--color-text-primary)' }}>{t.merchant_name || t.description || 'Payment'}</div>
                      <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{formatDate(t.datetime)}</div>
                    </div>
                  </div>
                  <div className="text-[13px] font-medium" style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(Math.abs(t.amount))}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-0" elevation="md">
            <div className="p-5 pb-0"><div className="text-[12px] font-medium flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}><FaPiggyBank size={14} /><span>My Savings Plan</span></div></div>
            <div className="px-5 pb-5 space-y-4">
              {[{ name: 'Financial Saving', current: 8000, goal: 20000, color: '#22c55e' }, { name: 'Retirement Plan', current: 5000, goal: 20000, color: '#6366f1' }, { name: 'Education Plan', current: 800, goal: 1000, color: '#f59e0b' }].map((p) => (
                <div key={p.name} className="p-3 rounded-lg border" style={{ borderColor: 'var(--color-border-primary)', background: 'var(--color-bg-secondary)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[12px]" style={{ color: 'var(--color-text-primary)' }}>{p.name}</div>
                    <div className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>{Math.round((p.current / p.goal) * 100)}%</div>
                  </div>
                  <div className="text-[11px] mb-2" style={{ color: 'var(--color-text-muted)' }}>{formatCurrency(p.current)}/{formatCurrency(p.goal)}</div>
                  <ProgressBar value={p.current} max={p.goal} color={p.color} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
      <SimpleDrawer
        isOpen={drawerOpen}
        stack={pages}
        onClose={() => { setDrawerOpen(false); setPages([]) }}
        onBack={handleBack}
      />
    </Container>
  )
} 