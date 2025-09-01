import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useFinancial } from './FinancialContext'

const PortfolioContext = createContext(null)

export function usePortfolio() {
  const ctx = useContext(PortfolioContext)
  if (!ctx) throw new Error('usePortfolio must be used within a PortfolioProvider')
  return ctx
}

export function PortfolioProvider({ children }) {
  const { user, portfolio: finPortfolio, fetchPortfolio } = useFinancial()

  // Cache by portfolioId
  const positionsCacheRef = useRef(new Map())
  const ordersCacheRef = useRef(new Map())

  const [portfolio, setPortfolio] = useState(null)
  const [portfolioLoading, setPortfolioLoading] = useState(false)

  const [positions, setPositions] = useState([])
  const [positionsLoading, setPositionsLoading] = useState(false)

  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  const [llmStatus, setLlmStatus] = useState({ status: 'unknown', step: 'Idle' })

  const base = useMemo(() => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'localhost:8000'
    const protocol = window.location.protocol === 'https:' ? 'https' : 'http'
    const clean = baseUrl.replace(/^https?:\/\//,'')
    return { protocol, clean }
  }, [])

  // Sync portfolio from FinancialContext; load if missing
  useEffect(() => {
    const init = async () => {
      if (!user?.id) { setPortfolio(null); return }
      if (finPortfolio) { setPortfolio(finPortfolio); return }
      setPortfolioLoading(true)
      try { const p = await fetchPortfolio(user.id); setPortfolio(p) } finally { setPortfolioLoading(false) }
    }
    init()
  }, [user?.id, finPortfolio])

  // Load positions and orders when portfolio becomes available
  useEffect(() => {
    const load = async () => {
      const pfId = portfolio?.id
      if (!pfId) return
      // Positions
      const cachedPos = positionsCacheRef.current.get(pfId)
      if (cachedPos) setPositions(cachedPos)
      setPositionsLoading(true)
      try {
        const resp = await fetch(`${base.protocol}://${base.clean}/database/portfolios/${pfId}/positions`)
        const data = await resp.json().catch(()=>({}))
        const rows = Array.isArray(data?.positions) ? data.positions : []
        positionsCacheRef.current.set(pfId, rows)
        setPositions(rows)
      } catch { setPositions([]) } finally { setPositionsLoading(false) }

      // Orders
      const cachedOrd = ordersCacheRef.current.get(pfId)
      if (cachedOrd) setOrders(cachedOrd)
      setOrdersLoading(true)
      try {
        const resp = await fetch(`${base.protocol}://${base.clean}/database/portfolios/${pfId}/orders`)
        const data = await resp.json().catch(()=>({}))
        const rows = Array.isArray(data?.orders) ? data.orders : []
        ordersCacheRef.current.set(pfId, rows)
        setOrders(rows)
      } catch { setOrders([]) } finally { setOrdersLoading(false) }
    }
    load()
  }, [portfolio?.id])

  // Poll LLM status while running
  useEffect(() => {
    let timer = null
    let cancelled = false
    const poll = async () => {
      const pfId = portfolio?.id
      if (!pfId) return
      try {
        const resp = await fetch(`${base.protocol}://${base.clean}/database/portfolios/${pfId}/llm-status`)
        const data = await resp.json().catch(()=>({}))
        const status = data?.status || 'unknown'
        const step = data?.step || 'Idle'
        if (!cancelled) setLlmStatus({ status, step })
        if (status === 'running') {
          timer = setTimeout(poll, 1500)
        } else if (status === 'done') {
          // refresh positions, orders, and portfolio (cash) once
          refreshPositions()
          refreshOrders()
          try {
            if (user?.id && typeof fetchPortfolio === 'function') {
              await fetchPortfolio(user.id)
            }
          } catch {}
        }
      } catch {
        if (!cancelled) setLlmStatus({ status: 'unknown', step: 'Idle' })
      }
    }
    if (portfolio?.id) poll()
    return () => { cancelled = true; if (timer) clearTimeout(timer) }
  }, [portfolio?.id])

  const refreshPositions = async () => {
    const pfId = portfolio?.id
    if (!pfId) return
    setPositionsLoading(true)
    try {
      const resp = await fetch(`${base.protocol}://${base.clean}/database/portfolios/${pfId}/positions`)
      const data = await resp.json().catch(()=>({}))
      const rows = Array.isArray(data?.positions) ? data.positions : []
      positionsCacheRef.current.set(pfId, rows)
      setPositions(rows)
    } catch { setPositions([]) } finally { setPositionsLoading(false) }
  }

  const refreshOrders = async () => {
    const pfId = portfolio?.id
    if (!pfId) return
    setOrdersLoading(true)
    try {
      const resp = await fetch(`${base.protocol}://${base.clean}/database/portfolios/${pfId}/orders`)
      const data = await resp.json().catch(()=>({}))
      const rows = Array.isArray(data?.orders) ? data.orders : []
      ordersCacheRef.current.set(pfId, rows)
      setOrders(rows)
    } catch { setOrders([]) } finally { setOrdersLoading(false) }
  }

  const value = {
    // data
    portfolio, portfolioLoading,
    positions, positionsLoading,
    orders, ordersLoading,
    llmStatus,
    // actions
    refreshPortfolio: async () => { if (user?.id) { setPortfolioLoading(true); try { const p = await fetchPortfolio(user.id); setPortfolio(p) } finally { setPortfolioLoading(false) } } },
    refreshPositions,
    refreshOrders,
  }

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  )
}



