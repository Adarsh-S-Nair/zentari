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
  onLoginClick, user, isTablet, isMobile, setLogoutOpen,
  visibleTabs
}) {
  const navigate = useNavigate(), location = useLocation()
  const contentRef = useRef(null)
  const isSim = location.pathname === '/simulate'
  const [isOpen, setIsOpen] = useState(!isTablet)
  const [isHovering, setIsHovering] = useState(false)
  const [userName, setUserName] = useState('')
  const [contentHeight, setContentHeight] = useState(0)
  const [shouldAnimate, setShouldAnimate] = useState(false)

  const fullyOpen = isOpen || isHovering

  useEffect(() => setIsOpen(!isTablet), [isTablet])

  useEffect(() => {
    if (user) {
      supabase.from('user_profiles').select('name').eq('id', user.id).single()
        .then(({ data, error }) => { if (!error && data?.name) setUserName(data.name) })
    }
  }, [user])

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
        className="transition-all duration-300 h-[100vh] px-[12px] flex flex-col justify-between"
        style={{
          backgroundColor: '#1f2937',
          width: fullyOpen ? '290px' : '50px',
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
        {/* 🧱 Top: Logo + Tabs */}
        <div>
          <div className={`w-full mb-[38px] mt-[20px] ${fullyOpen ? 'ml-[10px]' : 'flex justify-center'}`}>
            <img
              src={fullyOpen ? logoFull : logoCollapsed}
              alt="Logo"
              className="h-[18px] object-contain"
              style={{ width: fullyOpen ? 'auto' : '18px' }}
            />
          </div>

          <div className="w-full flex flex-col gap-[10px] mb-[20px]">
            {visibleTabs.map((tab, i) => (
              <SidebarTab
                key={i}
                tab={tab}
                isActive={location.pathname === tab.route}
                fullyOpen={fullyOpen}
                contentRef={contentRef}
                contentHeight={contentHeight}
                shouldAnimate={shouldAnimate}
                formProps={{ form, handleChange, handleSubmit, error, loading }}
                navigate={navigate}
              />
            ))}
          </div>
        </div>

        {/* 📌 Bottom: Profile/Login pinned to bottom */}
        <div className={!fullyOpen ? `pb-[28px]` : `pb-[16px]`}>
          {user ? (
            <UserProfileTab {...{ isOpen: fullyOpen, user, userName, setLogoutOpen }} />
          ) : (
            <div className="w-full" 
                style={{
                  marginBottom: !fullyOpen && !isTablet ? '48px' : '12px', // or tweak values here
                  transition: 'margin-bottom 0.2s ease',
                }}>
              <div
                onClick={onLoginClick}
                className={`flex items-center gap-[10px] ${fullyOpen ? 'px-[16px] py-[6px]' : 'justify-center py-[10px]'} 
                  transition-colors duration-200 hover:bg-[#2d384a] cursor-pointer rounded-[8px]`}
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
    </>
  )
}

function SidebarTab({ tab, isActive, fullyOpen, contentRef, formProps, navigate }) {
  const isExpandable = tab.hasContent
  const baseClass = fullyOpen ? 'px-[16px] py-[6px]' : 'justify-center h-[50px]'
  const hoverClass = isActive ? 'bg-[#374151] cursor-default' : 'hover:bg-[#2d384a] cursor-pointer'

  const [localExpanded, setLocalExpanded] = useState(isActive)
  const [contentHeight, setContentHeight] = useState(0)
  const [shouldAnimate, setShouldAnimate] = useState(false)
  const [readyToShow, setReadyToShow] = useState(isActive)

  const isExpanded = isActive && localExpanded
  const rounded =
    !fullyOpen || !isExpandable
      ? 'rounded-[8px]'
      : isExpanded
      ? 'rounded-t-[8px]'
      : 'rounded-[8px]'

  useEffect(() => {
    if (isActive) {
      setLocalExpanded(true)
      setReadyToShow(false) // hide initially to prevent flash
    } else if (localExpanded) {
      const timeout = setTimeout(() => {
        setLocalExpanded(false)
        setReadyToShow(false)
      }, 300)
      return () => clearTimeout(timeout)
    }
  }, [isActive])

  // 🧠 Run height animation logic *when localExpanded opens*
  useEffect(() => {
    if (localExpanded && fullyOpen && isActive && contentRef.current) {
      setShouldAnimate(false)
      setContentHeight(0)
      void contentRef.current.offsetHeight // force reflow
      const t = setTimeout(() => {
        setContentHeight(contentRef.current.scrollHeight)
        setShouldAnimate(true)
        setReadyToShow(true) // ✅ now it's ready to render
      }, 20)
      return () => clearTimeout(t)
    }
  }, [localExpanded, fullyOpen, isActive])

  return (
    <div>
      <div
        className={`flex items-center gap-[10px] transition-colors duration-200 ${baseClass} ${hoverClass} ${rounded}`}
        onClick={() => !isActive && navigate(tab.route)}
      >
        {tab.icon}
        {fullyOpen && (
          <div className="flex justify-between w-full items-center">
            <h2 className="text-[13px] font-bold text-gray-100">{tab.label}</h2>
            {tab.hasContent && (
              <FiChevronDown
                size={18}
                className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}
              />
            )}
          </div>
        )}
      </div>

      {fullyOpen && isExpandable && localExpanded && (
        <div
          style={{
            maxHeight: isActive ? `${contentHeight}px` : '0px',
            transition: shouldAnimate ? 'max-height 0.3s ease' : 'none',
            overflow: 'hidden',
            backgroundColor: '#1c232f',
            borderBottomLeftRadius: 8,
            borderBottomRightRadius: 8,
            marginBottom: '12px',
          }}
        >
          <div
            ref={contentRef}
            className="px-[24px] py-[16px]"
            style={{
              visibility: readyToShow ? 'visible' : 'hidden',
              opacity: readyToShow ? 1 : 0,
              transition: 'opacity 0.2s ease',
            }}
          >
            <SimulationControls {...formProps} />
          </div>
        </div>
      )}

    </div>
  )
}

