import React from 'react'

function LoadingBar({ currentDate, startDate, endDate, label = "Running simulation" }) {
  if (!currentDate || !endDate) return null

  const parseDate = (d) => new Date(`${d}T00:00:00Z`)

  const end = parseDate(endDate)
  const current = parseDate(currentDate)

  const start = startDate ? parseDate(startDate) : new Date(end)
  if (!startDate) start.setMonth(start.getMonth() - 12)

  const totalDays = (end - start) / (1000 * 60 * 60 * 24)
  const elapsedDays = (current - start) / (1000 * 60 * 60 * 24)

  const progress = Math.min(Math.max(elapsedDays / totalDays, 0), 1)
  const progressPercent = Math.round(progress * 100)

  const formatDate = (date) =>
    date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        width: '100%',
        maxWidth: '420px',
        padding: '0 20px',
        fontFamily: '"Inter", system-ui, sans-serif'
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: '13px',
            fontWeight: '500',
            color: 'var(--color-text-muted)',
            marginBottom: '4px',
            lineHeight: '1.4',
            letterSpacing: '0.01em'
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--color-text-muted)',
            lineHeight: '1.4',
            fontWeight: '500'
          }}
        >
          {formatDate(current)} → {formatDate(end)}
        </div>
      </div>

      {/* Bar */}
      <div
        style={{
          width: '100%',
          height: '8px',
          backgroundColor: 'var(--color-gray-100)',
          borderRadius: '9999px',
          border: '1px solid var(--color-border-primary)',
          overflow: 'hidden',
          boxShadow: 'inset 0 1px 2px var(--color-shadow-light)'
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progressPercent}%`,
            minWidth: '8px',
            background: 'linear-gradient(90deg, var(--color-primary), var(--color-primary-light))',
            borderRadius: '9999px',
            transition: 'width 0.3s ease-out',
            boxShadow: '0 0 4px rgba(59, 130, 246, 0.3)'
          }}
        />
      </div>

      {/* Footer Text */}
      <div
        style={{
          fontSize: '11px',
          color: 'var(--color-text-muted)',
          fontWeight: '500',
          letterSpacing: '0.01em'
        }}
      >
        {progressPercent}% complete
      </div>
    </div>
  )
}

export default LoadingBar
