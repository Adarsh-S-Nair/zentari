// components/SummaryStat.jsx
function SummaryStat({ label, value, diff = null }) {
  const isPositive = diff && diff >= 0

  // Format number as currency: $11,234.56
  const formatCurrency = val => {
    if (typeof val === 'number') {
      return `$${val.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`
    }
    return val
  }

  return (
    <div className="flex flex-col items-center">
      <div
        style={{
          fontSize: '12px',
          fontWeight: 500,
          color: '#6b7280',
          minWidth: 'max-content',
          textAlign: 'center'
        }}
      >
        {label}
      </div>

      <div className="flex items-center gap-[4px] mt-[2px]">
        <div
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#1f2937'
          }}
        >
          {formatCurrency(value)}
        </div>

        {diff !== null && (
          <div
            style={{
              fontSize: '10px',
              padding: '2px 5px',
              borderRadius: '9999px',
              fontWeight: 500,
              backgroundColor: isPositive ? '#dcfce7' : '#fee2e2',
              color: isPositive ? '#16a34a' : '#dc2626'
            }}
          >
            {isPositive ? '+' : ''}
            {diff.toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  )
}

export default SummaryStat
