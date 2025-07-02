import React, { useEffect, useRef, useState } from 'react'
import { FiChevronDown, FiChevronUp, FiBarChart2, FiFolder, FiLogIn } from 'react-icons/fi'
import { useNavigate, useLocation } from 'react-router-dom'
import { SimulationControls, UserProfileTab, LogoutModal } from '../index'
import logoCollapsed from '../../assets/logo-light.png'
import logoFull from '../../assets/full-logo-light.png'
import { supabase } from '../../supabaseClient'

export default function CollapsibleSidebar({
  form, handleChange, handleSubmit, error, loading,
  onLoginClick, user, isTablet, isMobile, setLogoutOpen,
  visibleTabs
}) {
  const navigate = useNavigate(), location = useLocation()
  const contentRef = useRef(null)
  const isSim = location.pathname === '/simulate'
  const [isOpen, setIsOpen] = useState(false) // Always start collapsed
  const [isHovering, setIsHovering] = useState(false)
  const [userName, setUserName] = useState('')
  const [contentHeight, setContentHeight] = useState(0)
  const [shouldAnimate, setShouldAnimate] = useState(false)

  const fullyOpen = isOpen || isHovering

  // Remove the useEffect that sets isOpen based on isTablet
  // useEffect(() => setIsOpen(!isTablet), [isTablet])

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
          className="fixed top-4 left-4 z-50 w-[36px] h-[36px] bg-gray-800 rounded-full shadow-md flex items-center justify-center text-white"
        >
          <FiBarChart2 size={16} />
        </button>
      )}

      <div
        onMouseEnter={() => !isMobile && setIsHovering(true)}
        onMouseLeave={() => !isMobile && setIsHovering(false)}
        className="transition-all duration-200 ease-out h-[100vh] px-[8px] flex flex-col justify-between"
        style={{
          backgroundColor: '#1f2937',
          width: fullyOpen ? '220px' : '40px',
          paddingTop: '12px',
          paddingBottom: '12px',
          boxShadow: `0 0 ${fullyOpen ? '40px 6px' : '30px'} rgba(0,0,0,0.7)`,
          fontFamily: '"Inter", system-ui, sans-serif',
          color: '#f3f4f6',
          overflowY: 'auto',
          position: isMobile ? 'relative' : 'absolute', // Always absolute for desktop/tablet
          top: 0,
          left: 0,
          zIndex: isMobile ? 10 : 40, // Higher z-index for desktop/tablet to overlay content
        }}
      >
        {/* 🧱 Top: Logo + Tabs */}
        <div>
          <div className={`w-full mb-[24px] mt-[12px] ${fullyOpen ? 'ml-[6px]' : 'flex justify-center'}`}>
            <img
              src={fullyOpen ? logoFull : logoCollapsed}
              alt="Logo"
              className="h-[14px] object-contain"
              style={{ width: fullyOpen ? 'auto' : '14px' }}
            />
          </div>

          <div className="w-full flex flex-col gap-[6px] mb-[16px]">
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
        <div className={!fullyOpen ? `pb-[20px]` : `pb-[12px]`}>
          {user ? (
            <UserProfileTab {...{ isOpen: fullyOpen, user, userName, setLogoutOpen }} />
          ) : (
            <div className="w-full" 
                style={{
                  marginBottom: !fullyOpen && !isMobile ? '36px' : '8px',
                  transition: 'margin-bottom 0.2s ease',
                }}>
              <div
                onClick={onLoginClick}
                className={`flex items-center gap-[8px] ${fullyOpen ? 'px-[12px] py-[4px]' : 'justify-center py-[8px]'} 
                  transition-colors duration-200 hover:bg-[#2d384a] cursor-pointer rounded-[6px]`}
              >
                <FiLogIn size={14} />
                {fullyOpen && (
                  <div className="flex justify-between w-full items-center">
                    <h2 className="text-[11px] font-bold text-gray-100">Log in / Sign Up</h2>
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
  const baseClass = fullyOpen ? 'px-[12px] py-[4px]' : 'justify-center h-[40px]'
  const hoverClass = isActive ? 'bg-[#374151] cursor-default' : 'hover:bg-[#2d384a] cursor-pointer'

  const [localExpanded, setLocalExpanded] = useState(isActive)
  const [contentHeight, setContentHeight] = useState(0)
  const [shouldAnimate, setShouldAnimate] = useState(false)
  const [readyToShow, setReadyToShow] = useState(isActive)

  const textColor = isActive ? 'var(--color-sidebar-text)' : 'var(--color-sidebar-inactive)'

  const isExpanded = isActive && localExpanded
  const rounded =
    !fullyOpen || !isExpandable
      ? 'rounded-[6px]'
      : isExpanded
      ? 'rounded-t-[6px]'
      : 'rounded-[6px]'

  useEffect(() => {
    if (isActive) {
      setLocalExpanded(true)
      setReadyToShow(false) // hide initially to prevent flash
    } else if (localExpanded) {
      const timeout = setTimeout(() => {
        setLocalExpanded(false)
        setReadyToShow(false)
      }, 200) // Reduced timeout for faster animation
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
      }, 10) // Reduced timeout for faster animation
      return () => clearTimeout(t)
    }
  }, [localExpanded, fullyOpen, isActive])

  return (
    <div>
      <div
        className={`flex items-center gap-[8px] transition-colors duration-200 ${baseClass} ${hoverClass} ${rounded}`}
        onClick={() => !isActive && navigate(tab.route)}
      >
        <div style={{ 
          fontSize: '14px',
          color: textColor
        }}>
          {React.cloneElement(tab.icon, { size: 14, color: textColor })}
        </div>
        {fullyOpen && (
          <div className="flex justify-between w-full items-center">
            <h2 style={{
              fontSize: '11px',
              fontWeight: 'bold',
              color: textColor
            }}>{tab.label}</h2>
            {tab.hasContent && (
              <FiChevronDown
                size={14}
                style={{ color: textColor }}
                className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}
              />
            )}
          </div>
        )}
      </div>

      {fullyOpen && isExpandable && localExpanded && (
        <div
          style={{
            maxHeight: isActive ? `${contentHeight}px` : '0px',
            transition: shouldAnimate ? 'max-height 0.2s ease-out' : 'none', // Faster animation
            overflow: 'hidden',
            backgroundColor: '#1c232f',
            borderBottomLeftRadius: 6,
            borderBottomRightRadius: 6,
            marginBottom: '8px',
          }}
        >
          <div
            ref={contentRef}
            className="px-[16px] py-[12px]"
            style={{
              visibility: readyToShow ? 'visible' : 'hidden',
              opacity: readyToShow ? 1 : 0,
              transition: 'opacity 0.15s ease-out', // Faster opacity transition
            }}
          >
            <SimulationControls {...formProps} />
          </div>
        </div>
      )}

    </div>
  )
}

