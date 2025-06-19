import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import CollapsibleSidebar from './components/CollapsibleSidebar'
import PortfolioPanel from './components/PortfolioPanel'
import SimulationPanel from './components/SimulationPanel'
import Toast from './components/Toast'
import LoginModal from './components/LoginModal'
import LogoutModal from './components/LogoutModal'
import MobileBottomBar from './components/MobileBottomBar'
import MobileTopbar from './components/MobileTopbar'
import { supabase } from './supabaseClient'
import { useMediaQuery } from 'react-responsive'

function App() {
  const [loading, setLoading] = useState(false)
  const [loadingPhase, setLoadingPhase] = useState('')
  const [loginOpen, setLoginOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [result, setResult] = useState(null)
  const [toast, setToast] = useState({ message: '', type: 'default' })
  const [currentSimDate, setCurrentSimDate] = useState(null)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const isTablet = useMediaQuery({ maxWidth: 1024 })
  const isMobile = useMediaQuery({ maxWidth: 670 })

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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setToast({ message: '', type: 'default' })
    setResult({
      starting_value: form.starting_value,
      benchmark: form.benchmark,
      monthly_returns: [],
      daily_values: [],
      daily_benchmark_values: []
    })
    setLoading(true)
    setLoadingPhase('init')
    setCurrentSimDate(null)

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'localhost:8000'
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const socket = new WebSocket(`${protocol}://${baseUrl.replace(/^https?:\/\//, '')}/simulate/ws`)

    socket.onopen = () => {
      console.log('[WebSocket] Connected')
      socket.send(JSON.stringify(form))
    }

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data)

      switch (msg.type) {
        case 'status':
          console.log('[STATUS]', msg.payload)
          if (msg.payload.toLowerCase().includes('starting simulation')) {
            setLoadingPhase('')
          }
          break

        case 'daily':
          setCurrentSimDate(msg.payload.date)
          setResult((prev) => ({
            ...prev,
            daily_values: [...(prev.daily_values || []), {
              date: msg.payload.date,
              portfolio_value: msg.payload.portfolio_value
            }],
            daily_benchmark_values: [...(prev.daily_benchmark_values || []), {
              date: msg.payload.date,
              benchmark_value: msg.payload.benchmark_value
            }]
          }))
          break

        case 'rebalance':
          setResult((prev) => ({
            ...prev,
            monthly_returns: [...(prev.monthly_returns || []), msg.payload],
            final_portfolio_value: msg.payload.portfolio_value,
            final_benchmark_value: msg.payload.benchmark_value
          }))
          break

        case 'done':
          setResult((prev) => ({
            ...prev,
            ...msg.payload
          }))
          setLoading(false)
          setToast({ message: 'Simulation completed!', type: 'success' })
          break

        case 'error':
          setToast({ message: msg.payload || 'Something went wrong.', type: 'error' })
          setLoading(false)
          break

        default:
          console.log('[UNKNOWN MESSAGE]', msg)
      }
    }

    socket.onerror = (err) => {
      console.error('[WebSocket Error]', err)
      setToast({ message: 'Something went wrong.', type: 'error' })
      setLoading(false)
    }

    socket.onclose = () => {
      console.log('[WebSocket] Disconnected')
    }
  }

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (!error && data?.user) setUser(data.user)
    }

    fetchUser()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  return (
    <Router>
      <div className="flex h-screen w-screen overflow-x-hidden overflow-y-hidden relative">
        {!isMobile && (
          <CollapsibleSidebar
            form={form}
            handleChange={handleChange}
            handleSubmit={handleSubmit}
            loading={loading}
            onLoginClick={() => setLoginOpen(true)}
            user={user}
            isTablet={isTablet}
            isMobile={isMobile}
            setLogoutOpen={setLogoutOpen}
          />
        )}

        {isMobile && <MobileTopbar form={form} handleChange={handleChange} handleSubmit={handleSubmit} loading={loading} />}
        <div
          className="flex-1 h-full overflow-y-auto flex pb-[60px] sm:pb-0"
          style={{ marginLeft: isTablet && !isMobile ? '75px' : '0px' }}
        >
          <Routes>
            <Route
              path="/simulate"
              element={
                <SimulationPanel
                  loading={loading}
                  loadingPhase={loadingPhase}
                  result={result}
                  currentSimDate={currentSimDate}
                  isMobile={isMobile}
                />
              }
            />
            <Route path="/portfolio" element={<PortfolioPanel />} />
            <Route path="*" element={<Navigate to="/simulate" replace />} />
          </Routes>
        </div>

        {isMobile && (
          <MobileBottomBar
            user={user}
            onLoginClick={() => setLoginOpen(true)}
            setLogoutOpen={setLogoutOpen}
          />
        )}

        <Toast
          key={toast.message}
          message={toast.message}
          type={toast.type}
          isMobile={isMobile}
          onClose={() => setToast({ message: '', type: 'default' })}
        />

        <LoginModal
          isOpen={loginOpen}
          onClose={() => setLoginOpen(false)}
          setToast={setToast}
        />

        <LogoutModal isOpen={logoutOpen} onClose={() => setLogoutOpen(false)} onLogout={() => {/* clear auth state here */}} />
      </div>
    </Router>
  )
}

export default App
