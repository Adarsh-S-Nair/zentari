import React, { useRef, useEffect, useState } from 'react'

const Tabs = ({ tabs = [], activeId, onChange, showCount = false }) => {
  const containerRef = useRef(null)
  const [indicatorStyle, setIndicatorStyle] = useState({})

  useEffect(() => {
    const activeTab = containerRef.current?.querySelector(`[data-tab-id="${activeId}"]`)
    if (activeTab) {
      const { offsetLeft, offsetWidth } = activeTab
      setIndicatorStyle({
        transform: `translateX(${offsetLeft}px)`,
        width: offsetWidth,
        transition: 'all 300ms ease'
      })
    }
  }, [activeId, tabs])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'flex',
        gap: 8,
        marginBottom: 16,
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      {tabs.map((tab) => (
        <div
          key={tab.id}
          data-tab-id={tab.id}
          onClick={() => onChange(tab.id)}
          role="tab"
          aria-selected={activeId === tab.id}
          style={{
            padding: '10px 16px',
            fontSize: 13,
            fontWeight: 500,
            color: activeId === tab.id ? 'var(--color-primary)' : '#6b7280',
            cursor: 'pointer',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'color 0.2s ease'
          }}
        >
          <span>{tab.label}</span>
          {showCount && typeof tab.count === 'number' && (
            <div style={{
              backgroundColor: activeId === tab.id ? 'var(--color-primary)' : '#e5e7eb',
              color: activeId === tab.id ? '#ffffff' : '#6b7280',
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: 10,
              minWidth: 16,
              textAlign: 'center'
            }}>
              {tab.count}
            </div>
          )}
        </div>
      ))}

      {/* Animated underline indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          height: 2,
          backgroundColor: 'var(--color-primary)',
          borderRadius: 999,
          ...indicatorStyle
        }}
      />
    </div>
  )
}

export default Tabs
