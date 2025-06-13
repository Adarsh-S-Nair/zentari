import React from 'react'

function Spinner() {
  return (
    <div className="flex justify-center items-center h-full">
      <div
        className="w-[40px] h-[40px] rounded-full border-[4px] border-[#509cf4] border-t-transparent animate-spin"
        style={{
          animation: 'spin 1s linear infinite'
        }}
      ></div>

      {/* Fallback keyframe in case Tailwind's `animate-spin` doesn't work */}
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
