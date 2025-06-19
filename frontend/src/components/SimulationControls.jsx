import Button from './Button'

function SimulationControls({ form, handleChange, handleSubmit, error, loading }) {
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
    <form className="flex flex-col w-full" style={{ gap: '16px' }}>
      {groupedFields.map((group, i) => (
        <div key={i} className="flex justify-between gap-[12px]">
          {group.map(({ label, name, type }) => (
            <div key={name} style={{ width: 'calc(50% - 6px)' }}>
              <label className="text-[11px] font-medium mb-[4px]" style={{ color: '#d1d5db' }}>
                {label}
              </label>
              <input
                type={type}
                name={name}
                value={form[name]}
                onChange={handleChange}
                min={
                  name === 'lookback_months' ? 1 :
                  name === 'skip_recent_months' ? 0 :
                  name === 'hold_months' ? 1 :
                  name === 'top_n' ? 1 :
                  name === 'starting_value' ? 1 :
                  name === 'start_date' ? '2000-01-01' :
                  name === 'end_date' ? form.start_date : undefined
                }
                max={
                  name === 'lookback_months' ? 12 :
                  name === 'skip_recent_months' ? 12 :
                  name === 'hold_months' ? 3 :
                  name === 'top_n' ? 20 :
                  name === 'starting_value' ? 1000000000 :
                  name === 'start_date' ? form.end_date : undefined
                }
                required={name === 'start_date' || name === 'end_date'}
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
              />
            </div>
          ))}
        </div>
      ))}

      {/* Light calendar icon fix */}
      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
        }
        input[type="date"]::-moz-calendar-picker-indicator {
          filter: invert(1);
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
