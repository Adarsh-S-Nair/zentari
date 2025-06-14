import { useState } from 'react'
import CollapsibleSidebar from './components/CollapsibleSidebar'
import MainPanel from './components/MainPanel'

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

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

    try {
      const response = await fetch(`${baseUrl}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
    <div className="flex h-screen w-screen overflow-hidden">
      <CollapsibleSidebar
        form={form}
        handleChange={handleChange}
        handleSubmit={handleSubmit}
        error={error}
        loading={loading}
      />
      <MainPanel loading={loading} result={result} />
    </div>
  )
}

export default App
