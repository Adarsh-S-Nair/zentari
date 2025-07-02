import React from 'react'
import { Tab } from '../ui'

const AccountsTabs = ({ grouped, activeTab, setActiveTab }) => {
  return (
    <div style={{
      display: 'flex',
      position: 'relative',
      marginBottom: '16px',
      gap: '8px'
    }}>
      {grouped?.cash?.length > 0 && (
        <Tab
          id="cash-tab"
          label="Cash"
          isActive={activeTab === 'cash'}
          onClick={() => setActiveTab('cash')}
        />
      )}
      {grouped?.credit?.length > 0 && (
        <Tab
          id="credit-tab"
          label="Credit Cards"
          isActive={activeTab === 'credit'}
          onClick={() => setActiveTab('credit')}
        />
      )}
      {grouped?.investment?.length > 0 && (
        <Tab
          id="investment-tab"
          label="Investments"
          isActive={activeTab === 'investment'}
          onClick={() => setActiveTab('investment')}
        />
      )}
      {grouped?.loan?.length > 0 && (
        <Tab
          id="loan-tab"
          label="Loans"
          isActive={activeTab === 'loan'}
          onClick={() => setActiveTab('loan')}
        />
      )}
    </div>
  )
}

export default AccountsTabs 