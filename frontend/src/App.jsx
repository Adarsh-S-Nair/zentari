import { useState } from 'react'
import SidebarForm from './components/SidebarForm'
import Spinner from './components/Spinner'

function App() {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    start_date: '2025-01-01',
    end_date: '2025-06-01',
    lookback_months: 12,
    skip_recent_months: 1,
    hold_months: 1,
    top_n: 10,
    starting_value: 10000,
    benchmark: 'SPY'
  })
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setResult(null)
    setLoading(true)

    try {
      const response = await fetch('http://localhost:8000/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await response.json()
      if (data.error) setError(data.error)
      else setResult(data)
    } catch {
      setError('Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-800 font-sans p-[24px] box-border flex flex-col">
      <div className="flex flex-1 overflow-hidden">
        <SidebarForm
          form={form}
          handleChange={handleChange}
          handleSubmit={handleSubmit}
          error={error}
          loading={loading}
        />

        <main className="flex-1 px-[24px] overflow-y-auto">
          {loading ? (
            <Spinner />
          ) : result ? (
            <div
              className="bg-white rounded-[8px] px-[24px] py-[16px] max-w-[600px]"
              style={{
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                border: '1px solid #e5e7eb'
              }}
            >
              <h2 className="text-[16px] font-semibold mb-[16px] text-gray-800">Simulation Summary</h2>
              <p className="mb-[8px]"><strong>Start:</strong> {result.start_date}</p>
              <p className="mb-[8px]"><strong>End:</strong> {result.end_date}</p>
              <p className="mb-[8px]"><strong>Final Portfolio Value:</strong> ${result.final_portfolio_value.toFixed(2)}</p>
              <p className="mb-[8px]"><strong>Final Benchmark Value ({form.benchmark}):</strong> ${result.final_benchmark_value.toFixed(2)}</p>
              <p className="mb-[8px]"><strong>Total Return:</strong> {result.total_return_pct.toFixed(2)}%</p>
              <p className="mb-[8px]"><strong>Simulation Time:</strong> {result.duration_sec.toFixed(2)}s</p>
            </div>
          ) : (
            <div className="text-gray-500 italic">Run a simulation to see results here.</div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
