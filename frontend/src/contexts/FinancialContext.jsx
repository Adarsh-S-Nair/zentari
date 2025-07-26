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
      
      // Build query parameters
      const params = new URLSearchParams({
        limit: '100',
        offset: '0'
      })
      
      // Add category filter if provided
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
      
      if (result.success) {
        const filteredTransactions = result.transactions || []
        
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
          const now = new Date()
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          
          processedTransactions = processedTransactions.filter(txn => {
            const txnDate = new Date(txn.datetime)
            switch (filters.dateRange) {
              case 'today':
                return txnDate >= today
              case 'week':
                const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
                return txnDate >= weekAgo
              case 'month':
                const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())
                return txnDate >= monthAgo
              case 'quarter':
                const quarterAgo = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate())
                return txnDate >= quarterAgo
              case 'year':
                const yearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
                return txnDate >= yearAgo
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
      setToast
    }}>
      {children}
    </FinancialContext.Provider>
  )
}

export { FinancialContext }; 