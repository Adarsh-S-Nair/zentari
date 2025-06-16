import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import CollapsibleSidebar from './components/CollapsibleSidebar'
import PortfolioPanel from './components/PortfolioPanel'
import SimulationPanel from './components/SimulationPanel'
import Toast from './components/Toast'
import LoginModal from './components/LoginModal'
import { supabase } from './supabaseClient'

function App() {
  const [loading, setLoading] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [user, setUser] = useState(null)

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
  const [toast, setToast] = useState({ message: '', type: 'default' })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setToast({ message: '', type: 'default' })
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
      if (data.error) {
        setToast({ message: data.error, type: 'error' })
      } else {
        setResult(data)
        setToast({ message: 'Simulation completed!', type: 'success' })
      }
    } catch {
      setToast({ message: 'Something went wrong.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (!error && data?.user) setUser(data.user)
    }

    fetchUser()

    // ✅ Listen to login/logout/session change
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])


  return (
    <Router>
      <div className="flex h-screen w-screen overflow-hidden">
        <CollapsibleSidebar
          form={form}
          handleChange={handleChange}
          handleSubmit={handleSubmit}
          loading={loading}
          onLoginClick={() => setLoginOpen(true)}
          user={user}
        />

        <Routes>
          <Route path="/simulate" element={<SimulationPanel loading={loading} result={result} />} />
          <Route path="/portfolio" element={<PortfolioPanel />} />
          <Route path="*" element={<Navigate to="/simulate" replace />} />
        </Routes>

        <Toast
          key={toast.message}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: '', type: 'default' })}
        />

        <LoginModal
          isOpen={loginOpen}
          onClose={() => setLoginOpen(false)}
          setToast={setToast}
        />
      </div>
    </Router>
  )
}

export default App
