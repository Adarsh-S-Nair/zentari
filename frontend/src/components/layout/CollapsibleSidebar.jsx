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
        className="transition-all duration-200 ease-out h-[100vh] px-[8px] flex flex-col"
        style={{
          background: '#fff',
          width: fullyOpen ? '260px' : '56px',
          paddingTop: '20px',
          paddingBottom: '12px',
          boxShadow: fullyOpen ? '0 4px 24px 0 rgba(59,130,246,0.06)' : '0 1.5px 4px 0 rgba(59,130,246,0.03)',
          fontFamily: '"Inter", system-ui, sans-serif',
          color: '#222',
          overflowY: 'auto',
          position: isMobile ? 'relative' : 'fixed',
          top: 0,
          left: 0,
          zIndex: isMobile ? 110 : 200,
          border: '1.5px solid #f3f4f6',
        }}
      >
        {/* 🔷 Logo */}
        <div className={`w-full ${fullyOpen ? 'ml-[6px] mb-[14px]' : 'mb-[24px] flex justify-center'}`}>
          <img
            src={fullyOpen ? logoFull : logoCollapsed}
            alt="Logo"
            className="h-[14px] object-contain"
            style={{ width: fullyOpen ? 'auto' : '14px' }}
          />
        </div>

        {/* 🔹 Tabs */}
        <div className="w-full flex flex-col gap-[6px] mb-[16px]">
          {visibleTabs.map((tab, i) => (
            <SidebarTab
              key={i}
              tab={tab}
              isActive={currentTab === tab.route}
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
  const baseClass = fullyOpen ? 'px-[12px] py-[4px]' : 'justify-center h-[40px]'
  const hoverClass = isActive ? '' : 'hover:bg-[#e5e7fa] cursor-pointer'

  const [localExpanded, setLocalExpanded] = useState(isActive)
  const [contentHeight, setContentHeight] = useState(0)
  const [shouldAnimate, setShouldAnimate] = useState(false)
  const [readyToShow, setReadyToShow] = useState(isActive)

  const textColor = isActive ? '#fff' : '#6b7280'

  const isExpanded = isActive && localExpanded
  const rounded =
    !fullyOpen || !isExpandable
      ? 'rounded-[10px]'
      : isExpanded
      ? 'rounded-t-[10px]'
      : 'rounded-[10px]'

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
        className={`flex items-center gap-[8px] transition-colors duration-200 ${baseClass} ${hoverClass} ${rounded}`}
        onClick={() => !isActive && navigate(tab.route)}
        style={{
          background: isActive ? 'linear-gradient(90deg, #6366f1 0%, #3b82f6 100%)' : 'transparent',
          color: isActive ? '#fff' : textColor,
          fontWeight: isActive ? 700 : 500,
          fontSize: 13,
          letterSpacing: 0.2,
          marginBottom: 2,
          transition: 'transform 0.16s cubic-bezier(.4,1.5,.5,1), background 0.18s, color 0.18s',
          transform: 'scale(1)',
        }}
        onMouseEnter={e => { if (!isActive) e.currentTarget.style.transform = 'scale(1.04)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        onMouseDown={e => { if (!isActive) e.currentTarget.style.transform = 'scale(0.97) translateY(1.5px)'; }}
        onMouseUp={e => { if (!isActive) e.currentTarget.style.transform = 'scale(1.04)'; }}
      >
        <div style={{ fontSize: '14px', color: textColor }}>
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
            transition: shouldAnimate ? 'max-height 0.2s ease-out' : 'none',
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
              transition: 'opacity 0.15s ease-out',
            }}
          >
            <SimulationControls {...formProps} />
          </div>
        </div>
      )}
    </div>
  )
}
