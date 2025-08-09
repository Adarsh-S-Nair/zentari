import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { getApiBaseUrl } from '../utils/api';

const FinancialContext = createContext()

export const useFinancial = () => {
  const context = useContext(FinancialContext)
  if (!context) {
    throw new Error('useFinancial must be used within a FinancialProvider')
  }
  return context
}

export const FinancialProvider = ({ children, setToast }) => {
  const [accounts, setAccounts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [user, setUser] = useState(null)
  const [plaidItems, setPlaidItems] = useState({})
  
  // Cache for instant UI rendering
  const [accountsCache, setAccountsCache] = useState({})
  const [transactionsCache, setTransactionsCache] = useState({})
  const [categoriesCache, setCategoriesCache] = useState(null)
  const [plaidItemsCache, setPlaidItemsCache] = useState({})
  
  // Loading states for background updates
  const [accountsUpdating, setAccountsUpdating] = useState(false)
  const [transactionsUpdating, setTransactionsUpdating] = useState(false)
  const [categoriesUpdating, setCategoriesUpdating] = useState(false)
  const [plaidItemsUpdating, setPlaidItemsUpdating] = useState(false)
  
  // Progressive loading states
  const [hasMoreTransactions, setHasMoreTransactions] = useState(true)
  const [transactionsPage, setTransactionsPage] = useState(1)
  const [isLoadingMoreTransactions, setIsLoadingMoreTransactions] = useState(false)
  // Aggregated series for dashboard charts (last 6 months)
  const [spendingEarningSeries, setSpendingEarningSeries] = useState(null)
  const [spendingEarningLoading, setSpendingEarningLoading] = useState(false)
  // Recurring payments (detected client-side over ~4 months)
  const [recurringPayments, setRecurringPayments] = useState([])
  const [recurringLoading, setRecurringLoading] = useState(false)
  // Full transaction cache for global search
  const [allTransactions, setAllTransactions] = useState([])
  const [allTransactionsLoading, setAllTransactionsLoading] = useState(false)
  // Time series of total account value (from snapshots)
  const [accountValueSeries, setAccountValueSeries] = useState(null)
  const [accountValueSeriesLoading, setAccountValueSeriesLoading] = useState(false)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        // Load cached data instantly
        loadCachedData(user.id)
        // Then fetch fresh data in background (but not transactions initially)
        fetchInitialDataInBackground(user.id)
      }
    }
    getUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      if (session?.user) {
        // Load cached data instantly
        loadCachedData(session.user.id)
        // Then fetch fresh data in background (but not transactions initially)
        fetchInitialDataInBackground(session.user.id)
      } else {
        // Clear all data on logout
        setAccounts([])
        setTransactions([])
        setCategories([])
        setPlaidItems({})
        setAccountsCache({})
        setTransactionsCache({})
        setCategoriesCache(null)
        setPlaidItemsCache({})
        setHasMoreTransactions(true)
        setTransactionsPage(1)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Load cached data instantly for instant UI rendering
  const loadCachedData = (userId) => {
    // Load accounts from cache
    if (accountsCache[userId]) {
      setAccounts(accountsCache[userId])
    }
    
    // Load recent transactions from cache (only first page)
    if (transactionsCache[userId] && transactionsCache[userId][1]) {
      setTransactions(transactionsCache[userId][1] || [])
    }
    
    // Load categories from cache (global)
    if (categoriesCache) {
      setCategories(categoriesCache)
    }
    
    // Load plaid items from cache
    if (plaidItemsCache[userId]) {
      setPlaidItems(plaidItemsCache[userId])
    }
  }

  // Fetch initial data in background (accounts, categories, plaid items, but NOT transactions)
  const fetchInitialDataInBackground = async (userId) => {
    // Fetch accounts in background
    setAccountsUpdating(true)
    fetchAccounts(userId).finally(() => setAccountsUpdating(false))
    
    // Fetch categories in background
    setCategoriesUpdating(true)
    fetchCategories().finally(() => setCategoriesUpdating(false))
    
    // Fetch plaid items in background
    setPlaidItemsUpdating(true)
    fetchPlaidItems(userId).finally(() => setPlaidItemsUpdating(false))
    
    // Load recent transactions in background (not blocking)
    loadRecentTransactions(userId)

    // Build spending vs earning aggregates in background
    buildSpendingEarningAggregates(userId)

    // Detect recurring payments in background
    buildRecurringPayments(userId)

    // Load all transactions in background for global search
    loadAllTransactions(userId)
  }

  // Load recent transactions (last 30 days) without blocking UI
  const loadRecentTransactions = async (userId) => {
    if (!userId) return
    
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'localhost:8000'
      const protocol = window.location.protocol === 'https:' ? 'https' : 'http'
      const cleanBaseUrl = baseUrl.replace(/^https?:\/\//, '')
      
      // Get date 30 days ago
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const dateString = thirtyDaysAgo.toISOString().split('T')[0]
      
      const fullUrl = `${protocol}://${cleanBaseUrl}/database/user-transactions/${userId}?limit=100&start_date=${dateString}`
      
      const response = await fetch(fullUrl)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        const recentTransactions = result.transactions || []
        setTransactions(recentTransactions)
        // Update cache for page 1 (recent transactions)
        setTransactionsCache(prev => ({ 
          ...prev, 
          [userId]: { 
            ...prev[userId], 
            1: recentTransactions 
          } 
        }))
        setHasMoreTransactions(recentTransactions.length === 100)
      } else {
        throw new Error(result.error || 'Failed to fetch recent transactions')
      }
    } catch (error) {
      console.error('Error fetching recent transactions:', error)
      setTransactions([])
    }
  }

  // Load more transactions on demand
  const loadMoreTransactions = async (userId) => {
    if (!userId || !hasMoreTransactions || isLoadingMoreTransactions) return
    
    setIsLoadingMoreTransactions(true)
    
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'localhost:8000'
      const protocol = window.location.protocol === 'https:' ? 'https' : 'http'
      const cleanBaseUrl = baseUrl.replace(/^https?:\/\//, '')
      
      const nextPage = transactionsPage + 1
      const offset = (nextPage - 1) * 100
      
      const fullUrl = `${protocol}://${cleanBaseUrl}/database/user-transactions/${userId}?limit=100&offset=${offset}`
      
      const response = await fetch(fullUrl)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        const newTransactions = result.transactions || []
        
        // Combine with existing transactions
        setTransactions(prev => [...prev, ...newTransactions])
        
        // Update cache
        setTransactionsCache(prev => ({ 
          ...prev, 
          [userId]: { 
            ...prev[userId], 
            [nextPage]: newTransactions 
          } 
        }))
        
        setTransactionsPage(nextPage)
        setHasMoreTransactions(newTransactions.length === 100)
      } else {
        throw new Error(result.error || 'Failed to fetch more transactions')
      }
    } catch (error) {
      console.error('Error fetching more transactions:', error)
    } finally {
      setIsLoadingMoreTransactions(false)
    }
  }

  const buildSpendingEarningAggregates = async (userId) => {
    if (!userId) return
    try {
      setSpendingEarningLoading(true)
      // Prepare last 6 month labels (e.g., ['Jan','Feb',...])
      const now = new Date()
      const labels = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        labels.push(d.toLocaleString('en-US', { month: 'short' }))
      }
      const income = Object.fromEntries(labels.map(l => [l, 0]))
      const spend = Object.fromEntries(labels.map(l => [l, 0]))

      // Fetch pages without storing raw transactions in state
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'localhost:8000'
      const protocol = window.location.protocol === 'https:' ? 'https' : 'http'
      const cleanBaseUrl = baseUrl.replace(/^https?:\/\//, '')

      const limit = 500
      let offset = 0
      // Safety cap to avoid excessive requests
      const maxPages = 200
      let page = 0
      while (page < maxPages) {
        const url = `${protocol}://${cleanBaseUrl}/database/user-transactions/${userId}?limit=${limit}&offset=${offset}`
        const resp = await fetch(url)
        if (!resp.ok) {
          break
        }
        const result = await resp.json()
        const batch = result?.transactions || []
        if (!batch.length) break
        for (const t of batch) {
          const d = new Date(t.datetime)
          if (isNaN(d)) continue
          const lbl = d.toLocaleString('en-US', { month: 'short' })
          if (!(lbl in income)) continue
          if (t.amount > 0) income[lbl] += t.amount
          else spend[lbl] += Math.abs(t.amount)
        }
        if (batch.length < limit) break
        offset += limit
        page += 1
        // Yield to UI
        // eslint-disable-next-line no-await-in-loop
        await new Promise(r => setTimeout(r, 0))
      }

      setSpendingEarningSeries([
        { id: 'Income', color: '#16a34a', data: labels.map(x => ({ x, y: Math.round(income[x]) })) },
        { id: 'Spending', color: '#6366f1', data: labels.map(x => ({ x, y: Math.round(spend[x]) })) }
      ])
    } catch (e) {
      console.error('Error building spending/earning aggregates:', e)
      setSpendingEarningSeries(null)
    } finally {
      setSpendingEarningLoading(false)
    }
  }

  const buildRecurringPayments = async (userId) => {
    if (!userId) return
    try {
      setRecurringLoading(true)
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'localhost:8000'
      const protocol = window.location.protocol === 'https:' ? 'https' : 'http'
      const cleanBaseUrl = baseUrl.replace(/^https?:\/\//, '')

      const normalize = (str) => {
        if (!str) return ''
        let s = String(str).toLowerCase()
        // remove typical noise
        s = s.replace(/ach hold|ach|ppd|des:|co id:|id:|indn:|conf#|conf\b|trx\b|visa|debit|credit|pos|msp/gi, '')
        // remove numbers and extra spaces
        s = s.replace(/[0-9]/g, ' ').replace(/\s+/g, ' ').trim()
        return s
      }
      const banned = /(nsf|fee|overdraft|charge|atm|interest|transfer|zelle|venmo|cash app|apple cash|refund|reversal)/i

      const limit = 500
      let offset = 0
      const maxPages = 200
      const now = new Date()
      const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      cutoff.setDate(cutoff.getDate() - 130)

      const keyToTxns = new Map()

      for (let page = 0; page < maxPages; page++) {
        const url = `${protocol}://${cleanBaseUrl}/database/user-transactions/${userId}?limit=${limit}&offset=${offset}`
        const resp = await fetch(url)
        if (!resp.ok) break
        const result = await resp.json()
        const batch = result?.transactions || []
        if (!batch.length) break
        for (const t of batch) {
          // only expenses and within last ~130 days
          if (!(t?.amount < 0)) continue
          const d = new Date(t.datetime)
          if (isNaN(d) || d < cutoff) continue
          const label = t.merchant_name || t.description || 'Payment'
          if (banned.test(label)) continue
          const key = normalize(label)
          // skip too generic keys
          if (!key || key.length < 4 || key.split(' ').length < 1) continue
          const accId = t.accounts?.account_id || t.account_id || 'unknown'
          const composite = `${accId}::${key}`
          const arr = keyToTxns.get(composite) || []
          arr.push({ date: d, amount: Math.abs(t.amount), raw: t, label, accountId: accId })
          keyToTxns.set(composite, arr)
        }
        if (batch.length < limit) break
        offset += limit
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 0))
      }

      const candidates = []
      for (const [composite, arr] of keyToTxns.entries()) {
        if (arr.length < 3) continue
        // sort by date ascending
        arr.sort((a, b) => a.date - b.date)
        // compute gaps in days
        const gaps = []
        for (let i = 1; i < arr.length; i++) {
          const ms = arr[i].date - arr[i - 1].date
          gaps.push(ms / (1000 * 60 * 60 * 24))
        }
        if (!gaps.length) continue
        const median = gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)]
        // detect monthly cadence ~28-33 days
        const isMonthly = median >= 27 && median <= 33
        // optionally detect biweekly/weekly later
        if (!isMonthly) continue
        // amount stability within 20%
        const amts = arr.map(x => x.amount)
        const avg = amts.reduce((s, v) => s + v, 0) / amts.length
        const within = amts.filter(v => Math.abs(v - avg) / avg <= 0.2).length >= Math.max(3, Math.floor(arr.length * 0.6))
        if (!within) continue
        const last = arr[arr.length - 1]
        // next date = last date + round(median) days, roll forward if in past
        let next = new Date(last.date)
        const step = Math.round(Math.min(31, Math.max(28, median)))
        next.setDate(next.getDate() + step)
        while (next < now) {
          next.setDate(next.getDate() + step)
        }
        candidates.push({
          key: composite,
          label: last.label,
          cadence: 'Monthly',
          averageAmount: Math.round(avg),
          lastDate: last.date.toISOString(),
          nextDate: next.toISOString(),
          imageUrl: last.raw?.icon_url || null,
          categoryColor: last.raw?.category_color || null,
          categoryIconLib: last.raw?.category_icon_lib || null,
          categoryIconName: last.raw?.category_icon_name || null
        })
      }

      candidates.sort((a, b) => new Date(a.nextDate) - new Date(b.nextDate))
      setRecurringPayments(candidates.slice(0, 10))
    } catch (e) {
      console.error('Error building recurring payments:', e)
      setRecurringPayments([])
    } finally {
      setRecurringLoading(false)
    }
  }

  const loadAllTransactions = async (userId) => {
    if (!userId) return
    try {
      setAllTransactionsLoading(true)
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'localhost:8000'
      const protocol = window.location.protocol === 'https:' ? 'https' : 'http'
      const cleanBaseUrl = baseUrl.replace(/^https?:\/\//, '')
      const limit = 500
      let offset = 0
      const maxPages = 400
      let collected = []
      for (let page = 0; page < maxPages; page++) {
        const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
        const url = `${protocol}://${cleanBaseUrl}/database/user-transactions/${userId}?${params.toString()}`
        const resp = await fetch(url)
        if (!resp.ok) break
        const result = await resp.json()
        const batch = result?.transactions || []
        if (!batch.length) break
        collected = collected.concat(batch)
        if (batch.length < limit) break
        offset += limit
        // eslint-disable-next-line no-await-in-loop
        await new Promise(r => setTimeout(r, 0))
      }
      // Sort desc by datetime for consistency
      collected.sort((a, b) => new Date(b.datetime) - new Date(a.datetime))
      setAllTransactions(collected)
    } catch (e) {
      console.error('Error loading all transactions:', e)
      setAllTransactions([])
    } finally {
      setAllTransactionsLoading(false)
    }
  }

  const fetchAccounts = async (userId) => {
    if (!userId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'localhost:8000'
      const protocol = window.location.protocol === 'https:' ? 'https' : 'http'
      
      // Ensure baseUrl doesn't already have a protocol
      const cleanBaseUrl = baseUrl.replace(/^https?:\/\//, '')
      const fullUrl = `${protocol}://${cleanBaseUrl}/database/user-accounts/${userId}`
      
      const response = await fetch(fullUrl)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        const freshAccounts = result.accounts || []
        setAccounts(freshAccounts)
        // Update cache
        setAccountsCache(prev => ({ ...prev, [userId]: freshAccounts }))
      } else {
        throw new Error(result.error || 'Failed to fetch accounts')
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
      setError(error.message)
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }

  const fetchTransactions = async (userId) => {
    // This is now replaced by loadRecentTransactions and loadMoreTransactions
    // Keep for backward compatibility but redirect to recent transactions
    return loadRecentTransactions(userId)
  }

  const fetchFilteredTransactions = async (userId, filters = {}) => {
    if (!userId) return
    
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'localhost:8000'
      const protocol = window.location.protocol === 'https:' ? 'https' : 'http'
      const cleanBaseUrl = baseUrl.replace(/^https?:\/\//, '')
      
      // Helper for date boundaries
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      let rangeStart = null
      let rangeEnd = null
      if (filters.dateRange && filters.dateRange !== 'all') {
        switch (filters.dateRange) {
          case 'today':
            rangeStart = today; rangeEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999); break
          case 'week':
            rangeStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000); rangeEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999); break
          case 'month':
            rangeStart = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()); rangeEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999); break
          case 'quarter':
            rangeStart = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate()); rangeEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999); break
          case 'year':
            rangeStart = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()); rangeEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999); break
          case 'custom':
            if (filters.customStartDate) rangeStart = new Date(filters.customStartDate)
            if (filters.customEndDate) rangeEnd = new Date(filters.customEndDate + 'T23:59:59.999')
            break
          default: break
        }
      }
      
      // If a date range is applied, page through results so we don't miss older months
      let fetched = []
      if (rangeStart || rangeEnd) {
        const limit = 500
        let offset = 0
        const maxPages = 200
        for (let page = 0; page < maxPages; page++) {
          const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
          if (filters.categories && filters.categories.length > 0) {
            params.append('category_ids', filters.categories.join(','))
          }
          const pageUrl = `${protocol}://${cleanBaseUrl}/database/user-transactions/${userId}?${params.toString()}`
          const resp = await fetch(pageUrl)
          if (!resp.ok) break
          const pageResult = await resp.json()
          const batch = pageResult?.transactions || []
          if (!batch.length) break
          fetched = fetched.concat(batch)
          // Early break when the oldest txn in this page is older than start, assuming desc order
          if (rangeStart) {
            let oldest = null
            for (const t of batch) {
              const d = new Date(t.datetime)
              if (!isNaN(d.getTime())) {
                if (oldest === null || d < oldest) oldest = d
              }
            }
            if (oldest && oldest < rangeStart) {
              // Next pages will be older; stop
              break
            }
          }
          if (batch.length < limit) break
          offset += limit
          // yield
          // eslint-disable-next-line no-await-in-loop
          await new Promise(r => setTimeout(r, 0))
        }
      } else {
        // No explicit date range: fetch first page
        const params = new URLSearchParams({ limit: '100', offset: '0' })
        if (filters.categories && filters.categories.length > 0) {
          params.append('category_ids', filters.categories.join(','))
        }
        const fullUrl = `${protocol}://${cleanBaseUrl}/database/user-transactions/${userId}?${params.toString()}`
        const response = await fetch(fullUrl)
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`)
        }
        const result = await response.json()
        if (!result.success) throw new Error(result.error || 'Failed to fetch transactions')
        fetched = result.transactions || []
      }
      
      if (fetched) {
        const filteredTransactions = fetched
         
        // Apply additional client-side filters
        let processedTransactions = filteredTransactions
         
        // Filter by transaction type (income/expense)
        if (filters.transactionType && filters.transactionType !== 'all') {
          processedTransactions = processedTransactions.filter(txn => {
            if (filters.transactionType === 'income') return txn.amount > 0
            if (filters.transactionType === 'expense') return txn.amount < 0
            return true
          })
        }
         
        // Filter by search query
        if (filters.searchQuery && filters.searchQuery.trim()) {
          const query = filters.searchQuery.toLowerCase().trim()
          processedTransactions = processedTransactions.filter(txn =>
            txn.description?.toLowerCase().includes(query) ||
            txn.merchant_name?.toLowerCase().includes(query)
          )
        }
         
        // Filter by amount range
        if (filters.amountRange && filters.amountRange !== 'all') {
          processedTransactions = processedTransactions.filter(txn => {
            const amount = Math.abs(txn.amount)
            switch (filters.amountRange) {
              case 'small': return amount < 50
              case 'medium': return amount >= 50 && amount <= 500
              case 'large': return amount > 500
              default: return true
            }
          })
        }
         
        // Filter by date range (client-side for now)
        if (filters.dateRange && filters.dateRange !== 'all') {
          processedTransactions = processedTransactions.filter(txn => {
            const txnDate = new Date(txn.datetime)
            switch (filters.dateRange) {
              case 'today':
                return rangeStart ? txnDate >= rangeStart : true
              case 'week':
                return rangeStart ? txnDate >= rangeStart : true
              case 'month':
                return rangeStart ? txnDate >= rangeStart : true
              case 'quarter':
                return rangeStart ? txnDate >= rangeStart : true
              case 'year':
                return rangeStart ? txnDate >= rangeStart : true
              case 'custom':
                if (!rangeStart && !rangeEnd) return true
                if (rangeStart && txnDate < rangeStart) return false
                if (rangeEnd && txnDate > rangeEnd) return false
                return true
              default:
                return true
            }
          })
        }
         
        return processedTransactions
      } else {
        throw new Error(result.error || 'Failed to fetch filtered transactions')
      }
    } catch (error) {
      console.error('Error fetching filtered transactions:', error)
      return []
    }
  }

  const fetchCategories = async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'localhost:8000'
      const protocol = window.location.protocol === 'https:' ? 'https' : 'http'
      
      // Ensure baseUrl doesn't already have a protocol
      const cleanBaseUrl = baseUrl.replace(/^https?:\/\//, '')
      const fullUrl = `${protocol}://${cleanBaseUrl}/database/categories`
      
      const response = await fetch(fullUrl)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        const freshCategories = result.categories || []
        setCategories(freshCategories)
        // Update cache (categories are global)
        setCategoriesCache(freshCategories)
      } else {
        throw new Error(result.error || 'Failed to fetch categories')
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
      setCategories([])
    }
  }

  const fetchPlaidItems = async (userId) => {
    if (!userId) return
    
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'localhost:8000'
      const protocol = window.location.protocol === 'https:' ? 'https' : 'http'
      
      // Ensure baseUrl doesn't already have a protocol
      const cleanBaseUrl = baseUrl.replace(/^https?:\/\//, '')
      const fullUrl = `${protocol}://${cleanBaseUrl}/database/user-plaid-items/${userId}`
      
      const response = await fetch(fullUrl)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        const freshPlaidItems = result.plaid_items || {}
        setPlaidItems(freshPlaidItems)
        // Update cache
        setPlaidItemsCache(prev => ({ ...prev, [userId]: freshPlaidItems }))
      } else {
        throw new Error(result.error || 'Failed to fetch plaid items')
      }
    } catch (error) {
      console.error('Error fetching plaid items:', error)
      setPlaidItems({})
    }
  }

  const fetchAccountValueSeries = async (userId, { startDate = null, endDate = null } = {}) => {
    if (!userId) return []
    try {
      setAccountValueSeriesLoading(true)
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'localhost:8000'
      const protocol = window.location.protocol === 'https:' ? 'https' : 'http'
      const cleanBaseUrl = baseUrl.replace(/^https?:\/\//, '')
      const params = new URLSearchParams()
      if (startDate) params.set('start_date', startDate)
      if (endDate) params.set('end_date', endDate)
      const url = `${protocol}://${cleanBaseUrl}/database/user-account-snapshots/${userId}${params.toString() ? '?' + params.toString() : ''}`
      const resp = await fetch(url)
      const data = await resp.json()
      const series = data?.series || []
      setAccountValueSeries(series)
      return series
    } catch (e) {
      console.error('Error fetching account value series:', e)
      setAccountValueSeries([])
      return []
    } finally {
      setAccountValueSeriesLoading(false)
    }
  }

  const refreshAccounts = () => {
    if (user?.id) {
      fetchAccounts(user.id)
    }
  }

  const refreshTransactions = () => {
    if (user?.id) {
      // Reset to page 1 and load recent transactions
      setTransactionsPage(1)
      setHasMoreTransactions(true)
      loadRecentTransactions(user.id)
    }
  }

  const addAccounts = (newAccounts) => {
    setAccounts(prev => [...prev, ...newAccounts])
  }

  const updateTransactionCategory = async (transactionId, categoryId) => {
    if (!transactionId) return false
    
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'localhost:8000'
      const protocol = window.location.protocol === 'https:' ? 'https' : 'http'
      
      // Ensure baseUrl doesn't already have a protocol
      const cleanBaseUrl = baseUrl.replace(/^https?:\/\//, '')
      const fullUrl = `${protocol}://${cleanBaseUrl}/database/transactions/${transactionId}/category`
      
      const response = await fetch(fullUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ category_id: categoryId }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        // Update local state optimistically
        setTransactions(prev => 
          prev.map(txn => 
            txn.id === transactionId 
              ? { 
                  ...txn, 
                  category_id: categoryId,
                  category_name: result.category_name,
                  category_color: result.category_color,
                  category_icon_lib: result.category_icon_lib,
                  category_icon_name: result.category_icon_name
                }
              : txn
          )
        )
        
        // Update cache
        if (user?.id && transactionsCache[user.id]) {
          setTransactionsCache(prev => ({
            ...prev,
            [user.id]: Object.keys(prev[user.id]).reduce((acc, page) => {
              acc[page] = prev[user.id][page].map(txn => 
                txn.id === transactionId 
                  ? { 
                      ...txn, 
                      category_id: categoryId,
                      category_name: result.category_name,
                      category_color: result.category_color,
                      category_icon_lib: result.category_icon_lib,
                      category_icon_name: result.category_icon_name
                    }
                  : txn
              )
              return acc
            }, {})
          }))
        }
        
        return true
      } else {
        throw new Error(result.error || 'Failed to update transaction category')
      }
    } catch (error) {
      console.error('Error updating transaction category:', error)
      if (setToast) {
        setToast({ type: 'error', message: error.message })
      }
      return false
    }
  }

  return (
    <FinancialContext.Provider value={{
      accounts,
      transactions,
      categories,
      loading,
      transactionsLoading,
      spendingEarningSeries,
      spendingEarningLoading,
      recurringPayments,
      recurringLoading,
      allTransactions,
      allTransactionsLoading,
      accountValueSeries,
      accountValueSeriesLoading,
      error,
      user,
      plaidItems,
      // Background loading states
      accountsUpdating,
      transactionsUpdating,
      categoriesUpdating,
      plaidItemsUpdating,
      // Progressive loading states
      hasMoreTransactions,
      isLoadingMoreTransactions,
      // Methods
      refreshAccounts,
      refreshTransactions,
      addAccounts,
      updateTransactionCategory,
      fetchAccounts,
      fetchTransactions,
      fetchCategories,
      fetchPlaidItems,
      loadMoreTransactions,
      fetchFilteredTransactions,
      // Expose builder if we need to force a refresh
      buildSpendingEarningAggregates,
      buildRecurringPayments,
      loadAllTransactions,
      fetchAccountValueSeries,
      setToast
    }}>
      {children}
    </FinancialContext.Provider>
  )
}

export { FinancialContext }; 