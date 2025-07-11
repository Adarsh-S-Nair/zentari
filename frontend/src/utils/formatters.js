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
 * @param {string} dateStr - Date string in YYYY-MM-DD or ISO datetime format
 * @param {string} format - Format type ('short', 'long', 'month')
 * @returns {string} Formatted date string
 */
export const formatDate = (dateStr, format = 'short') => {
  if (!dateStr) return '-'
  
  const date = new Date(dateStr)
  
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

/**
 * Format last updated timestamp to relative time
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted relative time string
 */
export const formatLastUpdated = (dateString) => {
  if (!dateString) return null
  const date = new Date(dateString)
  const now = new Date()
  const diffInMinutes = (now - date) / (1000 * 60)
  
  if (diffInMinutes < 1) {
    return 'Just now'
  } else if (diffInMinutes < 60) {
    const minutes = Math.floor(diffInMinutes)
    return `${minutes}m ago`
  } else if (diffInMinutes < 1440) { // 24 hours
    const hours = Math.floor(diffInMinutes / 60)
    return `${hours}h ago`
  } else if (diffInMinutes < 10080) { // 7 days
    const days = Math.floor(diffInMinutes / 1440)
    return `${days}d ago`
  } else {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }
}

// Capitalize the first letter of each word
export function capitalizeWords(str) {
  if (!str) return '';
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Convert string to proper title case (e.g., "in_store" -> "In Store")
 * @param {string} str - String to convert
 * @returns {string} Title cased string
 */
export function toTitleCase(str) {
  return str?.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase()) ?? '';
}