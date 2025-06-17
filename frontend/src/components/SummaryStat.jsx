import Pill from './Pill'

function SummaryStat({ label, value, diff = null, isCurrency = false, alignLeft = false }) {
  const isPositive = diff > 0
  const isZero = diff === 0

  const formatCurrency = val => {
    if (typeof val === 'number') {
      return `$${val.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`
    }
    return val
  }

  const formattedValue =
    typeof value === 'number' && isCurrency ? formatCurrency(value) : value

  return (
    <div className={`flex flex-col ${alignLeft ? 'items-start' : 'items-center'}`}>
      <div
        style={{
          fontSize: '12px',
          fontWeight: 500,
          color: '#6b7280',
          minWidth: 'max-content',
          textAlign: alignLeft ? 'left' : 'center',
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
          {formattedValue}
        </div>

        {diff !== null && (
          <Pill value={diff} isPositive={isPositive} isZero={isZero} />
        )}
      </div>
    </div>
  )
}

export default SummaryStat
