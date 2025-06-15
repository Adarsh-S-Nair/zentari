import React, { useEffect, useState, useRef } from 'react'
import { FiAlertCircle, FiCheckCircle, FiInfo, FiX } from 'react-icons/fi'

const stylesByType = {
  error: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    icon: <FiAlertCircle size={20} />,
  },
  success: {
    backgroundColor: '#dcfce7',
    color: '#16a34a',
    icon: <FiCheckCircle size={20} />,
  },
  default: {
    backgroundColor: '#dbeafe',
    color: '#2563eb',
    icon: <FiInfo size={20} />,
  },
}

function Toast({ message, type = 'default', onClose }) {
  const [isVisible, setIsVisible] = useState(false)
  const timeoutRef = useRef(null)
  const { backgroundColor, color, icon } = stylesByType[type]

  useEffect(() => {
    if (message) {
      setIsVisible(true)
    }
  }, [message])

  useEffect(() => {
    if (!isVisible && message) {
      timeoutRef.current = setTimeout(() => {
        onClose?.()
      }, 300)
    }
    return () => clearTimeout(timeoutRef.current)
  }, [isVisible, message, onClose])

  if (!message) return null

  return (
    <div
      className={`fixed bottom-[24px] right-[24px] z-50 shadow-lg max-w-[480px] flex items-center justify-between px-[16px] py-[10px] ${
        isVisible ? 'animate-slide-in' : 'animate-slide-out'
      }`}
      style={{
        backgroundColor,
        borderRadius: '8px',
        color,
      }}
    >
      <div className="flex items-center gap-[12px] pr-[80px]">
        <div className="flex items-center justify-center">{icon}</div>
        <span className="text-[14px] font-medium">{message}</span>
      </div>
      <div
        onClick={() => setIsVisible(false)}
        className="cursor-pointer flex items-center justify-center"
        style={{ color }}
      >
        <FiX size={18} />
      </div>
    </div>
  )
}

export default Toast
