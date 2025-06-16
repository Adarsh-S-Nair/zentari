import React, { useEffect, useState } from 'react'
import { FiX } from 'react-icons/fi'
import { MdEmail } from 'react-icons/md'
import { FaLock, FaUser } from 'react-icons/fa'

function LoginModal({ isOpen, onClose }) {
  const [visible, setVisible] = useState(false)
  const [isSignup, setIsSignup] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setVisible(true)
    }
  }, [isOpen])

  const handleClose = () => {
    setVisible(false)
    setTimeout(() => {
      onClose()
      setIsSignup(false) // reset to login
    }, 200)
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <div
        className={`transition-all duration-200 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-[40px]'
        }`}
        style={{
          width: '360px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          boxSizing: 'border-box',
          position: 'relative',
          transform: visible ? 'translateY(0)' : 'translateY(-40px)',
          opacity: visible ? 1 : 0,
          transition: 'all 0.2s ease-in-out',
        }}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'none',
            border: 'none',
            color: '#6b7280',
            cursor: 'pointer',
            padding: '4px',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#111827')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#6b7280')}
        >
          <FiX size={20} />
        </button>

        {/* Title */}
        <h2
          style={{
            fontSize: '20px',
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: '20px',
            color: '#111827',
          }}
        >
          {isSignup ? 'Sign Up' : 'Log In'}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Name (Signup only) */}
          {isSignup && (
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                padding: '10px 12px',
                boxSizing: 'border-box',
              }}
            >
              <FaUser size={16} style={{ marginRight: '8px', color: '#6b7280' }} />
              <input
                type="text"
                placeholder="Name"
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: '14px',
                  color: '#111827',
                  background: 'transparent',
                }}
              />
            </div>
          )}

          {/* Email Field */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              padding: '10px 12px',
              boxSizing: 'border-box',
            }}
          >
            <MdEmail size={18} style={{ marginRight: '8px', color: '#6b7280' }} />
            <input
              type="email"
              placeholder="Email"
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: '14px',
                color: '#111827',
                background: 'transparent',
              }}
            />
          </div>

          {/* Password Field */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              padding: '10px 12px',
              boxSizing: 'border-box',
            }}
          >
            <FaLock size={16} style={{ marginRight: '8px', color: '#6b7280' }} />
            <input
              type="password"
              placeholder="Password"
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: '14px',
                color: '#111827',
                background: 'transparent',
              }}
            />
          </div>

          {/* Submit Button */}
          <button
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              boxSizing: 'border-box',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#3b82f6')}
          >
            {isSignup ? 'Create account' : 'Log in'}
          </button>

          {/* Toggle link */}
          <p
            style={{
              fontSize: '13px',
              textAlign: 'center',
              marginTop: '6px',
              color: '#6b7280',
            }}
          >
            {isSignup ? (
              <>
                Already have an account?{' '}
                <span
                  style={{ color: '#2563eb', cursor: 'pointer' }}
                  onClick={() => setIsSignup(false)}
                >
                  Log in
                </span>
              </>
            ) : (
              <>
                Don’t have an account?{' '}
                <span
                  style={{ color: '#2563eb', cursor: 'pointer' }}
                  onClick={() => setIsSignup(true)}
                >
                  Sign up
                </span>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginModal
