import React, { useState, useRef, useEffect } from 'react'
import {
  FiMenu,
  FiChevronDown,
  FiChevronUp,
  FiBarChart2,
  FiFolder,
} from 'react-icons/fi'
import SimulationControls from './SimulationControls'
import { useNavigate, useLocation } from 'react-router-dom'
import logo from '../assets/logo.png'

function CollapsibleSidebar({ form, handleChange, handleSubmit, error, loading }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(true)
  const [showSimulation, setShowSimulation] = useState(true)
  const contentRef = useRef(null)
  const [contentHeight, setContentHeight] = useState(0)

  const collapsedWidth = 60

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight)
    }
  }, [showSimulation])

  const tabs = [
    {
      label: 'Simulation',
      icon: <FiBarChart2 size={18} style={{ verticalAlign: 'middle' }} />,
      route: '/simulate',
      expanded: showSimulation,
      toggle: () => setShowSimulation(prev => !prev),
      content: (
        <div
          style={{
            maxHeight: showSimulation ? `${contentHeight}px` : '0px',
            transition: 'max-height 0.3s ease',
            overflow: 'hidden',
            backgroundColor: '#1c232f',
            borderBottomLeftRadius: '6px',
            borderBottomRightRadius: '6px',
          }}
        >
          <div ref={contentRef} className="px-[24px] py-[16px]">
            <SimulationControls
              form={form}
              handleChange={handleChange}
              handleSubmit={handleSubmit}
              error={error}
              loading={loading}
            />
          </div>
        </div>
      ),
    },
    {
      label: 'My Portfolio',
      icon: <FiFolder size={18} style={{ verticalAlign: 'middle' }} />,
      route: '/portfolio',
      expanded: false,
      toggle: null,
      content: null,
    },
  ]

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'absolute',
            top: '38px',
            left: '46px',
            backgroundColor: '#4b5563',
            border: 'none',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: '#d1d5db',
            cursor: 'pointer',
            zIndex: 20,
            boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
            transition: 'background-color 0.2s ease-in-out',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#6b7280')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#4b5563')}
        >
          <FiMenu size={16} />
        </button>
      )}

      <div
        className="transition-all duration-300 flex flex-col items-start h-[100vh]"
        style={{
          backgroundColor: '#1f2937',
          width: isOpen ? '300px' : `${collapsedWidth}px`,
          paddingTop: '16px',
          paddingBottom: '16px',
          boxShadow: '12px 100px 24px rgba(0, 0, 0, 0.26)',
          fontFamily: '"Inter", system-ui, sans-serif',
          color: '#f3f4f6',
          position: 'relative',
          zIndex: 10,
          overflowY: 'auto',
        }}
      >
        {/* Logo */}
        <div
          className="w-full flex items-center justify-between"
          style={{
            paddingLeft: isOpen ? '16px' : '0px',
            paddingRight: isOpen ? '16px' : '0px',
            marginBottom: '20px',
            boxSizing: 'border-box',
          }}
        >
          {isOpen ? (
            <div className="flex items-center gap-[10px]">
              <img src={logo} alt="Logo" className="h-[40px] w-[40px] object-contain" />
              <span className="text-[18px] font-extrabold tracking-wide">ZENTARI</span>
            </div>
          ) : (
            <div
              className="w-full flex justify-center cursor-pointer"
              onClick={() => setIsOpen(true)}
            >
              <img src={logo} alt="Logo" className="h-[40px] w-[40px] object-contain" />
            </div>
          )}

          {isOpen && (
            <div className="w-[36px] flex justify-center">
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#f3f4f6')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#9ca3af')}
              >
                <FiMenu size={20} />
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="w-full">
          {tabs.map((tab, idx) => (
            <div key={idx}>
              <div
                className={`flex items-center gap-[10px] ${
                  isOpen ? 'px-[16px] py-[6px]' : 'justify-center py-[10px]'
                } cursor-pointer transition-colors duration-200 ${
                  location.pathname === tab.route
                    ? 'bg-[#374151]'
                    : 'hover:bg-[#2d384a]'
                }`}
                onClick={() => {
                  navigate(tab.route)
                  if (tab.toggle) tab.toggle()
                }}
              >
                <div className="flex items-center">{tab.icon}</div>
                {isOpen && (
                  <div className="flex justify-between w-full items-center">
                    <h2 className="text-[13px] font-bold text-gray-100">{tab.label}</h2>
                    {tab.expanded !== undefined ? (
                      tab.expanded ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />
                    ) : null}
                  </div>
                )}
              </div>
              {isOpen && tab.content}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export default CollapsibleSidebar
