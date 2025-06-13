import React from 'react'

function SidebarForm({ form, handleChange, handleSubmit, error, loading }) {
  const fields = [
    { label: 'Start Date', name: 'start_date', type: 'date' },
    { label: 'End Date', name: 'end_date', type: 'date' },
    { label: 'Lookback Months', name: 'lookback_months', type: 'number' },
    { label: 'Skip Recent Months', name: 'skip_recent_months', type: 'number' },
    { label: 'Hold Months', name: 'hold_months', type: 'number' },
    { label: 'Top N Stocks', name: 'top_n', type: 'number' },
    { label: 'Starting Value ($)', name: 'starting_value', type: 'number' },
    { label: 'Benchmark Ticker', name: 'benchmark', type: 'text' }
  ]

  return (
    <aside className="w-[300px] flex flex-col">
      <div
        className="bg-white rounded-[8px] p-[24px] flex flex-col flex-1"
        style={{
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
          border: '1px solid #e5e7eb'
        }}
      >
        <form className="flex flex-col items-center space-y-[28px] flex-grow">
          {fields.map(({ label, name, type }) => (
            <div
              key={name}
              className="w-full mb-[24px] space-y-[4px] flex flex-col items-center"
            >
              <label className="block text-[12px] font-medium text-gray-700 w-[200px] text-left">
                {label}
              </label>
              <input
                type={type}
                name={name}
                value={form[name]}
                onChange={handleChange}
                className="w-[200px] h-[30px] border rounded-[8px] px-[12px] text-sm"
                style={{
                  borderColor: '#e5e7eb',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: '13px'
                }}
                required={name === 'start_date' || name === 'end_date'}
              />
            </div>
          ))}

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        </form>

        <div
          onClick={loading ? null : handleSubmit}
          className="w-[200px] mt-[24px] self-center rounded-[8px] text-[14px] font-medium text-center transition-colors"
          style={{
            backgroundColor: loading ? '#cbd5e1' : '#509cf4',
            color: '#ffffff',
            padding: '8px 16px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'Inter, system-ui, sans-serif',
            opacity: loading ? 0.8 : 1
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.backgroundColor = '#3b82f6'
              e.currentTarget.style.color = '#ffffff'
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.backgroundColor = '#509cf4'
              e.currentTarget.style.color = '#ffffff'
            }
          }}
        >
          {loading ? 'Running...' : 'Run Simulation'}
        </div>
      </div>
    </aside>
  )
}

export default SidebarForm
