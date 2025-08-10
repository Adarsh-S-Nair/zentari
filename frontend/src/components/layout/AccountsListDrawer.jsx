import React, { useMemo, useEffect, useState, useContext } from 'react'
import { formatCurrency } from '../../utils/formatters'
import { groupAccountsByType, getRawBalance } from './accountsUtils'
import CategoryIcon from '../ui/CategoryIcon'
import { FinancialContext } from '../../contexts/FinancialContext'

function SegBar({ pctA = 0, pctB = 0, height = 12 }) {
  const a = Math.max(0, Math.min(100, pctA))
  const b = Math.max(0, Math.min(100, pctB))
  const rest = Math.max(0, 100 - a - b)
  return (
    <div
      className="w-full overflow-hidden"
      style={{ height, borderRadius: 8, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', display: 'flex' }}
    >
      <div style={{ width: `${a}%`, background: 'rgba(255,255,255,0.95)', borderTopLeftRadius: 8, borderBottomLeftRadius: 8 }} />
      <div style={{ width: `${b}%`, background: 'rgba(255,255,255,0.35)' }} />
      {rest > 0 && <div style={{ width: `${rest}%`, background: 'transparent' }} />}
    </div>
  )
}

function Legend({ aLabel, aValue, bLabel, bValue }) {
  const dot = (alpha) => ({ display: 'inline-block', width: 8, height: 8, borderRadius: 9999, background: `rgba(255,255,255,${alpha})`, marginRight: 6 })
  return (
    <div className="flex items-center justify-between text-[11px] mt-1">
      <div className="flex items-center gap-2 opacity-95">
        <span style={dot(0.95)} />
        <span>{aLabel}: {aValue}</span>
      </div>
      <div className="flex items-center gap-2 opacity-85">
        <span style={dot(0.35)} />
        <span>{bLabel}: {bValue}</span>
      </div>
    </div>
  )
}

function AccountRow({ account, onClick }) {
  const lastFour = account?.mask ? String(account.mask).slice(-4) : ''
  const balance = getRawBalance(account)
  const color = account?.institution_color || account?.category_color || '#64748b'
  return (
    <div
      className="flex items-center justify-between py-2 px-2 rounded-md transition-colors duration-150"
      style={{ cursor: 'pointer' }}
      onClick={() => onClick?.(account)}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-hover-secondary)'; e.currentTarget.style.boxShadow = 'inset 3px 0 0 rgba(167,139,250,0.80)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.boxShadow = 'none' }}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: account.institution_logo ? 'transparent' : color }}>
          {account.institution_logo ? (
            <img src={account.institution_logo} alt="logo" className="w-full h-full object-cover" />
          ) : (
            <CategoryIcon lib={'fa'} name={'FaWallet'} size={14} color={'var(--color-text-white)'} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] truncate" style={{ color: 'var(--color-text-primary)' }}>
            {account.name || account.subtype || 'Account'}{lastFour ? ` ••••${lastFour}` : ''}
          </div>
          <div className="text-[11px] truncate" style={{ color: 'var(--color-text-muted)' }}>
            {account.institution_name || account.institution?.name || account.subtype || '—'}
          </div>
        </div>
      </div>
      <div className="text-right text-[13px] font-medium ml-4 flex-shrink-0" style={{ color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
        {formatCurrency(balance)}
      </div>
    </div>
  )
}

function MiniSparkline({ series = [], height = 40 }) {
  const [d, setD] = useState('')
  useEffect(() => {
    if (!series || series.length === 0) { setD(''); return }
    const vals = series.map(p => p.total)
    const min = Math.min(...vals)
    const max = Math.max(...vals)
    const pad = 2
    const w = 160
    const h = height
    const scaleX = (i) => (i / Math.max(1, series.length - 1)) * (w - pad * 2) + pad
    const scaleY = (v) => {
      if (max === min) return h / 2
      return h - ((v - min) / (max - min)) * (h - pad * 2) - pad
    }
    let path = ''
    series.forEach((p, i) => {
      const x = scaleX(i)
      const y = scaleY(p.total)
      path += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`
    })
    setD(path)
  }, [series, height])
  return (
    <svg width={160} height={height} style={{ overflow: 'visible' }}>
      <path d={d} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function Section({ title, count = 0, accounts, onAccountClick, total }) {
  return (
    <div
      className="p-0 rounded-lg border"
      style={{ borderColor: 'var(--color-border-primary)', background: 'var(--color-bg-secondary)' }}
    >
      <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--color-border-primary)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-[12px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>{title}</div>
            <span className="inline-flex items-center justify-center text-[10px] font-medium px-1.5 h-4 min-w-[16px] rounded-full"
              style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border-primary)', color: 'var(--color-text-secondary)' }}>
              {count}
            </span>
          </div>
          <div className="text-[12px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>{formatCurrency(total)}</div>
        </div>
      </div>
      <div className="p-2">
        {(accounts || []).map((a, i) => (
          <div key={a.id || i}>
            <AccountRow account={a} onAccountClick={onAccountClick} onClick={onAccountClick} />
            {i < (accounts?.length || 0) - 1 && (
              <div className="h-px" style={{ background: 'var(--color-border-primary)', marginLeft: 44 }} />
            )}
          </div>
        ))}
        {(accounts || []).length === 0 && (
          <div className="text-[12px] py-2" style={{ color: 'var(--color-text-muted)' }}>No accounts</div>
        )}
      </div>
    </div>
  )
}

export default function AccountsListDrawer({ accounts = [], onAccountClick }) {
  const { grouped, totals, counts } = useMemo(() => {
    const grouped = groupAccountsByType(accounts || [])
    const sum = list => (list || []).reduce((s, a) => s + getRawBalance(a), 0)
    const totals = {
      cash: sum(grouped.cash),
      investment: sum(grouped.investment),
      credit: Math.abs(sum(grouped.credit)),
      loan: Math.abs(sum(grouped.loan))
    }
    const counts = {
      cash: (grouped.cash || []).length,
      investment: (grouped.investment || []).length,
      credit: (grouped.credit || []).length,
      loan: (grouped.loan || []).length,
      all: accounts.length
    }
    return { grouped, totals, counts }
  }, [accounts])

  const net = totals.cash + totals.investment - totals.credit - totals.loan
  const { user, fetchAccountValueSeries, accountValueSeries } = useContext(FinancialContext)
  const [series, setSeries] = useState([])
  useEffect(() => {
    const run = async () => {
      if (!user?.id) return
      const s = await fetchAccountValueSeries(user.id)
      setSeries(s || [])
    }
    run()
  }, [user?.id])

  const assets = totals.cash + totals.investment
  const liabilities = totals.credit + totals.loan
  const assetsPct = assets + liabilities > 0 ? Math.round((assets / (assets + liabilities)) * 100) : 0
  const liabilitiesPct = 100 - assetsPct

  return (
    <div className="w-full" style={{ color: 'var(--color-text-primary)' }}>
      {/* Sections */}
      <div className="px-4 pt-4 pb-5 space-y-3" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
        <Section title={`Cash`} count={counts.cash} accounts={grouped.cash} total={totals.cash} onAccountClick={onAccountClick} />
        <Section title={`Investments`} count={counts.investment} accounts={grouped.investment} total={totals.investment} onAccountClick={onAccountClick} />
        <Section title={`Credit`} count={counts.credit} accounts={grouped.credit} total={totals.credit} onAccountClick={onAccountClick} />
        <Section title={`Loans`} count={counts.loan} accounts={grouped.loan} total={totals.loan} onAccountClick={onAccountClick} />
      </div>
    </div>
  )
} 