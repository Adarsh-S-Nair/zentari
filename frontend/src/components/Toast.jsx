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

function Toast({ message, type = 'default', onClose, duration = 20000 }) {
  const [isVisible, setIsVisible] = useState(false)
  const [progress, setProgress] = useState(0)
  const timeoutRef = useRef(null)
  const intervalRef = useRef(null)
  const { backgroundColor, color, icon } = stylesByType[type]

  useEffect(() => {
    if (message) {
      setIsVisible(true)
      setProgress(0)

      const step = 100 / (duration / 30)
      intervalRef.current = setInterval(() => {
        setProgress((prev) => {
          const next = prev + step
          if (next >= 100) {
            clearInterval(intervalRef.current)
            setIsVisible(false)
            return 100
          }
          return next
        })
      }, 30)
    }

    return () => clearInterval(intervalRef.current)
  }, [message, duration])

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
      className={`fixed bottom-[24px] right-[24px] z-50 max-w-[480px] flex flex-col ${
        isVisible ? 'animate-slide-in' : 'animate-slide-out'
      }`}
      style={{
        backgroundColor,
        borderRadius: '8px',
        color,
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.25)',
      }}
    >
      <div className="flex items-center justify-between px-[16px] py-[10px]">
        <div className="flex items-center gap-[12px] pr-[80px]">
          <div className="flex items-center justify-center">{icon}</div>
          <span className="text-[14px] font-medium">{message}</span>
        </div>
        <div
          onClick={() => {
            setIsVisible(false)
            clearInterval(intervalRef.current)
          }}
          className="cursor-pointer flex items-center justify-center"
          style={{ color }}
        >
          <FiX size={18} />
        </div>
      </div>
      <div
        className="h-[3px] transition-all duration-30"
        style={{
          backgroundColor: color,
          width: `${100 - progress}%`,
          alignSelf: 'flex-end',
          borderBottomLeftRadius: '8px',
          borderBottomRightRadius: '8px',
        }}
      />
    </div>
  )
}

export default Toast
