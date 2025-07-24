import React from 'react'
import { FiArrowLeft } from 'react-icons/fi'

const SlideOverHeader = ({ onBack, title }) => {
  return (
    <div className="flex items-center gap-3 p-2 border-b" style={{ borderColor: 'var(--color-border-primary)' }}>
      {onBack && (
        <button
          onClick={onBack}
          className="p-2 rounded-lg transition-all duration-200 hover:scale-105 cursor-pointer"
          style={{ 
            color: 'var(--color-text-primary)',
            background: 'transparent'
          }}
          onMouseEnter={(e) => e.target.style.background = 'var(--color-bg-hover)'}
          onMouseLeave={(e) => e.target.style.background = 'transparent'}
        >
          <FiArrowLeft size={20} />
        </button>
      )}
      {title && (
        <h2 className="text-base" style={{ color: 'var(--color-text-primary)' }}>
          {title}
        </h2>
      )}
    </div>
  )
}

export default SlideOverHeader 