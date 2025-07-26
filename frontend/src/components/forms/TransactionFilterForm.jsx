import React, { useState } from 'react';
import { Button } from '../ui';
import { formatCurrency } from '../../utils/formatters';

const TransactionFilterForm = ({ onApply, onReset, onClose }) => {
  const [filters, setFilters] = useState({
    dateRange: 'all',
    amountRange: 'all',
    categories: [],
    accounts: [],
    searchQuery: '',
    transactionType: 'all' // 'all', 'income', 'expense'
  });

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleReset = () => {
    setFilters({
      dateRange: 'all',
      amountRange: 'all',
      categories: [],
      accounts: [],
      searchQuery: '',
      transactionType: 'all'
    });
    onReset();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Filter Transactions
        </h2>
      </div>

      {/* Date Range */}
      <div className="space-y-2">
        <label className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          Date Range
        </label>
        <select
          value={filters.dateRange}
          onChange={(e) => handleFilterChange('dateRange', e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{
            borderColor: 'var(--color-border-primary)',
            color: 'var(--color-text-primary)',
            background: 'var(--color-bg-secondary)'
          }}
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="quarter">This Quarter</option>
          <option value="year">This Year</option>
          <option value="custom">Custom Range</option>
        </select>
      </div>

      {/* Transaction Type */}
      <div className="space-y-2">
        <label className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          Transaction Type
        </label>
        <select
          value={filters.transactionType}
          onChange={(e) => handleFilterChange('transactionType', e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{
            borderColor: 'var(--color-border-primary)',
            color: 'var(--color-text-primary)',
            background: 'var(--color-bg-secondary)'
          }}
        >
          <option value="all">All Transactions</option>
          <option value="income">Income Only</option>
          <option value="expense">Expenses Only</option>
        </select>
      </div>

      {/* Amount Range */}
      <div className="space-y-2">
        <label className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          Amount Range
        </label>
        <select
          value={filters.amountRange}
          onChange={(e) => handleFilterChange('amountRange', e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{
            borderColor: 'var(--color-border-primary)',
            color: 'var(--color-text-primary)',
            background: 'var(--color-bg-secondary)'
          }}
        >
          <option value="all">All Amounts</option>
          <option value="small">Under $50</option>
          <option value="medium">$50 - $500</option>
          <option value="large">Over $500</option>
          <option value="custom">Custom Range</option>
        </select>
      </div>

      {/* Search Query */}
      <div className="space-y-2">
        <label className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          Search Description
        </label>
        <input
          type="text"
          placeholder="Search transaction descriptions..."
          value={filters.searchQuery}
          onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{
            borderColor: 'var(--color-border-primary)',
            color: 'var(--color-text-primary)',
            background: 'var(--color-bg-secondary)'
          }}
        />
      </div>

      {/* Placeholder for Categories */}
      <div className="space-y-2">
        <label className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          Categories
        </label>
        <div className="px-3 py-2 border rounded-lg text-sm" style={{ 
          borderColor: 'var(--color-border-primary)',
          color: 'var(--color-text-muted)',
          background: 'var(--color-bg-secondary)'
        }}>
          <span className="text-xs">Category filtering coming soon...</span>
        </div>
      </div>

      {/* Placeholder for Accounts */}
      <div className="space-y-2">
        <label className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          Accounts
        </label>
        <div className="px-3 py-2 border rounded-lg text-sm" style={{ 
          borderColor: 'var(--color-border-primary)',
          color: 'var(--color-text-muted)',
          background: 'var(--color-bg-secondary)'
        }}>
          <span className="text-xs">Account filtering coming soon...</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          label="Reset"
          onClick={handleReset}
          width="w-full"
          color="gray"
          className="h-10"
        />
        <Button
          label="Apply Filters"
          onClick={handleApply}
          width="w-full"
          color="networth"
          className="h-10"
        />
      </div>
    </div>
  );
};

export default TransactionFilterForm; 