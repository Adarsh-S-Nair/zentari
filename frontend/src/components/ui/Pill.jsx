function Pill({ value, isPositive, isZero = false, type = 'percentage', customText, customBgColor, customTextColor }) {
  let bgColor, textColor, displayValue

  // Ensure value is a string for comparison
  const valueStr = String(value || '').toLowerCase()

  if (type === 'position') {
    // For position badges (Long/Short) - using same colors as P&L pills
    bgColor = customBgColor || (valueStr === 'long' ? 'var(--color-position-long-bg)' : 'var(--color-position-short-bg)')
    textColor = customTextColor || (valueStr === 'long' ? 'var(--color-position-long)' : 'var(--color-position-short)')
    displayValue = value?.toUpperCase() || customText || 'N/A'
  } else if (type === 'status') {
    // For status badges (Open/Closed)
    bgColor = customBgColor || 'var(--color-status-open-bg)'
    textColor = customTextColor || 'var(--color-status-open)'
    displayValue = customText || value || 'N/A'
  } else if (type === 'action') {
    // For action badges (Buy/Sell)
    bgColor = customBgColor || (valueStr === 'buy' ? 'var(--color-action-buy-bg)' : 'var(--color-action-sell-bg)')
    textColor = customTextColor || (valueStr === 'buy' ? 'var(--color-action-buy)' : 'var(--color-action-sell)')
    displayValue = value?.toUpperCase() || customText || 'N/A'
  } else {
    // Default percentage behavior
    if (isZero) {
      bgColor = 'var(--color-gray-100)' // light gray
      textColor = 'var(--color-text-muted)' // neutral gray
    } else {
      bgColor = isPositive ? 'var(--color-success-bg)' : 'var(--color-danger-bg)'
      textColor = isPositive ? 'var(--color-success)' : 'var(--color-danger)'
    }
    displayValue = typeof value === 'number' && isFinite(value) ? value.toFixed(1) : '--'
  }

  // Ensure we always have valid colors
  bgColor = bgColor || 'var(--color-gray-100)'
  textColor = textColor || 'var(--color-text-muted)'
  displayValue = displayValue || 'N/A'

  const baseStyles = {
    fontSize: '10px',
    padding: (type === 'position' || type === 'action') ? '2px 12px' : '2px 6px',
    borderRadius: '9999px',
    fontWeight: 500,
    textAlign: 'center',
    backgroundColor: bgColor,
    color: textColor,
    textTransform: type === 'position' || type === 'action' ? 'uppercase' : 'none',
    display: 'inline-block',
    minWidth: 'fit-content',
    // Ensure background color is properly applied
    background: bgColor
  }

  // Add margin only for percentage pills
  if (type === 'percentage') {
    baseStyles.marginLeft = '6px'
  }

  return (
    <div style={baseStyles}>
      {type === 'percentage' && !isZero && isPositive ? '+' : ''}
      {displayValue}
      {type === 'percentage' ? '%' : ''}
    </div>
  )
}

export default Pill
