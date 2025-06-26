import { Button, Dropdown } from '../ui'
import { useState, useEffect } from 'react'

function SimulationControls({ form, handleChange, handleSubmit, error, loading }) {
  const [focusedInput, setFocusedInput] = useState(null)
  
  const strategyOptions = [
    { label: 'Momentum Trading', value: 'momentum' },
    { label: 'Statistical Arbitrage ', value: 'cointegration' }
  ]

  const momentumFields = [
    [
      { label: 'Start Date', name: 'start_date', type: 'date' },
      { label: 'End Date', name: 'end_date', type: 'date' }
    ],
    [
      { label: 'Take-Profit (%)', name: 'tp_threshold', type: 'number' },
      { label: 'Stop-Loss (%)', name: 'sl_threshold', type: 'number' }
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

  const smaFields = [
    [
      { label: 'Start Date', name: 'start_date', type: 'date' },
      { label: 'End Date', name: 'end_date', type: 'date' }
    ],
    [
      { label: 'Starting Value ($)', name: 'starting_value', type: 'number' },
      { label: 'Benchmark Ticker', name: 'benchmark', type: 'text' }
    ]
  ]

  const cointegrationFields = [
    [
      { label: 'Start Date', name: 'start_date', type: 'date' },
      { label: 'End Date', name: 'end_date', type: 'date' }
    ],
    [
      { label: 'Lookback Months', name: 'lookback_months', type: 'number' },
      { label: 'Starting Value ($)', name: 'starting_value', type: 'number' }
    ],
    [
      { label: 'Benchmark Ticker', name: 'benchmark', type: 'text' }
    ]
  ]

  const getSelectedFields = () => {
    switch (form.strategy) {
      case 'sma_crossover':
        return smaFields
      case 'cointegration':
        return cointegrationFields
      default:
        return momentumFields
    }
  }

  const selectedFields = getSelectedFields()

  // Force container to recalculate scrollable area when strategy changes
  useEffect(() => {
    // Trigger a resize event to force recalculation
    window.dispatchEvent(new Event('resize'))
    
    // Also scroll to top to ensure user can see all content
    const formElement = document.querySelector('.simulation-controls-form')
    if (formElement) {
      formElement.scrollTop = 0
    }
  }, [form.strategy])

  const getInputStyles = (name, type) => {
    const isFocused = focusedInput === name
    const baseStyles = {
      width: '100%',
      height: '30px',
      border: `1px solid ${isFocused ? '#3b82f6' : '#4b5563'}`,
      borderRadius: '6px',
      padding: '0 10px',
      backgroundColor: '#374151',
      color: '#e5e7eb',
      fontSize: '13px',
      boxSizing: 'border-box',
      fontFamily: '"Inter", system-ui, sans-serif',
      appearance: 'none',
      boxShadow: isFocused 
        ? '0 0 0 3px rgba(59, 130, 246, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        : '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      transition: 'all 0.15s ease-in-out',
      outline: 'none'
    }

    // Add specific styles for date inputs
    if (type === 'date') {
      baseStyles['::-webkit-calendar-picker-indicator'] = {
        filter: 'invert(1) brightness(0) saturate(100%) invert(100%)',
        cursor: 'pointer'
      }
    }

    // Add specific styles for number inputs
    if (type === 'number') {
      baseStyles['::-webkit-inner-spin-button'] = {
        WebkitAppearance: 'none',
        margin: 0
      }
      baseStyles['::-webkit-outer-spin-button'] = {
        WebkitAppearance: 'none',
        margin: 0
      }
      baseStyles['-moz-appearance'] = 'textfield'
    }

    return baseStyles
  }

  return (
    <form
      className="simulation-controls-form flex flex-col w-full overflow-y-auto"
      style={{ gap: '8px', maxHeight: 'calc(100vh - 100px)', paddingBottom: '20px' }}
    >
      <div style={{ width: '100%' }}>
        <Dropdown
          label="Trading Strategy"
          name="strategy"
          value={form.strategy}
          onChange={handleChange}
          options={strategyOptions}
        />
      </div>

      {selectedFields.map((group, i) => (
        <div key={i} className="flex justify-between gap-[12px]">
          {group.map(({ label, name, type }) => (
            <div key={name} style={{ width: group.length === 1 ? '100%' : 'calc(50% - 6px)' }}>
              <label className="text-[11px] font-medium mb-[4px]" style={{ color: '#d1d5db' }}>
                {label}
              </label>
              <input
                type={type}
                name={name}
                value={form[name]}
                onChange={handleChange}
                onFocus={() => setFocusedInput(name)}
                onBlur={() => setFocusedInput(null)}
                onKeyDown={(e) => {
                  if (type === 'number' && ["e", "E", "+", "-"].includes(e.key)) {
                    e.preventDefault()
                  }
                }}
                min={
                  name === 'lookback_months' ? (form.strategy === 'cointegration' ? 3 : 1) :
                  name === 'skip_recent_months' ? 0 :
                  name === 'hold_months' ? 1 :
                  name === 'top_n' ? 1 :
                  name === 'starting_value' ? 1 :
                  name === 'start_date' ? '2000-01-01' :
                  undefined
                }
                max={
                  name === 'lookback_months' ? (form.strategy === 'cointegration' ? 24 : 12) :
                  name === 'skip_recent_months' ? 12 :
                  name === 'hold_months' ? 3 :
                  name === 'top_n' ? 20 :
                  name === 'starting_value' ? 1000000000 :
                  undefined
                }
                required={name === 'start_date' || name === 'end_date'}
                style={getInputStyles(name, type)}
              />
            </div>
          ))}
        </div>
      ))}

      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1) brightness(0) saturate(100%) invert(100%);
          cursor: pointer;
        }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>

      {error && (
        <p className="text-red-400 text-[11px] text-center">{error}</p>
      )}

      <div style={{ marginTop: '28px' }}>
        <Button
          label={"Run Simulation"}
          onClick={handleSubmit}
          loading={loading}
          disabled={loading}
          color="#3b82f6"
        />
      </div>
    </form>
  )
}

export default SimulationControls
