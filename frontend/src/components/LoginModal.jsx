import React, { useEffect, useState, useRef } from 'react'
import { FiX } from 'react-icons/fi'
import { MdEmail } from 'react-icons/md'
import { FaLock, FaUser } from 'react-icons/fa'
import { supabase } from '../supabaseClient'
import Button from './Button'

function Field({ icon, type, placeholder, value, onChange }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        padding: '10px 12px',
        border: '1px solid #e5e7eb',
        boxSizing: 'border-box',
      }}
    >
      {icon}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        style={{
          flex: 1,
          border: 'none',
          outline: 'none',
          fontSize: '14px',
          color: '#111827',
          background: 'transparent',
          marginLeft: '8px',
        }}
      />
    </div>
  )
}

export default function LoginModal({ isOpen, onClose }) {
  const [visible, setVisible] = useState(false)
  const [isSignup, setIsSignup] = useState(false)
  const modalRef = useRef(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen) setVisible(true)

    const key = (e) => e.key === 'Escape' && handleClose()
    const outside = (e) => modalRef.current && !modalRef.current.contains(e.target) && handleClose()

    document.addEventListener('keydown', key)
    document.addEventListener('mousedown', outside)
    return () => {
      document.removeEventListener('keydown', key)
      document.removeEventListener('mousedown', outside)
    }
  }, [isOpen])

  const handleClose = () => {
    setVisible(false)
    setTimeout(() => {
      onClose()
      setIsSignup(false)
    }, 200)
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)

    if (!email || !password || (isSignup && !name)) {
      setError('Please fill out all fields.')
      setLoading(false)
      return
    }

    try {
      if (isSignup) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password
        })

        if (signUpError) throw signUpError

        // 🔁 Wait until Supabase returns the session
        const { data: sessionData } = await supabase.auth.getSession()
        const userId = sessionData.session?.user?.id

        if (!userId) throw new Error('No user session found.')

        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({ id: userId, name })

        if (profileError) throw profileError
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        })
        if (signInError) throw signInError
      }

      handleClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50, display: 'flex',
      justifyContent: 'center', alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)',
    }}>
      <div
        ref={modalRef}
        style={{
          width: '360px', background: '#fff', borderRadius: '16px', padding: '24px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)', boxSizing: 'border-box',
          position: 'relative', transform: visible ? 'translateY(0)' : 'translateY(-40px)',
          opacity: visible ? 1 : 0, transition: 'all 0.2s ease-in-out',
        }}
      >
        <button onClick={handleClose} style={{
          position: 'absolute', top: '12px', right: '12px',
          background: 'none', border: 'none', color: '#6b7280',
          cursor: 'pointer', padding: '4px',
        }}>
          <FiX size={20} />
        </button>

        <h2 style={{ fontSize: '20px', fontWeight: 'bold', textAlign: 'center', marginBottom: '20px', color: '#111827' }}>
          {isSignup ? 'Sign Up' : 'Log In'}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {isSignup && (
            <Field
              icon={<FaUser size={16} color="#6b7280" />}
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          <Field
            icon={<MdEmail size={18} color="#6b7280" />}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Field
            icon={<FaLock size={16} color="#6b7280" />}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <div style={{ color: 'red', fontSize: '13px', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <Button
            color="#3b82f6"
            onClick={handleSubmit}
            disabled={loading}
            loading={loading}
            label={loading ? 'Please wait...' : isSignup ? 'Create account' : 'Log in'}
          />

          <p style={{ fontSize: '13px', textAlign: 'center', marginTop: '6px', color: '#6b7280' }}>
            {isSignup ? (
              <>Already have an account? <span onClick={() => setIsSignup(false)} style={{ color: '#2563eb', cursor: 'pointer' }}>Log in</span></>
            ) : (
              <>Don’t have an account? <span onClick={() => setIsSignup(true)} style={{ color: '#2563eb', cursor: 'pointer' }}>Sign up</span></>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
