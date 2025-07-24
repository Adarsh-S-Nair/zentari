import React from 'react'
import SlideOverHeader from './SlideOverHeader'

const SlideOver = ({ 
  children, 
  title, 
  onBack, 
  showHeader = true,
  className = "",
  contentClassName = ""
}) => {
  return (
    <div className={`w-full h-full flex flex-col ${className}`} style={{ background: 'var(--color-bg-primary)' }}>
      {/* Header - only show if title is provided or onBack is provided */}
      {showHeader && (title || onBack) && (
        <SlideOverHeader onBack={onBack} title={title} />
      )}

      {/* Scrollable content area */}
      <div className={`flex-1 overflow-y-auto category-list-scrollbar ${contentClassName}`}>
        {children}
      </div>
    </div>
  )
}

export default SlideOver 