import React, { useEffect, useState, useRef } from 'react'
import { FaUserCircle } from 'react-icons/fa'
import { MdOutlineLogout } from "react-icons/md";
import { IoMdSettings } from "react-icons/io";
import { FaEllipsisVertical } from "react-icons/fa6";



export default function UserProfileTab({ isOpen, user, userName, setLogoutOpen }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuCoords, setMenuCoords] = useState({ top: 0, left: 0 })
  const triggerRef = useRef(null)
  const iconRef = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        !menuRef.current?.contains(e.target) &&
        !triggerRef.current?.contains(e.target) &&
        !iconRef.current?.contains(e.target)
      ) {
        setMenuOpen(false)
      }
    }

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const openMenu = (fromCollapsed = false) => {
    const ref = fromCollapsed ? iconRef : triggerRef
    if (!ref.current) return

    const rect = ref.current.getBoundingClientRect()
    setMenuCoords({
      top: rect.bottom,
      left: rect.right + 8,
    })
    setMenuOpen(true)
  }

  return (
    <>
      <div className="w-full mt-[20px] mb-[24px]">
        <div
          className={`flex items-center gap-[10px] ${
            isOpen ? 'px-[16px] py-[6px]' : 'justify-center py-[10px]'
          } transition-colors duration-200`}
        >
          <div
            ref={iconRef}
            className="flex items-center"
            onClick={() => {
              if (!isOpen) openMenu(true)
            }}
            style={{
              cursor: !isOpen ? 'pointer' : 'default',
            }}
          >
            <FaUserCircle size={18} color="#f3f4f6" />
          </div>

          {isOpen && (
            <div className="flex justify-between w-full items-center">
              <div className="flex items-center gap-[6px]">
                <h2 className="text-[13px] font-bold text-gray-100">
                  {userName || 'Logged in'}
                </h2>
              </div>
              <div
                ref={triggerRef}
                onClick={() => openMenu(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'background-color 0.1s ease-in-out',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = '#374151')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = 'transparent')
                }
              >
                <FaEllipsisVertical  size={16} color="#d1d5db" />
              </div>
            </div>
          )}
        </div>
      </div>

      {menuOpen && (
        <div
          ref={menuRef}
          className="z-[9999]"
          style={{
            position: 'fixed',
            top: `${menuCoords.top}px`,
            left: `${menuCoords.left}px`,
            transform: 'translateY(-100%)',
            backgroundColor: '#f9fafb',
            color: '#374151',
            borderRadius: '10px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
            padding: '8px 0',
            minWidth: '140px',
          }}
        >
          <div
            className="flex items-center gap-[6px] text-[13px] font-semibold px-[12px] py-[8px] hover:bg-[#f3f4f6] cursor-pointer transition"
            onClick={() => {
              console.log('Clicked settings')
              setMenuOpen(false)
            }}
          >
            <IoMdSettings  size={14} color="#374151" />
            Settings
          </div>

          <div
            className="flex items-center gap-[6px] text-[13px] font-semibold px-[12px] py-[8px] hover:bg-[#f3f4f6] cursor-pointer transition"
            style={{ color: '#dc2626' }}
            onClick={() => {
              setMenuOpen(false)
              setLogoutOpen(true)
            }}
          >
            <MdOutlineLogout size={14} color="#dc2626" />
            Log out
          </div>
        </div>
      )}
    </>
  )
}
