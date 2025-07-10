import React, { useEffect, useRef, useState } from 'react'
import { FiChevronDown, FiBarChart2 } from 'react-icons/fi'
import { useNavigate, useLocation } from 'react-router-dom'
import { SimulationControls } from '../index'
import logoCollapsed from '../../assets/logo-blue.png'
import logoFull from '../../assets/full-logo-blue.png'

export default function CollapsibleSidebar({
  form, handleChange, handleSubmit, error, loading,
  onLoginClick, user, isTablet, isMobile,
  visibleTabs, currentTab
}) {
  const navigate = useNavigate(), location = useLocation()
  const contentRef = useRef(null)
  const isSim = location.pathname === '/simulate'
  const [isOpen, setIsOpen] = useState(false)
  const [isHovering, setIsHovering] = useState(false)

  const fullyOpen = isOpen || isHovering

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
        className={`transition-all duration-200 ease-out h-screen px-2 flex flex-col overflow-y-auto ${isMobile ? 'relative z-[110]' : 'fixed z-[200]'} top-0 left-0 border ${fullyOpen ? 'w-[260px] pt-5 pb-3 shadow-[0_4px_24px_0_rgba(59,130,246,0.06)]' : 'w-14 pt-5 pb-3 shadow-[0_1.5px_4px_0_rgba(59,130,246,0.03)]'} font-sans`}
        style={{ background: 'var(--color-bg-topbar)', borderColor: 'var(--color-border-primary)', color: 'var(--color-text-primary)' }}
      >
        {/* 🔷 Logo */}
        <div className={`w-full ${fullyOpen ? 'flex justify-start pl-3' : 'flex justify-center'} pb-3 border-b mb-4`} style={{ borderColor: 'var(--color-border-primary)' }}>
          <img
            src={fullyOpen ? logoFull : logoCollapsed}
            alt="Logo"
            className={`h-4 object-contain ${fullyOpen ? 'w-auto' : 'w-4'}`}
          />
        </div>

        {/* 🔹 Tabs */}
        <div className="w-full flex flex-col gap-1.5 mb-4">
          {visibleTabs.map((tab, i) => (
            <SidebarTab
              key={i}
              tab={tab}
              isActive={tab.route.startsWith('/accounts') ? location.pathname.startsWith('/accounts') : currentTab === tab.route}
              fullyOpen={fullyOpen}
              contentRef={contentRef}
              formProps={{ form, handleChange, handleSubmit, error, loading }}
              navigate={navigate}
            />
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />
      </div>
    </>
  )
}

function SidebarTab({ tab, isActive, fullyOpen, contentRef, formProps, navigate }) {
  const isExpandable = tab.hasContent
  const baseClass = fullyOpen ? 'w-full h-10 flex items-center justify-start px-3' : 'w-10 h-10 flex items-center justify-center'
  const hoverClass = isActive ? '' : 'cursor-pointer'

  const [localExpanded, setLocalExpanded] = useState(isActive)
  const [contentHeight, setContentHeight] = useState(0)
  const [shouldAnimate, setShouldAnimate] = useState(false)
  const [readyToShow, setReadyToShow] = useState(isActive)

  const textColor = isActive ? '#fff' : '#6b7280'

  const isExpanded = isActive && localExpanded
  const rounded = 'rounded-[10px]'

  const activeTabClass = isActive ? 'text-white font-bold' : '';

  useEffect(() => {
    if (isActive) {
      setLocalExpanded(true)
      setReadyToShow(false)
    } else if (localExpanded) {
      const timeout = setTimeout(() => {
        setLocalExpanded(false)
        setReadyToShow(false)
      }, 200)
      return () => clearTimeout(timeout)
    }
  }, [isActive])

  useEffect(() => {
    if (localExpanded && fullyOpen && isActive && contentRef.current) {
      setShouldAnimate(false)
      setContentHeight(0)
      void contentRef.current.offsetHeight
      const t = setTimeout(() => {
        setContentHeight(contentRef.current.scrollHeight)
        setShouldAnimate(true)
        setReadyToShow(true)
      }, 10)
      return () => clearTimeout(t)
    }
  }, [localExpanded, fullyOpen, isActive])

  return (
    <div>
      <div
        className={`flex items-center gap-2 transition-colors duration-200 ${baseClass} ${hoverClass} ${rounded} ${activeTabClass}`}
        onClick={() => !isActive && navigate(tab.route)}
        style={{ letterSpacing: 0.2, background: isActive ? 'var(--color-gradient-primary)' : 'transparent' }}
        onMouseEnter={e => {
          if (!isActive) {
            e.currentTarget.style.transform = 'scale(1.04)';
            e.currentTarget.style.background = 'var(--color-gray-200)';
          }
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.background = isActive ? undefined : 'transparent';
        }}
        onMouseDown={e => { if (!isActive) e.currentTarget.style.transform = 'scale(0.97) translateY(1.5px)'; }}
        onMouseUp={e => { if (!isActive) e.currentTarget.style.transform = 'scale(1.04)'; }}
      >
        <div className="text-[14px]" style={{ color: isActive ? 'var(--color-sidebar-text)' : 'var(--color-sidebar-text-muted)' }}>
          {React.cloneElement(tab.icon, { size: 14 })}
        </div>
        {fullyOpen && (
          <div className="flex justify-between w-full items-center">
            <h2
              className="text-[11px] font-bold"
              style={{ color: isActive ? 'var(--color-sidebar-text)' : 'var(--color-sidebar-text-muted)' }}
            >
              {tab.label}
            </h2>
            {tab.hasContent && (
              <FiChevronDown
                size={14}
                className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}
                style={{ color: isActive ? 'var(--color-sidebar-text)' : 'var(--color-sidebar-text-muted)' }}
              />
            )}
          </div>
        )}
      </div>

      {fullyOpen && isExpandable && localExpanded && (
        <div
          className={`overflow-hidden bg-slate-900 rounded-b-md mb-2 transition-[max-height] duration-200 ease-out`}
          style={{ maxHeight: isActive ? `${contentHeight}px` : '0px' }}
        >
          <div
            ref={contentRef}
            className={`px-4 py-3 bg-slate-900 rounded-b-md transition-opacity duration-150 ease-out ${readyToShow ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
          >
            <SimulationControls {...formProps} />
          </div>
        </div>
      )}
    </div>
  )
}
