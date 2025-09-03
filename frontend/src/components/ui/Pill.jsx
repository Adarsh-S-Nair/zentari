function Pill({ value, isPositive, isZero = false, type = 'percentage', customText, customBgColor, customTextColor, width, onClick, style, ...props }) {
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
    if (isZero && !customBgColor) {
      bgColor = 'var(--color-warning-bg)'
      textColor = 'var(--color-warning)'
    } else {
      bgColor = customBgColor || (isPositive ? 'var(--color-success-bg)' : 'var(--color-danger-bg)')
      textColor = customTextColor || (isPositive ? 'var(--color-success)' : 'var(--color-danger)')
    }
    // Use customText if provided, otherwise use the value
    displayValue = customText || (typeof value === 'number' && isFinite(value) ? value.toFixed(1) : '--')
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
    width: width || 'auto',
    // Ensure background color is properly applied
    background: bgColor,
    transition: 'all 0.2s ease',
    transform: 'scale(1)',
    ...style
  }

  const Component = onClick ? 'button' : 'div'

  const handleMouseEnter = (e) => {
    if (onClick) {
      e.currentTarget.style.transform = 'scale(1.05)'
      e.currentTarget.style.filter = 'brightness(1.1)'
    }
  }

  const handleMouseLeave = (e) => {
    if (onClick) {
      e.currentTarget.style.transform = 'scale(1)'
      e.currentTarget.style.filter = 'brightness(1)'
    }
  }

  return (
    <Component 
      style={baseStyles} 
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {type === 'percentage' && !isZero && isPositive && !customText ? '+' : ''}
      {displayValue}
      {type === 'percentage' && !customText ? '%' : ''}
    </Component>
  )
}

export default Pill
