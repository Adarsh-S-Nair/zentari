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

export const getTotal = (accounts) => {
  return accounts?.reduce((sum, acc) => sum + getRawBalance(acc), 0) || 0
}

export const getRawBalance = (account) => {
  if (!account) return 0
  return account.balances?.current || account.balance || 0
}

export const getDisplayBalance = (account) => {
  const balance = getRawBalance(account)
  // For credit accounts, show positive balance as negative (since it's debt)
  if (account.type?.toLowerCase() === 'credit') {
    return -balance
  }
  return balance
} 