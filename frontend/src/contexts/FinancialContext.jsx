import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

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
  const [loading, setLoading] = useState(false)
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        fetchAccounts(user.id)
        fetchTransactions(user.id)
      }
    }
    getUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      if (session?.user) {
        fetchAccounts(session.user.id)
        fetchTransactions(session.user.id)
      } else {
        setAccounts([])
        setTransactions([])
      }
    })

    return () => subscription.unsubscribe()
  }, [])

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
        setAccounts(result.accounts || [])
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
    if (!userId) return
    
    setTransactionsLoading(true)
    
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'localhost:8000'
      const protocol = window.location.protocol === 'https:' ? 'https' : 'http'
      
      // Ensure baseUrl doesn't already have a protocol
      const cleanBaseUrl = baseUrl.replace(/^https?:\/\//, '')
      const fullUrl = `${protocol}://${cleanBaseUrl}/database/user-transactions/${userId}?limit=1000`
      
      const response = await fetch(fullUrl)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        setTransactions(result.transactions || [])
      } else {
        throw new Error(result.error || 'Failed to fetch transactions')
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
      setTransactions([])
    } finally {
      setTransactionsLoading(false)
    }
  }

  const refreshAccounts = () => {
    if (user) {
      fetchAccounts(user.id)
    }
  }

  const refreshTransactions = () => {
    if (user) {
      fetchTransactions(user.id)
    }
  }

  const addAccounts = (newAccounts) => {
    setAccounts(prev => [...prev, ...newAccounts])
  }

  const value = {
    accounts,
    transactions,
    loading,
    transactionsLoading,
    error,
    user,
    refreshAccounts,
    refreshTransactions,
    addAccounts,
    fetchAccounts,
    fetchTransactions,
    setToast
  }

  return (
    <FinancialContext.Provider value={value}>
      {children}
    </FinancialContext.Provider>
  )
} 