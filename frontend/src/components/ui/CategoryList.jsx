import React, { useState, useEffect, useRef } from 'react'
import { useFinancial } from '../../contexts/FinancialContext'
import { useModal } from '../../App'
import { FiArrowLeft, FiSearch, FiChevronDown, FiSettings } from 'react-icons/fi'
import CategoryRuleForm from './CategoryRuleForm'
import Button from './Button'

const CategoryList = ({ onBack, onCategorySelect, selectedCategory }) => {
  const { categories } = useFinancial()
  const { showModal } = useModal()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedGroups, setExpandedGroups] = useState(new Set())
  const [isRuleFormValid, setIsRuleFormValid] = useState(false)
  const ruleFormRef = useRef(null)

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

  const handleRuleBuilderClick = () => {
    showModal({
      header: 'Category Rule Builder',
      description: (
        <CategoryRuleForm
          categories={categories}
          onSave={(rule) => {
            console.log('Rule saved:', rule)
            // TODO: Implement rule saving logic
          }}
          onCancel={() => {}}
          onSubmitRef={ruleFormRef}
          onValidityChange={setIsRuleFormValid}
        />
      ),
      headerIcon: <FiSettings size={20} style={{ color: 'var(--color-text-secondary)' }} />,
      buttons: [
        { 
          text: 'Cancel', 
          color: 'gray', 
          onClick: null,
          icon: null
        },
        { 
          text: 'Save Rule', 
          color: 'networth', 
          onClick: () => {
            if (ruleFormRef.current && ruleFormRef.current.submit) {
              ruleFormRef.current.submit()
            }
          },
          icon: null,
          disabled: !isRuleFormValid
        }
      ]
    })
  }

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
    <div className="w-full h-full flex flex-col" style={{ background: 'var(--color-bg-primary)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: 'var(--color-border-primary)' }}>
        <button
          onClick={onBack}
          className="p-2 rounded-lg transition-all duration-200 hover:scale-105 cursor-pointer"
          style={{ 
            color: 'var(--color-text-primary)',
            background: 'transparent'
          }}
          onMouseEnter={(e) => e.target.style.background = 'var(--color-bg-hover)'}
          onMouseLeave={(e) => e.target.style.background = 'transparent'}
        >
          <FiArrowLeft size={20} />
        </button>
        <h2 className="text-lg" style={{ color: 'var(--color-text-primary)' }}>
          Select Category
        </h2>
      </div>

      {/* Search Bar */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--color-border-primary)' }}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <FiSearch 
              className="absolute left-3 top-1/2 transform -translate-y-1/2" 
              size={16} 
              style={{ color: 'var(--color-text-secondary)' }}
            />
            <input
              type="text"
              placeholder="Search categories..."
              className="w-full pl-10 pr-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-150"
              style={{
                borderColor: 'var(--color-border-primary)',
                color: 'var(--color-text-primary)',
                background: 'var(--color-bg-secondary)'
              }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            label=""
            onClick={handleRuleBuilderClick}
            color="networth"
            width="w-auto"
            className="px-3 py-3"
            icon={<FiSettings size={16} />}
            title="Category Rule Builder"
          />
        </div>
      </div>

      {/* Categories List */}
      <div className="flex-1 overflow-y-auto category-list-scrollbar">
        <div className="w-full box-border mx-auto overflow-x-hidden p-2">
          {Object.entries(groupedCategories).map(([groupName, group]) => (
            <div key={groupName} className="mb-2">
              {/* Group Header - Clickable */}
              <button
                onClick={() => toggleGroup(groupName)}
                className={`w-full flex items-center px-4 py-3 min-h-[48px] transition-all duration-200 cursor-pointer ${
                  expandedGroups.has(groupName) ? 'rounded-t-lg' : 'rounded-lg'
                }`}
                style={{
                  background: expandedGroups.has(groupName) ? 'var(--color-bg-hover)' : 'var(--color-bg-primary)',
                  color: 'var(--color-text-primary)'
                }}
                onMouseEnter={(e) => {
                  if (!expandedGroups.has(groupName)) {
                    e.currentTarget.style.background = 'var(--color-bg-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!expandedGroups.has(groupName)) {
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
                  className={`w-4 h-4 transition-transform duration-200 flex-shrink-0 ${expandedGroups.has(groupName) ? 'rotate-180' : ''}`}
                  style={{ color: 'var(--color-text-secondary)' }}
                />
              </button>

              {/* Categories under this group - Animated */}
              <div 
                className={`overflow-hidden transition-all duration-200 ease-in-out ${
                  expandedGroups.has(groupName) ? 'rounded-b-lg' : ''
                }`}
                style={{
                  maxHeight: expandedGroups.has(groupName) ? `${group.categories.length * 48}px` : '0px',
                  opacity: expandedGroups.has(groupName) ? 1 : 0,
                  background: expandedGroups.has(groupName) ? 'var(--color-bg-hover)' : 'transparent'
                }}
              >
                {group.categories.map((category, index) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategorySelect(category)}
                    className={`w-full flex items-center py-3 min-h-[48px] transition-all duration-200 cursor-pointer ${
                      index === group.categories.length - 1 ? 'rounded-b-lg' : ''
                    }`}
                    style={{
                      background: selectedCategory?.id === category.id ? 'var(--color-primary-bg)' : 'transparent',
                      color: 'var(--color-text-primary)',
                      paddingLeft: 'calc(1rem + 1.5rem)' // 16px + 24px for indentation
                    }}
                    onMouseEnter={(e) => {
                      if (selectedCategory?.id !== category.id) {
                        e.currentTarget.style.background = 'var(--color-bg-secondary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedCategory?.id !== category.id) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
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
                    
                    {/* Selected checkmark */}
                    {selectedCategory?.id === category.id && (
                      <div className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center mr-4" style={{ 
                        background: 'var(--color-primary)'
                      }}>
                        <svg 
                          className="w-3 h-3"
                          style={{ color: 'var(--color-text-white)' }}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default CategoryList 