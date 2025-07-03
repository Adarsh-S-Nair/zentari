import React from 'react'
import Tab from '../ui/Tab'

const AccountsTabs = ({ grouped, activeTab, setActiveTab }) => {
  const tabs = [
    { key: 'cash', label: 'Cash', count: grouped?.cash?.length || 0 },
    { key: 'credit', label: 'Credit Cards', count: grouped?.credit?.length || 0 },
    { key: 'investment', label: 'Investments', count: grouped?.investment?.length || 0 },
    { key: 'loan', label: 'Loans', count: grouped?.loan?.length || 0 },
  ].filter(tab => tab.count > 0)

  return (
    <div className="flex border-b border-gray-200 mb-4 gap-2">
      {tabs.map(tab => (
        <Tab
          key={tab.key}
          id={`${tab.key}-tab`}
          label={tab.label}
          count={tab.count}
          isActive={activeTab === tab.key}
          onClick={() => setActiveTab(tab.key)}
        />
      ))}
    </div>
  )
}

export default AccountsTabs
