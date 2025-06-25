import React from 'react'
import { FiX } from 'react-icons/fi'

export default function RightDrawer({ isOpen, onClose, children }) {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            zIndex: 40,
            transition: 'opacity 0.3s ease',
          }}
        />
      )}

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: isOpen ? 0 : '-100%',
          width: '320px',
          height: '100%',
          backgroundColor: '#1f2937',
          boxShadow: '-12px 0 20px rgba(0,0,0,0.4)',
          zIndex: 50,
          transition: 'right 0.3s ease',
          overflowY: 'auto',
          padding: '24px', // 👈 Same internal margin as sidebar
          boxSizing: 'border-box',
        }}
      >
        {/* Close Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9ca3af',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#f3f4f6')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#9ca3af')}
          >
            <FiX size={22} />
          </button>
        </div>

        {/* Content Wrapper with rounding + subtle shadow */}
        <div
          style={{
            borderRadius: '12px',
            backgroundColor: '#1c232f',
            padding: '16px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          }}
        >
          {children}
        </div>
      </div>
    </>
  )
}
