import React, { useState, useContext } from 'react';
import { Button } from '../ui';
import { formatCurrency } from '../../utils/formatters';
import { FinancialContext } from '../../contexts/FinancialContext';
import { FaTimes } from 'react-icons/fa';

const TransactionFilterForm = ({ onApply, onReset, onClose }) => {
  const { categories } = useContext(FinancialContext);
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

  const handleCategoryToggle = (categoryId) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter(id => id !== categoryId)
        : [...prev.categories, categoryId]
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

  // Group categories by their group for better organization
  const groupedCategories = {};
  categories?.forEach(category => {
    const groupName = category.group_name || 'Other';
    if (!groupedCategories[groupName]) {
      groupedCategories[groupName] = [];
    }
    groupedCategories[groupName].push(category);
  });

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

      {/* Categories */}
      <div className="space-y-3">
        <label className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          Categories ({filters.categories.length} selected)
        </label>
        <div className="max-h-48 overflow-y-auto border rounded-lg p-3" style={{ 
          borderColor: 'var(--color-border-primary)',
          background: 'var(--color-bg-secondary)'
        }}>
          {Object.entries(groupedCategories).map(([groupName, groupCategories]) => (
            <div key={groupName} className="mb-4 last:mb-0">
              <div className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>
                {groupName}
              </div>
              <div className="space-y-1">
                {groupCategories.map((category) => (
                  <label
                    key={category.id}
                    className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-opacity-10"
                    style={{ 
                      background: filters.categories.includes(category.id) 
                        ? `${category.color}20` 
                        : 'transparent'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={filters.categories.includes(category.id)}
                      onChange={() => handleCategoryToggle(category.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      style={{ borderColor: 'var(--color-border-primary)' }}
                    />
                    <div className="flex items-center space-x-2 flex-1">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ background: category.color }}
                      />
                      <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                        {category.name}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
          {categories?.length === 0 && (
            <div className="text-sm text-center py-4" style={{ color: 'var(--color-text-muted)' }}>
              No categories available
            </div>
          )}
        </div>
        {filters.categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.categories.map((categoryId) => {
              const category = categories?.find(c => c.id === categoryId);
              return category ? (
                <div
                  key={categoryId}
                  className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs"
                  style={{ 
                    background: `${category.color}20`,
                    color: category.color
                  }}
                >
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ background: category.color }}
                  />
                  <span>{category.name}</span>
                  <button
                    onClick={() => handleCategoryToggle(categoryId)}
                    className="ml-1 hover:bg-opacity-20 rounded-full p-0.5"
                  >
                    <FaTimes size={8} />
                  </button>
                </div>
              ) : null;
            })}
          </div>
        )}
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