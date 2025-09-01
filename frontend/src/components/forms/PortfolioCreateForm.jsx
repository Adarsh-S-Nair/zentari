import React, { useState } from 'react'
import ToggleTabs from '../ui/ToggleTabs'
import Dropdown from '../ui/Dropdown'
import Button from '../ui/Button'
import NumericInput from '../ui/NumericInput'
import { useFinancial } from '../../contexts/FinancialContext'

export default function PortfolioCreateForm({ onClose }) {
  const [name, setName] = useState('My Portfolio')
  const [startingBalance, setStartingBalance] = useState(10000)
  const [mode, setMode] = useState('PAPER')
  const [cadence, setCadence] = useState('weekly')
  const [submitting, setSubmitting] = useState(false)
  const { user, fetchPortfolio, setToast } = useFinancial()

  const canSubmit = !!name?.trim() && Number.isInteger(startingBalance) && startingBalance >= 10

  const computeNextDue = (cad) => {
    try {
      const now = new Date()
      const c = String(cad || 'weekly').toLowerCase()
      const d = new Date(now)
      if (c === 'daily') {
        d.setDate(d.getDate() + 1)
      } else if (c === 'weekly') {
        d.setDate(d.getDate() + 7)
      } else if (c === 'monthly') {
        d.setMonth(d.getMonth() + 1)
      } else if (c === 'quarterly') {
        d.setMonth(d.getMonth() + 3)
      } else {
        d.setDate(d.getDate() + 7)
      }
      // Set to 14:30 local just to avoid midnight DST edge cases
      d.setHours(14, 30, 0, 0)
      return d.toISOString()
    } catch {
      return new Date(Date.now() + 7*24*60*60*1000).toISOString()
    }
  }

  const handleCreate = async () => {
    if (!canSubmit || !user?.id || submitting) return
    try {
      setSubmitting(true)
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'localhost:8000'
      const protocol = window.location.protocol === 'https:' ? 'https' : 'http'
      const cleanBaseUrl = baseUrl.replace(/^https?:\/\//, '')
      const url = `${protocol}://${cleanBaseUrl}/database/portfolios`
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          name: name.trim(),
          starting_balance: startingBalance,
          is_paper: mode === 'PAPER',
          rebalance_cadence: String(cadence || 'weekly').toLowerCase(),
          schedule_tz: 'America/New_York',
          next_rebalance_due: computeNextDue(cadence),
          last_rebalanced_at: null
        })
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        throw new Error(err?.detail || `HTTP ${resp.status}`)
      }
      const data = await resp.json()
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to create portfolio')
      }
      // Refresh context portfolio (keeps GPT panel showing spinner via polling)
      await fetchPortfolio(user.id)
      if (setToast) setToast({ type: 'success', message: 'Portfolio created. Initial trades are being prepared...' })
      onClose && onClose()
    } catch (e) {
      console.error('Create portfolio error:', e)
      if (setToast) setToast({ type: 'error', message: String(e.message || e) })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4">
      <div className="text-[13px] mb-4" style={{ color: 'var(--color-text-secondary)' }}>
        Set up a paper trading portfolio. This form is a placeholder for now.
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <div className="text-[12px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>Name</div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-md border bg-transparent text-sm"
            style={{ borderColor: 'var(--color-input-border)', color: 'var(--color-text-primary)' }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 items-end">
          <div>
            <div className="text-[12px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>Starting Balance</div>
            <NumericInput
              value={startingBalance}
              onChange={setStartingBalance}
              min={10}
            />
          </div>
          <div>
            <div className="text-[12px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>Mode</div>
            <ToggleTabs
              options={[{ label: 'Paper', value: 'PAPER' }, { label: 'Live', value: 'LIVE', disabled: true }]}
              value={mode}
              onChange={setMode}
              activeStyles={{ PAPER: { background: 'var(--color-gradient-primary)', color: 'var(--color-text-white)' } }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Dropdown
              label="Rebalance Cadence"
              name="rebalance_cadence"
              value="weekly"
              onChange={() => {}} // No-op since only weekly is supported
              options={[
                { label: 'Weekly', value: 'weekly' }
              ]}
              disabled={true}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-4">
        <Button label="Cancel" color="white" className="px-3 py-2 text-[12px]" onClick={onClose} />
        <Button 
          label="Create" 
          color="networth" 
          className="px-3 py-2 text-[12px]" 
          disabled={!canSubmit}
          loading={submitting}
          onClick={handleCreate}
        />
      </div>
    </div>
  )
}


