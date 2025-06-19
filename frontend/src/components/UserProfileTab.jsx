import React, { useEffect, useRef, useState } from 'react'
import { FaUserCircle } from 'react-icons/fa'
import { MdOutlineLogout } from 'react-icons/md'
import { IoMdSettings } from 'react-icons/io'
import { FaEllipsisVertical } from 'react-icons/fa6'
import { supabase } from '../supabaseClient'

export default function UserProfileTab({ isOpen, user, userName: externalUserName, setLogoutOpen: externalSetLogoutOpen, mobile = false }) {
  const [userName, setUserName] = useState(externalUserName || '')
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuCoords, setMenuCoords] = useState({ top: 0, left: 0 })
  const iconRef = useRef(null), triggerRef = useRef(null), menuRef = useRef(null)

  useEffect(() => {
    if (!externalUserName && user) {
      supabase.from('user_profiles').select('name').eq('id', user.id).single().then(({ data, error }) => {
        if (!error && data?.name) setUserName(data.name)
      })
    }
  }, [user])

  useEffect(() => {
    const closeMenu = (e) => {
      if (!menuRef.current?.contains(e.target) && !triggerRef.current?.contains(e.target) && !iconRef.current?.contains(e.target)) setMenuOpen(false)
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('click', closeMenu)
    document.addEventListener('keydown', closeMenu)
    return () => {
      document.removeEventListener('click', closeMenu)
      document.removeEventListener('keydown', closeMenu)
    }
  }, [])

  const openMenu = () => {
    const ref = mobile ? iconRef : triggerRef
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    setMenuCoords({
      top: mobile ? rect.top - 100 : rect.top - 60,
      left: mobile ? rect.left - 24 + rect.width / 2 : rect.right + 8,
    })
    setMenuOpen(true)
  }

  const Menu = (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: `${menuCoords.top}px`,
        left: `${menuCoords.left}px`,
        transform: mobile ? 'translateX(-50%)' : 'none',
        backgroundColor: '#f9fafb',
        color: '#374151',
        borderRadius: '10px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
        padding: '8px 0',
        minWidth: '140px',
        zIndex: 9999,
      }}
    >
      <div className="flex items-center gap-[6px] text-[13px] font-semibold px-[12px] py-[8px] hover:bg-[#f3f4f6] cursor-pointer transition" onClick={() => setMenuOpen(false)}>
        <IoMdSettings size={14} color="#374151" /> Settings
      </div>
      <div
        className="flex items-center gap-[6px] text-[13px] font-semibold px-[12px] py-[8px] hover:bg-[#f3f4f6] cursor-pointer transition"
        style={{ color: '#dc2626' }}
        onClick={() => {
          setMenuOpen(false)
          if (externalSetLogoutOpen) externalSetLogoutOpen(true)
        }}
      >
        <MdOutlineLogout size={14} color="#dc2626" /> Log out
      </div>
    </div>
  )

  if (mobile) {
    const isHighlighted = menuOpen
    return (
      <>
        <button
          ref={iconRef}
          onClick={openMenu}
          style={{
            flex: 1,
            height: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            color: isHighlighted ? '#ffffff' : '#9ca3af',
            fontSize: '11px',
            cursor: 'pointer',
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={(e) => !isHighlighted && (e.currentTarget.style.color = '#d1d5db')}
          onMouseLeave={(e) => !isHighlighted && (e.currentTarget.style.color = '#9ca3af')}
        >
          <FaUserCircle size={20} />
        </button>
        {menuOpen && Menu}
      </>
    )
  }

  return (
    <>
      <div className="w-full mt-[20px] mb-[12px]">
        <div className={`flex items-center gap-[10px] ${isOpen ? 'px-[16px] py-[6px]' : 'justify-center py-[10px]'}`}>
          <div
            ref={iconRef}
            className="flex items-center"
            onClick={() => !isOpen && openMenu()}
            style={{ cursor: !isOpen ? 'pointer' : 'default' }}
          >
            <FaUserCircle size={18} color="#f3f4f6" />
          </div>
          {isOpen && (
            <div className="flex justify-between w-full items-center">
              <div className="flex items-center gap-[6px]">
                <h2 className="text-[13px] font-bold text-gray-100">{userName || 'Logged in'}</h2>
              </div>
              <div
                ref={triggerRef}
                onClick={openMenu}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'background-color 0.1s ease-in-out',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#374151')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <FaEllipsisVertical size={16} color="#d1d5db" />
              </div>
            </div>
          )}
        </div>
      </div>
      {menuOpen && Menu}
    </>
  )
}
