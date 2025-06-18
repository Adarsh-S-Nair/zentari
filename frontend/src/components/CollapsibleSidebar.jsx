import React, { useEffect, useRef, useState } from 'react'
import { FiChevronDown, FiChevronUp, FiBarChart2, FiFolder, FiLogIn } from 'react-icons/fi'
import { useNavigate, useLocation } from 'react-router-dom'
import SimulationControls from './SimulationControls'
import UserProfileTab from './UserProfileTab'
import LogoutModal from './LogoutModal'
import logoCollapsed from '../assets/logo-light.png'
import logoFull from '../assets/full-logo-light.png'
import { supabase } from '../supabaseClient'

export default function CollapsibleSidebar({
  form, handleChange, handleSubmit, error, loading,
  onLoginClick, user, isTablet, isMobile
}) {
  const navigate = useNavigate(), location = useLocation(), collapsedWidth = 50
  const [isOpen, setIsOpen] = useState(!isTablet), [isHovering, setIsHovering] = useState(false)
  const [userName, setUserName] = useState(''), [logoutOpen, setLogoutOpen] = useState(false)
  const [contentHeight, setContentHeight] = useState(0)
  const contentRef = useRef(null)
  const isSim = location.pathname === '/simulate', fullyOpen = isOpen || isHovering

  useEffect(() => void setIsOpen(!isTablet), [isTablet])
  useEffect(() => {
    if (user) {
      supabase.from('user_profiles').select('name').eq('id', user.id).single()
        .then(({ data, error }) => { if (!error && data?.name) setUserName(data.name) })
    }
  }, [user])
  useEffect(() => {
    if (fullyOpen && isSim && contentRef.current) {
      const t = setTimeout(() => setContentHeight(contentRef.current.scrollHeight), 50)
      return () => clearTimeout(t)
    }
  }, [form, isSim, fullyOpen])

  const tabs = [
    { label: 'Simulation', icon: <FiBarChart2 size={18} />, route: '/simulate', hasContent: true },
    { label: 'My Portfolio', icon: <FiFolder size={18} />, route: '/portfolio', hasContent: false },
  ]

  const SidebarTab = ({ tab }) => {
    const isActive = location.pathname === tab.route
    const isExpandable = tab.hasContent && isActive

    const roundedClass = !fullyOpen
      ? 'rounded-[8px]'
      : isExpandable
      ? 'rounded-t-[8px]'
      : 'rounded-[8px]'

    const tabClass = `flex items-center gap-[10px] ${
      fullyOpen ? 'px-[16px] py-[6px]' : 'justify-center h-[50px]'
    } transition-colors duration-200 ${
      isActive ? 'bg-[#374151] cursor-default' : 'hover:bg-[#2d384a] cursor-pointer'
    } ${roundedClass}`

    return (
      <div>
        <div className={tabClass} onClick={() => !isActive && navigate(tab.route)}>
          {tab.icon}
          {fullyOpen && (
            <div className="flex justify-between w-full items-center">
              <h2 className="text-[13px] font-bold text-gray-100">{tab.label}</h2>
              {tab.hasContent && (isExpandable ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />)}
            </div>
          )}
        </div>
        {fullyOpen && isExpandable && (
          <div
            style={{
              maxHeight: isActive ? `${contentHeight}px` : '0px',
              transition: 'max-height 0.3s ease',
              overflow: 'hidden',
              backgroundColor: '#1c232f',
              borderBottomLeftRadius: 8,
              borderBottomRightRadius: 8,
              marginBottom: '12px',
            }}
          >
            <div ref={contentRef} className="px-[24px] py-[16px]">
              <SimulationControls {...{ form, handleChange, handleSubmit, error, loading }} />
            </div>
          </div>
        )}
      </div>
    )
  }


  return (
    <>
      {!isOpen && isMobile && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-50 w-[44px] h-[44px] bg-gray-800 rounded-full shadow-md flex items-center justify-center text-white"
        >
          <FiBarChart2 size={20} />
        </button>
      )}

      <div
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className="transition-all duration-300 flex flex-col h-[100vh] px-[12px]"
        style={{
          backgroundColor: '#1f2937',
          width: fullyOpen ? '290px' : `${collapsedWidth}px`,
          paddingTop: '16px',
          paddingBottom: '16px',
          boxShadow: `0 0 ${fullyOpen ? '40px 6px' : '30px'} rgba(0,0,0,0.7)`,
          fontFamily: '"Inter", system-ui, sans-serif',
          color: '#f3f4f6',
          overflowY: 'auto',
          position: isTablet ? 'absolute' : 'relative',
          top: 0,
          left: 0,
          zIndex: isTablet ? 40 : 10,
        }}
      >
        {/* LOGO */}
        <div className={`w-full mb-[38px] mt-[20px] ${fullyOpen ? 'ml-[10px]' : 'flex justify-center'}`}>
          <img
            src={fullyOpen ? logoFull : logoCollapsed}
            alt="Logo"
            className={fullyOpen ? 'h-[18px] w-auto object-contain' : 'h-[18px] w-[18px] object-contain'}
          />
        </div>

        {/* TABS */}
        <div className="w-full flex flex-col gap-[10px] mb-[20px]">
          {tabs.map((tab, i) => <SidebarTab key={i} tab={tab} />)}
        </div>

        {/* USER / LOGIN */}
        <div style={{ marginTop: 'auto', paddingBottom: '16px' }}>
          {user ? (
            <UserProfileTab {...{ isOpen: fullyOpen, user, userName, setLogoutOpen }} />
          ) : (
            <div className="w-full">
              <div
                className={`flex items-center gap-[10px] ${fullyOpen ? 'px-[16px] py-[6px]' : 'justify-center py-[10px]'}
                transition-colors duration-200 hover:bg-[#2d384a] cursor-pointer rounded-[8px]`}
                onClick={onLoginClick}
              >
                <FiLogIn size={18} />
                {fullyOpen && (
                  <div className="flex justify-between w-full items-center">
                    <h2 className="text-[13px] font-bold text-gray-100">Log in / Sign Up</h2>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <LogoutModal isOpen={logoutOpen} onClose={() => setLogoutOpen(false)} onLogout={() => setUserName('')} />
    </>
  )
}
