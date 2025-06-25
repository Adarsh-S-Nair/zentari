/**
 * Format currency values with proper negative sign placement
 * @param {number} value - The value to format
 * @param {string} currency - Currency code (default: 'USD')
 * @param {number} minDigits - Minimum fraction digits (default: 2)
 * @param {number} maxDigits - Maximum fraction digits (default: 2)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value, currency = 'USD', minDigits = 2, maxDigits = 2) => {
  if (value === null || value === undefined || isNaN(value)) return '-'
  
  const absValue = Math.abs(value)
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits
  }).format(absValue)
  
  // Handle negative values properly
  return value < 0 ? `-${formatted}` : formatted
}

/**
 * Format date strings to a readable format
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @param {string} format - Format type ('short', 'long', 'month')
 * @returns {string} Formatted date string
 */
export const formatDate = (dateStr, format = 'short') => {
  if (!dateStr) return '-'
  
  const date = new Date(dateStr + 'T00:00:00Z')
  
  switch (format) {
    case 'long':
      return new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC'
      }).format(date)
    case 'month':
      return new Intl.DateTimeFormat('en-US', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC'
      }).format(date)
    case 'short':
    default:
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC'
      }).format(date)
  }
}

/**
 * Format share quantities
 * @param {number} shares - Number of shares
 * @param {number} decimals - Number of decimal places (default: 4)
 * @returns {string} Formatted shares string
 */
export const formatShares = (shares, decimals = 4) => {
  if (shares === null || shares === undefined || isNaN(shares)) return '-'
  return shares.toFixed(decimals)
}

/**
 * Format percentage values
 * @param {number} value - Percentage value
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value, decimals = 2) => {
  if (value === null || value === undefined || isNaN(value)) return '-'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}

/**
 * Format large numbers with abbreviations (K, M, B)
 * @param {number} value - The number to format
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted number string
 */
export const formatLargeNumber = (value, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) return '-'
  
  const absValue = Math.abs(value)
  let formatted = ''
  
  if (absValue >= 1e9) {
    formatted = `${(absValue / 1e9).toFixed(decimals)}B`
  } else if (absValue >= 1e6) {
    formatted = `${(absValue / 1e6).toFixed(decimals)}M`
  } else if (absValue >= 1e3) {
    formatted = `${(absValue / 1e3).toFixed(decimals)}K`
  } else {
    formatted = absValue.toFixed(decimals)
  }
  
  return value < 0 ? `-${formatted}` : formatted
}

/**
 * Format duration in days
 * @param {number} days - Number of days
 * @returns {string} Formatted duration string
 */
export const formatDuration = (days) => {
  if (days === null || days === undefined || isNaN(days)) return '-'
  return `${days} day${days !== 1 ? 's' : ''}`
} 