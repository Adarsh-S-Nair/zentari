import React from 'react'

function Tab({ id, label, count, isActive, onClick }) {
  return (
    <button
      id={id}
      onClick={onClick}
      className={`relative flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors rounded-t-md focus:outline-none
        ${isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-light)] hover:text-[var(--color-text)]'}
      `}
    >
      <span>{label}</span>
      {typeof count === 'number' && (
        <div
          className={`text-xs font-semibold px-[6px] py-[2px] rounded-full min-w-[16px] text-center transition-colors
            ${isActive 
              ? 'bg-[var(--color-primary)] text-white' 
              : 'bg-[var(--color-gray-200)] text-[var(--color-text-muted)]'}
          `}
        >
          {count}
        </div>
      )}
      {isActive && (
        <div
          className="absolute bottom-[-2px] left-0 right-0 h-[2px] bg-[var(--color-primary)] rounded transition-all duration-300"
        />
      )}
    </button>
  )
}

export default Tab
