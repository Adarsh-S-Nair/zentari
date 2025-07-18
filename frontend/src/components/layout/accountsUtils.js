import { FiDollarSign, FiCreditCard, FiTrendingUp, FiHome } from 'react-icons/fi'
import { FaUniversity } from 'react-icons/fa'

export const getAccountTypeIcon = (type) => {
  const iconMap = {
    'cash': { icon: FiDollarSign, color: '#16a34a' }, // Green for cash
    'credit': { icon: FiCreditCard, color: '#dc2626' }, // Red for credit
    'investment': { icon: FiTrendingUp, color: '#3b82f6' }, // Blue for investments
    'loan': { icon: FiHome, color: '#f59e0b' } // Orange for loans
  }
  return iconMap[type.toLowerCase()] || { icon: FaUniversity, color: '#6b7280' }
}

export const groupAccountsByType = (accounts) => {
  const grouped = {
    cash: [],
    credit: [],
    investment: [],
    loan: []
  }
  accounts?.forEach(acc => {
    const type = acc.type?.toLowerCase()
    // Map Plaid account types to our simplified types
    if (type === 'depository') {
      grouped.cash.push(acc)
    } else if (grouped[type]) {
      grouped[type].push(acc)
    }
  })
  return grouped
}

export const getTotal = (accs) => accs.reduce((sum, acc) => sum + (acc.balances?.current || 0), 0)

// Extract raw balance from a single account
export const getRawBalance = (account) => {
  const balance = account?.balances?.current || 0;
  // Display balances as-is without negation
  return balance;
}

// Get balance for display purposes
export const getDisplayBalance = (account) => {
  const balance = account?.balances?.current || 0;
  // Display balances as-is without negation
  return balance;
}

export const getActiveTabAccounts = (grouped, activeTab) => {
  if (!grouped) return []
  
  switch (activeTab) {
    case 'cash':
      return grouped.cash || []
    case 'credit':
      return grouped.credit || []
    case 'investment':
      return grouped.investment || []
    case 'loan':
      return grouped.loan || []
    default:
      return grouped.cash || []
  }
}

export const getActiveTabLabel = (activeTab) => {
  switch (activeTab) {
    case 'cash':
      return 'Cash'
    case 'credit':
      return 'Credit Cards'
    case 'investment':
      return 'Investments'
    case 'loan':
      return 'Loans'
    default:
      return 'Cash'
  }
} 