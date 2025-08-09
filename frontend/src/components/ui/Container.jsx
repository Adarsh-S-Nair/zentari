import React from 'react'

/*
A responsive container that centers content with sensible gutters.
Props:
- size: 'lg' | 'xl' | '2xl' (default: 'xl') controls max width
- className: extra classes
*/
export default function Container({ size = 'xl', className = '', children, ...props }) {
  const sizeClass = size === '2xl' ? 'max-w-[1280px]' : size === 'lg' ? 'max-w-[1000px]' : 'max-w-[1200px]'
  return (
    <div className={`w-full ${sizeClass} mx-auto px-3 sm:px-4 md:px-6 ${className}`} {...props}>
      {children}
    </div>
  )
} 