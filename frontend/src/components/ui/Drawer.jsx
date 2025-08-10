import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMediaQuery } from 'react-responsive'
import { FiX } from 'react-icons/fi'

export default function Drawer({ isOpen, onClose, header, children }) {
  const isMobile = useMediaQuery({ maxWidth: 670 })
  const [isVisible, setIsVisible] = useState(false)
  const panelRef = useRef(null)
  const backdropRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    setIsVisible(true)
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  if (!isOpen) return null

  const handleBackdropClick = (e) => {
    // Close only when clicking on backdrop
    if (e.target === backdropRef.current) onClose?.()
  }

  return createPortal(
    <div ref={backdropRef} onClick={handleBackdropClick} className="fixed inset-0 z-[200]" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div
        ref={panelRef}
        className={`absolute z-[300] shadow-2xl border overflow-hidden ${isMobile ? 'inset-x-0 bottom-0 w-full rounded-t-2xl' : 'inset-y-8 right-4 w-[420px] rounded-2xl'}`}
        style={{
          height: isMobile ? '80vh' : 'calc(100vh - 4rem)',
          transform: isVisible ? 'translate(0, 0)' : (isMobile ? 'translateY(100%)' : 'translateX(100%)'),
          transition: 'transform 160ms ease-out',
          borderColor: 'var(--color-border-primary)',
          background: 'var(--color-bg-primary)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border-primary)' }}>
          <h2 className="text-[14px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{header}</h2>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-100 cursor-pointer" aria-label="Close" title="Close" style={{ color: 'var(--color-text-muted)' }}>
            <FiX size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
} 