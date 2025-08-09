import React, { useState, useContext, useEffect } from 'react';
import { Button, CustomCheckbox } from '../ui';
import { formatCurrency } from '../../utils/formatters';
import { FinancialContext } from '../../contexts/FinancialContext';
import { FaTimes } from 'react-icons/fa';
import { FiSearch, FiChevronDown } from 'react-icons/fi';

const TransactionFilterForm = ({ onApply, onReset, onClose, currentFilters }) => {
  const { categories } = useContext(FinancialContext);
  
  // Initialize filters with current filters or defaults
  const [filters, setFilters] = useState(() => {
    if (currentFilters) {
      return {
        dateRange: currentFilters.dateRange || 'all',
        customStartDate: currentFilters.customStartDate || '',
        customEndDate: currentFilters.customEndDate || '',
        amountRange: currentFilters.amountRange || 'all',
        categories: currentFilters.categories || [],
        accounts: currentFilters.accounts || [],
        searchQuery: currentFilters.searchQuery || '',
        transactionType: currentFilters.transactionType || 'all'
      };
    }
    return {
      dateRange: 'all',
      customStartDate: '',
      customEndDate: '',
      amountRange: 'all',
      categories: [],
      accounts: [],
      searchQuery: '',
      transactionType: 'all'
    };
  });

  // Category search and expansion state
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [expandedCategoryGroups, setExpandedCategoryGroups] = useState(new Set());

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

  // Auto-expand groups when searching categories
  useEffect(() => {
    if (categorySearchQuery.trim()) {
      // Find groups that contain matching categories
      const groupsToExpand = new Set();
      const query = categorySearchQuery.toLowerCase().trim();
      
      categories?.forEach(category => {
        if (category.name.toLowerCase().includes(query)) {
          const groupName = category.group_name || 'Other';
          groupsToExpand.add(groupName);
        }
      });
      
      setExpandedCategoryGroups(groupsToExpand);
    } else {
      setExpandedCategoryGroups(new Set());
    }
  }, [categorySearchQuery, categories]);

  // Auto-expand groups that contain selected categories when form opens
  useEffect(() => {
    if (filters.categories.length > 0 && categories) {
      const groupsToExpand = new Set();
      
      filters.categories.forEach(categoryId => {
        const category = categories.find(c => c.id === categoryId);
        if (category) {
          const groupName = category.group_name || 'Other';
          groupsToExpand.add(groupName);
        }
      });
      
      setExpandedCategoryGroups(prev => new Set([...prev, ...groupsToExpand]));
    }
  }, [filters.categories, categories]);

  const toggleCategoryGroup = (groupName) => {
    setExpandedCategoryGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
    });
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleReset = () => {
    setFilters({
      dateRange: 'all',
      customStartDate: '',
      customEndDate: '',
      amountRange: 'all',
      categories: [],
      accounts: [],
      searchQuery: '',
      transactionType: 'all'
    });
    setCategorySearchQuery('');
    setExpandedCategoryGroups(new Set());
    onReset();
  };

  // Group categories by their group for better organization
  const groupedCategories = {};
  const filteredCategories = categories?.filter(cat => 
    !categorySearchQuery || cat.name.toLowerCase().includes(categorySearchQuery.toLowerCase())
  ) || [];
  
  filteredCategories.forEach(category => {
    const groupName = category.group_name || 'Other';
    if (!groupedCategories[groupName]) {
      groupedCategories[groupName] = {
        name: groupName,
        color: category.color, // Use first category's color for group
        categories: []
      };
    }
    groupedCategories[groupName].categories.push(category);
  });

  return (
    <div className="p-6 space-y-6">
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
        {filters.dateRange === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <div className="space-y-1">
              <label className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Start date</label>
              <input
                type="date"
                value={filters.customStartDate}
                onChange={(e) => handleFilterChange('customStartDate', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  borderColor: 'var(--color-border-primary)',
                  color: 'var(--color-text-primary)',
                  background: 'var(--color-bg-secondary)'
                }}
                max={filters.customEndDate || undefined}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>End date</label>
              <input
                type="date"
                value={filters.customEndDate}
                onChange={(e) => handleFilterChange('customEndDate', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  borderColor: 'var(--color-border-primary)',
                  color: 'var(--color-text-primary)',
                  background: 'var(--color-bg-secondary)'
                }}
                min={filters.customStartDate || undefined}
              />
            </div>
          </div>
        )}
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
        
        {/* Category Search Bar */}
        <div className="relative">
          <FiSearch 
            className="absolute left-3 top-1/2 transform -translate-y-1/2" 
            size={16} 
            style={{ color: 'var(--color-text-secondary)' }}
          />
          <input
            type="text"
            placeholder="Search categories..."
            className="w-full pl-10 pr-4 py-2 text-sm border rounded-t-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-150"
            style={{
              borderColor: 'var(--color-border-primary)',
              color: 'var(--color-text-primary)',
              background: 'var(--color-bg-secondary)'
            }}
            value={categorySearchQuery}
            onChange={(e) => setCategorySearchQuery(e.target.value)}
          />
        </div>

        {/* Categories List - Attached to search bar */}
        <div className="max-h-64 overflow-y-auto border rounded-b-xl" style={{ 
          borderColor: 'var(--color-border-primary)',
          background: 'var(--color-bg-secondary)',
          marginTop: '-8px', // Attach to search bar
          borderTop: 'none' // Remove top border to attach to search bar
        }}>
          <div className="w-full box-border mx-auto overflow-x-hidden">
            {Object.entries(groupedCategories).map(([groupName, group]) => (
              <div key={groupName}>
                {/* Group Header - Clickable */}
                <button
                  onClick={() => toggleCategoryGroup(groupName)}
                  className="w-full flex items-center px-4 py-3 min-h-[48px] transition-all duration-200 cursor-pointer"
                  style={{
                    background: expandedCategoryGroups.has(groupName) ? 'var(--color-bg-hover)' : 'var(--color-bg-primary)',
                    color: 'var(--color-text-primary)'
                  }}
                  onMouseEnter={(e) => {
                    if (!expandedCategoryGroups.has(groupName)) {
                      e.currentTarget.style.background = 'var(--color-bg-hover)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!expandedCategoryGroups.has(groupName)) {
                      e.currentTarget.style.background = 'var(--color-bg-primary)';
                    }
                  }}
                >
                  {/* Group color dot */}
                  {group.color && (
                    <div className="flex-shrink-0 mr-3 w-2.5 h-2.5 rounded-full" style={{ 
                      background: group.color
                    }} />
                  )}
                  
                  {/* Group name */}
                  <div className="flex-1 text-left">
                    <div className="text-[14px]" style={{ color: 'var(--color-text-primary)' }}>
                      {group.name}
                    </div>
                  </div>
                  
                  {/* Expand/collapse arrow */}
                  <FiChevronDown 
                    className={`w-4 h-4 transition-transform duration-200 flex-shrink-0 ${expandedCategoryGroups.has(groupName) ? 'rotate-180' : ''}`}
                    style={{ color: 'var(--color-text-secondary)' }}
                  />
                </button>

                {/* Categories under this group - Animated */}
                <div 
                  className="overflow-hidden transition-all duration-200 ease-in-out"
                  style={{
                    maxHeight: expandedCategoryGroups.has(groupName) ? `${group.categories.length * 48}px` : '0px',
                    opacity: expandedCategoryGroups.has(groupName) ? 1 : 0,
                    background: expandedCategoryGroups.has(groupName) ? 'var(--color-bg-hover)' : 'transparent'
                  }}
                >
                  {group.categories.map((category, index) => (
                    <div
                      key={category.id}
                      className="w-full flex items-center py-3 min-h-[48px] transition-all duration-200 cursor-pointer"
                      style={{
                        background: filters.categories.includes(category.id) ? 'var(--color-primary-bg)' : 'transparent',
                        color: 'var(--color-text-primary)',
                        paddingLeft: 'calc(1rem + 1.5rem)' // 16px + 24px for indentation
                      }}
                      onMouseEnter={(e) => {
                        if (!filters.categories.includes(category.id)) {
                          e.currentTarget.style.background = 'var(--color-bg-secondary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!filters.categories.includes(category.id)) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                      onClick={() => handleCategoryToggle(category.id)}
                    >
                      <CustomCheckbox
                        checked={filters.categories.includes(category.id)}
                        onChange={() => handleCategoryToggle(category.id)}
                        className="mr-3"
                      />
                      
                      {/* Category color dot */}
                      <div className="flex-shrink-0 mr-3 w-2.5 h-2.5 rounded-full" style={{ 
                        background: category.color || 'var(--color-primary)'
                      }} />
                      
                      {/* Category name */}
                      <div className="flex-1 text-left">
                        <div className="text-[14px] truncate" style={{ color: 'var(--color-text-primary)' }}>
                          {category.name}
                        </div>
                      </div>
                    </div>
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
        </div>

        {/* Selected Categories Pills */}
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