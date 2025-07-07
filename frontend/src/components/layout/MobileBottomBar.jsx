import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export default function MobileBottomBar({ user, onLoginClick, setLogoutOpen, visibleTabs }) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100%',
        height: '50px',
        background: '#fff',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        zIndex: 1000,
        borderTop: '1.5px solid #f3f4f6',
        boxShadow: '0 -2px 8px 0 rgba(59,130,246,0.04)',
        fontFamily: '"Inter", system-ui, sans-serif',
      }}
    >
      {visibleTabs.map((tab, idx) => {
        const isActive = location.pathname === tab.route || location.pathname.startsWith(tab.route + '/')

        return (
          <button
            key={idx}
            onClick={() => navigate(tab.route)}
            style={{
              flex: 1,
              height: '100%',
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              cursor: isActive ? 'default' : 'pointer',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '6px 10px',
                borderRadius: isActive ? 10 : 0,
                background: isActive ? 'linear-gradient(90deg, #6366f1 0%, #3b82f6 100%)' : 'transparent',
                color: isActive ? '#fff' : '#6b7280',
                transition: 'background 0.18s, color 0.18s, border-radius 0.18s',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = '#2563eb'
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = '#6b7280'
              }}
            >
              {tab.icon}
            </div>
          </button>
        )
      })}
    </div>
  )
}
