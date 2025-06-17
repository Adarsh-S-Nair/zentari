import React, { useState } from 'react'
import { RiListSettingsFill } from 'react-icons/ri'
import logo from '../assets/full-logo-dark.png'
import RightDrawer from './RightDrawer'
import SimulationControls from './SimulationControls'

export default function MobileTopbar({ form, handleChange, handleSubmit, error, loading }) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      <div
        className="mt-[20px] mx-[20px] w-full fixed top-0 left-0 h-[50px] flex items-center justify-between z-40 shadow-sm"
        style={{ backgroundColor: 'var(--color-bg)' }}
      >
        <img src={logo} alt="Zentari Logo" className="h-[18px] w-auto object-contain" />

        <button
          onClick={() => setDrawerOpen(true)}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            padding: '6px',
            borderRadius: '6px',
            cursor: 'pointer',
            color: '#111827',
            marginRight: '40px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <RiListSettingsFill size={20} />
        </button>
      </div>

      <RightDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <SimulationControls
          form={form}
          handleChange={handleChange}
          handleSubmit={(e) => {
            handleSubmit(e)
            setDrawerOpen(false) // 👈 Close drawer on submit
          }}
          error={error}
          loading={loading}
        />
      </RightDrawer>
    </>
  )
}
