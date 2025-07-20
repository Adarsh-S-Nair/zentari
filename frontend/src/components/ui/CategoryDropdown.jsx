import React, { useState, useEffect, useRef } from 'react'
import { useFinancial } from '../../contexts/FinancialContext'

const InlineCategoryDropdown = ({ 
  isOpen, 
  onClose, 
  selectedCategory, 
  onCategorySelect,
  dropdownRef
}) => {
  const { categories } = useFinancial()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedGroups, setExpandedGroups] = useState(new Set())

  // Handle clicking outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose()
        setSearchQuery('')
        setExpandedGroups(new Set())
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose, dropdownRef])

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
      setExpandedGroups(new Set())
    }
  }, [isOpen])

  // Auto-expand groups when searching
  useEffect(() => {
    if (searchQuery.trim()) {
      // Find groups that contain matching categories
      const groupsToExpand = new Set()
      const query = searchQuery.toLowerCase().trim()
      
      categories?.forEach(category => {
        if (category.name.toLowerCase().includes(query)) {
          const groupName = category.group_name || 'Other'
          groupsToExpand.add(groupName)
        }
      })
      
      setExpandedGroups(groupsToExpand)
    } else {
      setExpandedGroups(new Set())
    }
  }, [searchQuery, categories])

  const handleCategorySelect = (category) => {
    setSearchQuery('')
    onCategorySelect(category)
  }

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupName)) {
        newSet.delete(groupName)
      } else {
        newSet.add(groupName)
      }
      return newSet
    })
  }

  if (!isOpen) return null

  // Group categories by their group
  const groupedCategories = {}
  const filteredCategories = categories?.filter(cat => 
    !searchQuery || cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []
  
  filteredCategories.forEach(category => {
    const groupName = category.group_name || 'Other'
    if (!groupedCategories[groupName]) {
      groupedCategories[groupName] = {
        name: groupName,
        color: category.color, // Use first category's color for group
        categories: []
      }
    }
    groupedCategories[groupName].categories.push(category)
  })

  return (
    <div 
      ref={dropdownRef}
      className="absolute top-full left-0 mt-1 z-10 rounded-md border shadow-lg max-h-60 overflow-y-auto"
      style={{
        background: 'var(--color-bg-secondary)',
        borderColor: 'var(--color-border-primary)',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        backdropFilter: 'blur(8px)',
        width: '200px',
        maxWidth: '240px',
        scrollbarWidth: 'thin',
        scrollbarColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#252b32 #22272e' : '#cbd5e1 #f1f5f9'
      }}
    >
      <style>{`
        .category-dropdown::-webkit-scrollbar {
          width: 4px;
          background: #f1f5f9;
        }
        .category-dropdown::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 2px;
        }
        .category-dropdown::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .category-dropdown::-webkit-scrollbar-corner {
          background: #f1f5f9;
        }
        [data-theme="dark"] .category-dropdown::-webkit-scrollbar {
          background: #22272e !important;
        }
        [data-theme="dark"] .category-dropdown::-webkit-scrollbar-thumb {
          background: #252b32 !important;
        }
        [data-theme="dark"] .category-dropdown::-webkit-scrollbar-thumb:hover {
          background: #323637 !important;
        }
        [data-theme="dark"] .category-dropdown::-webkit-scrollbar-corner {
          background: #22272e !important;
        }
      `}</style>
      
      {/* Fixed Search Bar with Background */}
      <div className="sticky top-0 z-20 p-2" style={{ background: 'var(--color-bg-secondary)' }}>
        <div className="relative">
          <input
            type="text"
            placeholder="Search categories..."
            className="w-full p-1.5 pl-7 text-[12px] border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-150"
            style={{
              borderColor: 'var(--color-border-primary)',
              color: 'var(--color-text-primary)',
              background: 'var(--color-bg-primary)'
            }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <svg 
            className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 pointer-events-none"
            style={{ color: 'var(--color-text-secondary)' }}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
      
      {/* Scrollable Content */}
      <div className="p-2 category-dropdown">
        <div className="space-y-1">
          {Object.entries(groupedCategories).map(([groupName, group]) => (
            <div key={groupName}>
              {/* Group Header - Clickable */}
              <button
                onClick={() => toggleGroup(groupName)}
                className="w-full flex items-center gap-2 px-1 py-2 rounded-md text-left transition-all duration-150 cursor-pointer hover:scale-[1.02] hover:shadow-sm"
                style={{
                  color: 'var(--color-text-primary)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--color-bg-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {group.color && (
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: group.color }}
                  />
                )}
                <span className="text-[11px] flex-1">
                  {group.name}
                </span>
                <svg 
                  className={`w-3 h-3 transition-transform duration-150 flex-shrink-0 ${expandedGroups.has(groupName) ? 'rotate-180' : ''}`}
                  style={{ color: 'var(--color-text-secondary)' }}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Categories under this group */}
              {expandedGroups.has(groupName) && (
                <div className="ml-4 space-y-1">
                  {group.categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => handleCategorySelect(category)}
                      className="w-full flex items-center gap-2 px-1 py-1.5 rounded-md text-left transition-all duration-150 cursor-pointer hover:scale-[1.02] hover:shadow-sm"
                      style={{
                        background: selectedCategory?.id === category.id ? 'var(--color-bg-selected)' : 'transparent',
                        color: 'var(--color-text-primary)'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedCategory?.id !== category.id) {
                          e.currentTarget.style.background = 'var(--color-bg-hover)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedCategory?.id !== category.id) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <span className="text-[11px] truncate flex-1">
                        {category.name}
                      </span>
                      {selectedCategory?.id === category.id && (
                        <svg 
                          className="w-3 h-3 flex-shrink-0"
                          style={{ color: 'var(--color-primary)' }}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default InlineCategoryDropdown
