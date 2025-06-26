import React from 'react'

function Tab({ 
  id, 
  label, 
  count, 
  isActive, 
  onClick, 
  children 
}) {
  return (
    <button
      id={id}
      onClick={onClick}
      style={{
        padding: '10px 16px',
        fontSize: '13px',
        fontWeight: '500',
        transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
        borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
        borderTop: 'none',
        borderLeft: 'none',
        borderRight: 'none',
        color: isActive ? 'var(--color-primary)' : 'var(--color-text-light)',
        backgroundColor: 'transparent',
        borderRadius: '8px 8px 0 0',
        cursor: 'pointer',
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        ':hover': {
          color: isActive ? 'var(--color-primary)' : 'var(--color-text)'
        }
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.target.style.color = 'var(--color-text)';
          const pill = e.target.querySelector('div');
          if (pill) {
            pill.style.backgroundColor = 'var(--color-gray-300)';
            pill.style.color = 'var(--color-text)';
          }
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.target.style.color = 'var(--color-text-light)';
          const pill = e.target.querySelector('div');
          if (pill) {
            pill.style.backgroundColor = 'var(--color-gray-200)';
            pill.style.color = 'var(--color-text-muted)';
          }
        }
      }}
    >
      <span>{label}</span>
      <div style={{
        backgroundColor: isActive ? 'var(--color-primary)' : 'var(--color-gray-200)',
        color: isActive ? 'white' : 'var(--color-text-muted)',
        fontSize: '11px',
        fontWeight: '600',
        padding: '2px 6px',
        borderRadius: '10px',
        minWidth: '16px',
        textAlign: 'center',
        transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        {count}
      </div>
    </button>
  )
}

export default Tab 