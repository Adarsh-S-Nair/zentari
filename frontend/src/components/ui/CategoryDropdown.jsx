import React, { useState, useEffect } from 'react'
import { useFinancial } from '../../contexts/FinancialContext'

const categoryListStyles = `
  @keyframes slideInUp {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .category-group-content {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
  }
  
  .category-group-content.expanded {
    max-height: 1000px;
    transform: translateY(0);
  }
  
  .category-group-content.collapsed {
    max-height: 0;
    transform: translateY(-4px);
  }
`

const CategoryDropdown = ({ 
  isOpen, 
  onClose, 
  selectedCategory, 
  onCategorySelect 
}) => {
  const { categories } = useFinancial()
  const [expandedGroup, setExpandedGroup] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const groupedCategories = React.useMemo(() => {
    if (!categories) return {}
    const grouped = {}
    const query = searchQuery.toLowerCase().trim()

    categories.forEach(category => {
      if (query && !category.name.toLowerCase().includes(query) && 
          !category.primary_group?.toLowerCase().includes(query)) {
        return
      }
      const group = category.primary_group || 'Other'
      if (!grouped[group]) {
        grouped[group] = {
          name: group,
          color: category.color,
          categories: []
        }
      }
      grouped[group].categories.push(category)
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
          {/* Search */}
          <div className="flex items-center gap-2 pb-4 relative">
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
            <span className="-ml-8 flex items-center h-full">
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

          {/* Category Groups */}
          {Object.entries(groupedCategories).map(([groupName, group]) => (
            <div key={groupName}>
              <button
                onClick={() => toggleGroup(groupName)}
                className="w-full flex items-center gap-3 px-2 py-3 rounded-md transition-colors duration-150 text-left cursor-pointer"
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
                  className={`w-4 h-4 transition-transform ${expandedGroup === groupName ? 'rotate-180' : ''}`}
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
                        className="w-full px-3 py-2 text-left rounded-md text-[13px] transition-colors duration-100 cursor-pointer"
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
