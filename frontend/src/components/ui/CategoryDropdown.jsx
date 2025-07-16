import React, { useState, useEffect } from 'react'
import { useFinancial } from '../../contexts/FinancialContext'
import Button from './Button'
import { FaWrench } from 'react-icons/fa'

const categoryListStyles = `
  @keyframes slideInUp {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .category-group-content {
    transition: all 0.15s ease-out;
    overflow: hidden;
  }
  
  .category-group-content.expanded {
    max-height: 500px;
    transform: translateY(0);
  }
  
  .category-group-content.collapsed {
    max-height: 0;
    transform: translateY(-2px);
  }
`

const CategoryDropdown = ({ 
  isOpen, 
  onClose, 
  selectedCategory, 
  onCategorySelect,
  onCreateRule
}) => {
  const { categories } = useFinancial()
  const [expandedGroup, setExpandedGroup] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const groupedCategories = React.useMemo(() => {
    if (!categories) return {}
    const grouped = {}
    const query = searchQuery.toLowerCase().trim()

    categories.forEach(category => {
      // Use group info from category_groups
      const groupName = category.group_name || 'Other'
      const groupId = category.group_id || 'other'
      const groupColor = category.color // fallback to category color for now
      // Search by category name or group name
      if (query && !category.name.toLowerCase().includes(query) &&
          !(groupName && groupName.toLowerCase().includes(query))) {
        return
      }
      if (!grouped[groupId]) {
        grouped[groupId] = {
          name: groupName,
          color: groupColor,
          categories: []
        }
      }
      grouped[groupId].categories.push(category)
    })

    return grouped
  }, [categories, searchQuery])

  const toggleGroup = (groupName) => {
    setExpandedGroup(prev => prev === groupName ? null : groupName)
  }

  const handleCategorySelect = (category) => {
    setSearchQuery('')
    setExpandedGroup(null)
    onCategorySelect(category)
  }

  useEffect(() => {
    if (searchQuery.trim()) {
      // When searching, expand the first group that has results
      const firstGroupWithResults = Object.keys(groupedCategories).find(groupName => 
        groupedCategories[groupName].categories.length > 0
      )
      setExpandedGroup(firstGroupWithResults || null)
    } else {
      setExpandedGroup(null)
    }
  }, [searchQuery, groupedCategories])

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
      setExpandedGroup(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      <style>{categoryListStyles}</style>
      <div className="overflow-hidden max-h-none opacity-100 px-4 pt-3 pb-5">
        <div className="grid grid-cols-1">
          {/* Search and Create Rule */}
          <div className="flex items-center gap-2 pb-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-3 pr-10 border text-[13px] bg-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  borderColor: 'var(--color-border-primary)',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'inherit',
                  background: 'var(--color-bg-primary)'
                }}
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center h-full">
                <svg 
                  className="w-4 h-4 pointer-events-none"
                  style={{ color: 'var(--color-text-secondary)' }}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
            </div>
            <button
              onClick={onCreateRule}
              className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer hover:scale-105"
              style={{
                color: 'var(--color-text-white)',
                background: 'var(--color-gradient-primary)'
              }}
            >
              <FaWrench size={16} />
            </button>
          </div>

          {/* Category Groups */}
          {Object.entries(groupedCategories).map(([groupName, group]) => (
            <div key={groupName}>
              <button
                onClick={() => toggleGroup(groupName)}
                className="w-full flex items-center gap-3 px-2 py-3 rounded-md transition-colors duration-100 text-left cursor-pointer"
                style={{ 
                  backgroundColor: 'transparent',
                  color: 'var(--color-text-primary)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: group.color }}
                />
                <span className="text-[13px] flex-1">{group.name}</span>
                <svg 
                  className={`w-4 h-4 transition-transform duration-100 ${expandedGroup === groupName ? 'rotate-180' : ''}`}
                  style={{ color: 'var(--color-text-secondary)' }}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Categories */}
              <div 
                className={`category-group-content ${
                  expandedGroup === groupName ? 'expanded' : 'collapsed'
                }`}
              >
                <div className="ml-6 py-1">
                  {group.categories.map((category) => {
                    const isSelected = selectedCategory?.id === category.id
                    return (
                      <button
                        key={category.id}
                        onClick={() => handleCategorySelect(category)}
                        className="w-full px-3 py-2 text-left rounded-md text-[13px] transition-colors duration-75 cursor-pointer"
                        style={{
                          backgroundColor: isSelected ? 'var(--color-bg-primary)' : 'transparent',
                          color: 'var(--color-text-primary)'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'
                        }}
                      >
                        {category.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export default CategoryDropdown
