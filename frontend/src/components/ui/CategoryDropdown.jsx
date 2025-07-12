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
`

const CategoryDropdown = ({ 
  isOpen, 
  onClose, 
  selectedCategory, 
  onCategorySelect 
}) => {
  const { categories } = useFinancial()
  const [expandedGroups, setExpandedGroups] = useState(new Set())
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

  const handleCategorySelect = (category) => {
    setSearchQuery('')
    setExpandedGroups(new Set())
    onCategorySelect(category)
  }

  useEffect(() => {
    if (searchQuery.trim()) {
      const groupsToExpand = new Set()
      Object.keys(groupedCategories).forEach(groupName => {
        if (groupedCategories[groupName].categories.length > 0) {
          groupsToExpand.add(groupName)
        }
      })
      setExpandedGroups(groupsToExpand)
    } else {
      setExpandedGroups(new Set())
    }
  }, [searchQuery, groupedCategories])

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
      setExpandedGroups(new Set())
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      <style>{categoryListStyles}</style>
      <div className="overflow-hidden transition-all duration-300 ease-out max-h-none opacity-100">
        <div className="border-t pt-4" style={{ borderColor: 'var(--color-border-primary)' }}>
          <div className="grid grid-cols-1">
            {/* Search bar */}
            <div className="relative px-3 pb-3">
              <input
                type="text"
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-3 pr-10 border text-[13px] bg-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  borderColor: 'var(--color-border-primary)',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'inherit'
                }}
              />
              <svg 
                className="absolute right-5 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ color: 'var(--color-text-secondary)' }}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Category groups */}
            {Object.entries(groupedCategories).map(([groupName, group]) => (
              <div key={groupName} className="border-t" style={{ borderColor: 'var(--color-border-primary)' }}>
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(groupName)}
                  className="w-full flex items-center gap-3 px-4 py-4 rounded-md transition-colors duration-150 text-left"
                  style={{ 
                    backgroundColor: 'transparent',
                    color: 'var(--color-text-primary)' 
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-primary)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: group.color }}
                  />
                  <span className="text-[13px] font-medium flex-1">{group.name}</span>
                  <svg 
                    className={`w-4 h-4 transition-transform ${expandedGroups.has(groupName) ? 'rotate-180' : ''}`}
                    style={{ color: 'var(--color-text-secondary)' }}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Group categories */}
                <div 
                  className={`transition-all duration-300 ease-in-out ${
                    expandedGroups.has(groupName) ? 'max-h-[1000px]' : 'max-h-0 overflow-hidden'
                  }`}
                >
                  <div className="ml-6 py-1">
                    {group.categories.map((category) => {
                      const isSelected = selectedCategory?.id === category.id
                      return (
                        <button
                          key={category.id}
                          onClick={() => handleCategorySelect(category)}
                          className="w-full px-4 py-4 text-left rounded-md text-[13px] transition-colors duration-100"
                          style={{
                            backgroundColor: isSelected ? 'var(--color-bg-primary)' : 'transparent',
                            color: 'var(--color-text-primary)'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor = 'var(--color-bg-primary)'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor = 'transparent'
                            }
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
      </div>
    </>
  )
}

export default CategoryDropdown
