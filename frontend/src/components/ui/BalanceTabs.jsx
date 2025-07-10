import React, { useState } from 'react';
import { formatCurrency } from '../../utils/formatters';

const BalanceTabs = ({ balances = {}, onTabChange }) => {
  const [activeTab, setActiveTab] = useState('current');

  const tabs = [
    { id: 'current', label: 'Current', value: balances.current, available: balances.current != null },
    { id: 'available', label: 'Available', value: balances.available, available: balances.available != null },
    { id: 'limit', label: 'Limit', value: balances.limit, available: balances.limit != null }
  ].filter(tab => tab.available);

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    if (onTabChange) {
      onTabChange(tabId);
    }
  };

  if (tabs.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {/* Tabs Container - Outer Pill */}
      <div 
        className="flex relative rounded-full w-fit overflow-hidden"
        style={{ background: 'rgba(0, 0, 0, 0.08)' }}
      >
        {/* Selected Tab Background - Full Height Pill */}
        <div
          className="absolute top-0 bottom-0 left-0 rounded-full transition-transform duration-200 ease-out"
          style={{
            width: `${100 / tabs.length}%`,
            transform: `translateX(${tabs.findIndex(tab => tab.id === activeTab) * 100}%)`,
            background: 'rgba(255, 255, 255, 0.26)'
          }}
        />

        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`
                px-4 py-2 text-xs font-medium transition-all duration-200 ease-out rounded-full flex items-center justify-center cursor-pointer relative z-10
                ${isActive 
                  ? 'text-white scale-100' 
                  : 'text-white text-opacity-70 hover:text-opacity-100 hover:scale-105'}
                active:scale-95 transform
              `}
              style={{
                color: 'var(--color-text-white)',
                height: '28px',
                minWidth: `${100 / tabs.length}%`
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      
      {/* Active Tab Content */}
      <div className="flex flex-col items-start">
        <span className="text-[13px] font-medium opacity-80 tracking-wide mb-1" style={{ color: 'var(--color-text-white)' }}>
          {tabs.find(tab => tab.id === activeTab)?.label} Balance
        </span>
        <span className="text-[20px] font-medium -tracking-[0.5px] opacity-92" style={{ color: 'var(--color-text-white)' }}>
          {tabs.find(tab => tab.id === activeTab)?.value != null 
            ? formatCurrency(tabs.find(tab => tab.id === activeTab)?.value) 
            : 'N/A'
          }
        </span>
      </div>
    </div>
  );
};

export default BalanceTabs;
