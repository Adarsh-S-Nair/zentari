import React, { useState } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'

function CollapsibleSidebar({ form, handleChange, handleSubmit, error, loading }) {
  const [isOpen, setIsOpen] = useState(true)

  const groupedFields = [
    [
      { label: 'Start Date', name: 'start_date', type: 'date' },
      { label: 'End Date', name: 'end_date', type: 'date' }
    ],
    [
      { label: 'Lookback Months', name: 'lookback_months', type: 'number' },
      { label: 'Skip Recent Months', name: 'skip_recent_months', type: 'number' }
    ],
    [
      { label: 'Hold Months', name: 'hold_months', type: 'number' },
      { label: 'Top N Stocks', name: 'top_n', type: 'number' }
    ],
    [
      { label: 'Starting Value ($)', name: 'starting_value', type: 'number' },
      { label: 'Benchmark Ticker', name: 'benchmark', type: 'text' }
    ]
  ]

  return (
    <div
      className="transition-all duration-300 flex flex-col items-start"
      style={{
        height: '100vh',
        backgroundColor: '#1f2937',
        width: isOpen ? '260px' : '36px',
        padding: isOpen ? '16px' : '6px',
        boxShadow: '12px 100px 24px rgba(0, 0, 0, 0.26)',
        fontFamily: '"Inter", system-ui, sans-serif',
        color: '#f3f4f6',
        position: 'relative',
        zIndex: 10
      }}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        style={{
          background: 'none',
          border: 'none',
          color: '#9ca3af',
          cursor: 'pointer',
          alignSelf: isOpen ? 'flex-end' : 'center',
          marginBottom: '20px',
          padding: '4px',
          borderRadius: '4px'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#f3f4f6')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#9ca3af')}
      >
        {isOpen ? <FiChevronLeft size={20} /> : <FiChevronRight size={18} />}
      </button>

      {isOpen && (
        <form className="flex flex-col w-full" style={{ gap: '16px' }}>
          {groupedFields.map((group, i) => (
            <div key={i} className="flex justify-between gap-[12px]">
              {group.map(({ label, name, type }) => (
                <div key={name} style={{ width: 'calc(50% - 6px)' }}>
                  <label
                    className="text-[11px] font-medium mb-[4px]"
                    style={{ color: '#d1d5db' }}
                  >
                    {label}
                  </label>
                  <input
                    type={type}
                    name={name}
                    value={form[name]}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      height: '30px',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0 10px',
                      backgroundColor: '#374151',
                      color: '#e5e7eb',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      fontFamily: '"Inter", system-ui, sans-serif',
                      appearance: 'none'
                    }}
                    required={name === 'start_date' || name === 'end_date'}
                  />
                </div>
              ))}
            </div>
          ))}

          {/* White calendar icon */}
          <style>
            {`
              input[type="date"]::-webkit-calendar-picker-indicator {
                filter: invert(1);
              }
              input[type="date"]::-moz-calendar-picker-indicator {
                filter: invert(1);
              }
            `}
          </style>

          {error && (
            <p className="text-red-400 text-[11px] text-center">{error}</p>
          )}

          <div style={{ marginTop: '28px' }}>
            <button
              type="button"
              onClick={loading ? null : handleSubmit}
              disabled={loading}
              style={{
                width: '100%',
                backgroundColor: loading ? '#6b7280' : '#3b82f6',
                color: '#ffffff',
                padding: '10px 0',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.85 : 1,
                boxShadow: '0 2px 5px rgba(0, 0, 0, 0.12)'
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = '#2563eb'
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = '#3b82f6'
              }}
            >
              {loading ? 'Running...' : 'Run Simulation'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default CollapsibleSidebar
