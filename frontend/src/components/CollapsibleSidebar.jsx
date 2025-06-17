import React, { useRef, useEffect, useState } from 'react'
import { useMediaQuery } from 'react-responsive'
import {
  FiChevronDown,
  FiChevronUp,
  FiBarChart2,
  FiFolder,
  FiLogIn,
} from 'react-icons/fi'
import SimulationControls from './SimulationControls'
import { useNavigate, useLocation } from 'react-router-dom'
import logo from '../assets/logo.png'
import { supabase } from '../supabaseClient'
import LogoutModal from './LogoutModal'
import UserProfileTab from './UserProfileTab'

function CollapsibleSidebar({ form, handleChange, handleSubmit, error, loading, onLoginClick, user }) {
  const navigate = useNavigate()
  const location = useLocation()
  const collapsedWidth = 60

  const isTablet = useMediaQuery({ maxWidth: 1024 })
  const [isOpen, setIsOpen] = useState(() => !isTablet)
  const [isHovering, setIsHovering] = useState(false)

  const contentRef = useRef(null)
  const [contentHeight, setContentHeight] = useState(0)
  const [userName, setUserName] = useState('')
  const [logoutOpen, setLogoutOpen] = useState(false)

  const isSimulationRoute = location.pathname === '/simulate'

  useEffect(() => {
    setIsOpen(!isTablet)
  }, [isTablet])

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('name')
          .eq('id', user.id)
          .single()

        if (!error && profile?.name) {
          setUserName(profile.name)
        } else {
          setUserName('')
        }
      }
    }

    fetchProfile()
  }, [user])

  useEffect(() => {
    if (isSimulationRoute && contentRef.current) {
      setTimeout(() => {
        const measured = contentRef.current.scrollHeight
        setContentHeight(measured)
      }, 0)
    }
  }, [isSimulationRoute, form])

  const tabs = [
    {
      label: 'Simulation',
      icon: <FiBarChart2 size={18} style={{ verticalAlign: 'middle' }} />,
      route: '/simulate',
      hasContent: true,
    },
    {
      label: 'My Portfolio',
      icon: <FiFolder size={18} style={{ verticalAlign: 'middle' }} />,
      route: '/portfolio',
      hasContent: false,
    },
  ]

  const shouldTemporarilyOpen = isTablet && !isOpen && isHovering
  const fullyOpen = !isTablet || isOpen || shouldTemporarilyOpen

  return (
    <>
      <div
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className="transition-all duration-300 flex flex-col h-[100vh]"
        style={{
          backgroundColor: '#1f2937',
          width: fullyOpen ? '300px' : `${collapsedWidth}px`,
          paddingTop: '16px',
          paddingBottom: '16px',
          boxShadow: '12px 100px 24px rgba(0, 0, 0, 0.26)',
          fontFamily: '"Inter", system-ui, sans-serif',
          color: '#f3f4f6',
          overflowY: 'auto',
          position: isTablet ? 'absolute' : 'relative',
          top: 0,
          left: 0,
          zIndex: isTablet ? 40 : 10,
        }}
      >
        <div>
          {/* Logo */}
          <div
            className="w-full flex items-center justify-between"
            style={{
              paddingLeft: fullyOpen ? '16px' : '0px',
              paddingRight: fullyOpen ? '16px' : '0px',
              marginBottom: '20px',
              boxSizing: 'border-box',
            }}
          >
            {fullyOpen ? (
              <div className="flex items-center gap-[10px]">
                <img src={logo} alt="Logo" className="h-[40px] w-[40px] object-contain" />
                <span className="text-[18px] font-extrabold tracking-wide">ZENTARI</span>
              </div>
            ) : (
              <div className="w-full flex justify-center">
                <img src={logo} alt="Logo" className="h-[40px] w-[40px] object-contain" />
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="w-full">
            {tabs.map((tab, idx) => {
              const isActive = location.pathname === tab.route
              const isExpandable = tab.hasContent && isActive

              return (
                <div key={idx}>
                  <div
                    className={`flex items-center gap-[10px] ${
                      fullyOpen ? 'px-[16px] py-[6px]' : 'justify-center py-[10px]'
                    } transition-colors duration-200 ${
                      isActive ? 'bg-[#374151] cursor-default' : 'hover:bg-[#2d384a] cursor-pointer'
                    }`}
                    onClick={() => {
                      if (!isActive) navigate(tab.route)
                    }}
                  >
                    <div className="flex items-center">{tab.icon}</div>
                    {fullyOpen && (
                      <div className="flex justify-between w-full items-center">
                        <h2 className="text-[13px] font-bold text-gray-100">{tab.label}</h2>
                        {tab.hasContent ? (
                          isExpandable ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />
                        ) : null}
                      </div>
                    )}
                  </div>

                  {fullyOpen && tab.hasContent && tab.route === '/simulate' && (
                    <div
                      style={{
                        maxHeight: isActive ? `${contentHeight}px` : '0px',
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
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Auth Tab at Bottom */}
        <div style={{ marginTop: 'auto', marginBottom: fullyOpen ? '0px' : '8px' }}>
          {user ? (
            <UserProfileTab isOpen={fullyOpen} user={user} userName={userName} setLogoutOpen={setLogoutOpen} />
          ) : (
            <div className="w-full mt-[20px] mb-[24px]">
              <div
                className={`flex items-center gap-[10px] ${
                  fullyOpen ? 'px-[16px] py-[6px]' : 'justify-center py-[10px]'
                } transition-colors duration-200 hover:bg-[#2d384a] cursor-pointer`}
                onClick={() => onLoginClick()}
              >
                <div className="flex items-center">
                  <FiLogIn size={18} />
                </div>
                {fullyOpen && (
                  <div className="flex justify-between w-full items-center">
                    <div className="flex items-center gap-[6px]">
                      <h2 className="text-[13px] font-bold text-gray-100">
                        Log in / Sign Up
                      </h2>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <LogoutModal
        isOpen={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onLogout={() => {
          setUserName('')
        }}
      />
    </>
  )
}

export default CollapsibleSidebar
