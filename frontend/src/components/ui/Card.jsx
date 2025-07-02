import React from 'react'

function Card({ children, className = '', style = {} }) {
  return (
    <div
      className={`bg-white rounded-[8px] ${className}`}
      style={{
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        border: '1px solid #e5e7eb',
        boxSizing: 'border-box',
        ...style
      }}
    >
      {children}
    </div>
  )
}

export default Card 