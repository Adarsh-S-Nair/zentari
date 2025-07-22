import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export default function MobileBottomBar({ user, onLoginClick, setLogoutOpen, visibleTabs }) {
  const navigate = useNavigate()
  const location = useLocation()

  // Find the active tab index
  const activeIdx = visibleTabs.findIndex(tab =>
    location.pathname === tab.route ||
    location.pathname.startsWith(tab.route + '/') ||
    (tab.route === '/transactions' && location.pathname.startsWith('/transaction/'))
  )

  return (
    <div className="fixed bottom-0 left-0 w-full h-[50px] bg-white flex justify-around items-center z-[200] border-t border-gray-100 shadow-[0_-2px_8px_0_rgba(59,130,246,0.04)] font-sans">
      {visibleTabs.map((tab, idx) => {
        const isActive = idx === activeIdx
        return (
          <button
            key={idx}
            onClick={() => navigate(tab.route)}
            className="flex-1 h-full bg-transparent border-none outline-none flex justify-center items-center"
            style={{ cursor: isActive ? 'default' : 'pointer' }}
            disabled={isActive}
          >
            <div
              className={
                `flex flex-col items-center justify-center rounded-[10px] transition-all duration-150 ` +
                (isActive
                  ? 'text-white px-3 py-2'
                  : 'bg-transparent text-gray-500 hover:text-blue-600 px-2 py-1.5')
              }
              style={isActive ? { background: 'var(--color-gradient-primary)' } : {}}
            >
              {React.cloneElement(tab.icon, { color: isActive ? '#fff' : '#6b7280' })}
            </div>
          </button>
        )
      })}
    </div>
  )
}
