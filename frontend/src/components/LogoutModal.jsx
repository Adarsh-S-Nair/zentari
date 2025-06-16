import React, { useEffect, useState, useRef } from 'react'
import { FiLogOut } from 'react-icons/fi'
import { supabase } from '../supabaseClient'

export default function LogoutModal({ isOpen, onClose, onLogout }) {
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const modalRef = useRef(null)

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
    setTimeout(() => onClose(), 200)
  }

  const handleConfirmLogout = async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
      if (onLogout) onLogout()
      handleClose()
    } catch (err) {
      console.error('Logout failed:', err)
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
          width: '360px',
          background: '#fff',
          borderRadius: '16px',
          padding: '28px 24px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          boxSizing: 'border-box',
          position: 'relative',
          transform: visible ? 'translateY(0)' : 'translateY(-40px)',
          opacity: visible ? 1 : 0,
          transition: 'all 0.2s ease-in-out',
        }}
      >
        {/* Header row with icon and text */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          marginBottom: '16px'
        }}>
          <div
            style={{
              backgroundColor: '#fee2e2',
              borderRadius: '9999px',
              padding: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FiLogOut size={20} color="#b91c1c" />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>
            Log out
          </h2>
        </div>

        <p style={{ fontSize: '14px', textAlign: 'left', color: '#4b5563' }}>
          Are you sure you want to log out of your account?
        </p>

        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
          marginTop: '24px',
        }}>
          <button
            disabled={loading}
            onClick={handleClose}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#d1d5db')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              backgroundColor: '#f3f4f6',
              color: '#111827',
              border: 'none',
              cursor: 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            disabled={loading}
            onClick={handleConfirmLogout}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#8e1a1a')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#b91c1c')}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              backgroundColor: '#b91c1c',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Logging out...' : 'Log out'}
          </button>
        </div>
      </div>
    </div>
  )
}
