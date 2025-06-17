function Pill({ value, isPositive, isZero = false }) {
  let bgColor, textColor

  if (isZero) {
    bgColor = '#f3f4f6' // light gray
    textColor = '#6b7280' // neutral gray
  } else {
    bgColor = isPositive ? '#dcfce7' : '#fee2e2'
    textColor = isPositive ? '#16a34a' : '#dc2626'
  }

  const displayValue =
    typeof value === 'number' && isFinite(value) ? value.toFixed(1) : '--'

  return (
    <div
      style={{
        fontSize: '10px',
        padding: '2px 6px',
        borderRadius: '9999px',
        fontWeight: 500,
        width: '48px',
        textAlign: 'center',
        backgroundColor: bgColor,
        color: textColor,
        marginLeft: '6px'
      }}
    >
      {!isZero && isPositive ? '+' : ''}
      {displayValue}%
    </div>
  )
}

export default Pill
