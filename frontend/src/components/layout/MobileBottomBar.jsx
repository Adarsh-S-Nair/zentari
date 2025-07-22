import React, { useRef, useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export default function MobileBottomBar({ user, onLoginClick, setLogoutOpen, visibleTabs }) {
  const navigate = useNavigate()
  const location = useLocation()
  const iconRefs = useRef([])
  const [highlightStyle, setHighlightStyle] = useState({ left: 0, top: 0, width: 0, height: 0 })

  // Find the active tab index
  const activeIdx = visibleTabs.findIndex(tab =>
    location.pathname === tab.route ||
    location.pathname.startsWith(tab.route + '/') ||
    (tab.route === '/transactions' && location.pathname.startsWith('/transaction/'))
  )

  // Padding for highlight (in px)
  const H_PADDING = 4
  const V_PADDING = 4
  const BORDER_RADIUS = 12

  // Update highlight position and size on tab or window resize
  useEffect(() => {
    if (activeIdx !== -1 && iconRefs.current[activeIdx]) {
      const el = iconRefs.current[activeIdx]
      const rect = el.getBoundingClientRect()
      const parentRect = el.parentNode.parentNode.getBoundingClientRect() // parentNode is the button, parentNode.parentNode is the bar
      setHighlightStyle({
        left: rect.left - parentRect.left - H_PADDING,
        top: rect.top - parentRect.top - V_PADDING,
        width: rect.width + 2 * H_PADDING,
        height: rect.height + 2 * V_PADDING
      })
    }
  }, [activeIdx, visibleTabs.length])

  useEffect(() => {
    const handleResize = () => {
      if (activeIdx !== -1 && iconRefs.current[activeIdx]) {
        const el = iconRefs.current[activeIdx]
        const rect = el.getBoundingClientRect()
        const parentRect = el.parentNode.parentNode.getBoundingClientRect()
        setHighlightStyle({
          left: rect.left - parentRect.left - H_PADDING,
          top: rect.top - parentRect.top - V_PADDING,
          width: rect.width + 2 * H_PADDING,
          height: rect.height + 2 * V_PADDING
        })
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [activeIdx, visibleTabs.length])

  return (
    <div className="fixed bottom-0 left-0 w-full h-[50px] bg-white flex justify-around items-center z-[200] border-t border-gray-100 shadow-[0_-2px_8px_0_rgba(59,130,246,0.04)] font-sans" style={{ boxSizing: 'border-box', position: 'fixed' }}>
      {/* Animated icon highlight */}
      <div
        className="absolute z-0 transition-all duration-300"
        style={{
          left: highlightStyle.left,
          top: highlightStyle.top,
          width: highlightStyle.width,
          height: highlightStyle.height,
          background: 'var(--color-gradient-primary)',
          borderRadius: BORDER_RADIUS,
          boxShadow: '0 2px 8px 0 rgba(59,130,246,0.08)',
          transition: 'left 0.3s cubic-bezier(.4,1,.4,1), top 0.3s cubic-bezier(.4,1,.4,1), width 0.3s cubic-bezier(.4,1,.4,1), height 0.3s cubic-bezier(.4,1,.4,1)'
        }}
      />
      {visibleTabs.map((tab, idx) => {
        const isActive = idx === activeIdx
        return (
          <button
            key={idx}
            onClick={() => navigate(tab.route)}
            className="flex-1 h-full bg-transparent border-none outline-none flex justify-center items-center relative z-10"
            style={{ cursor: isActive ? 'default' : 'pointer', background: 'transparent' }}
            disabled={isActive}
          >
            <div
              ref={el => iconRefs.current[idx] = el}
              className={
                `flex flex-col items-center justify-center px-2 py-1.5 rounded-[10px] transition-all duration-150 ` +
                (isActive
                  ? 'text-white'
                  : 'bg-transparent text-gray-500 hover:text-blue-600')
              }
              style={{ position: 'relative', zIndex: 2 }}
            >
              {React.cloneElement(tab.icon, { color: isActive ? '#fff' : '#6b7280' })}
            </div>
          </button>
        )
      })}
    </div>
  )
}
