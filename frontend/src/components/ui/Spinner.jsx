import React from 'react'

function Spinner({ label }) {
  return (
    <div className="flex flex-col justify-center items-center h-full gap-[12px]">
      <div
        className="w-[40px] h-[40px] rounded-full border-[4px] border-[#509cf4] border-t-transparent animate-spin"
        style={{
          animation: 'spin 1s linear infinite'
        }}
      ></div>

      {label && (
        <div
          style={{
            fontSize: '11px',
            color: '#6b7280',
            textAlign: 'center'
          }}
        >
          {label}
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  )
}

export default Spinner
