import React, { useRef, useEffect, useState } from 'react'
import { SimulationControls } from './index'

export default function SimulationControlWrapper({ form, handleChange, handleSubmit, error, loading }) {
  const contentRef = useRef(null)
  const [contentHeight, setContentHeight] = useState(0)

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (contentRef.current) setContentHeight(contentRef.current.scrollHeight)
    }, 50)
    return () => clearTimeout(timeout)
  }, [form])

  return (
    <div
      style={{
        maxHeight: `${contentHeight}px`,
        transition: 'max-height 0.3s ease',
        overflow: 'hidden',
        backgroundColor: '#1c232f',
        borderBottomLeftRadius: 6,
        borderBottomRightRadius: 6,
        padding: '16px 24px',
      }}
      ref={contentRef}
    >
      <SimulationControls {...{ form, handleChange, handleSubmit, error, loading }} />
    </div>
  )
}
