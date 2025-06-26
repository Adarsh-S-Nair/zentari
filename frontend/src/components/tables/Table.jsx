import React from 'react'
import { Pill } from '../ui'
import { formatCurrency, formatDate, formatShares, formatPercentage } from '../../utils/formatters'

function Table({ 
  data, 
  columns, 
  isMobile, 
  emptyMessage = "No data found",
  minWidth = "648px"
}) {
  if (!data || data.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--color-text-muted)',
        fontSize: '13px',
        fontStyle: 'italic'
      }}>
        {emptyMessage}
      </div>
    )
  }

  const formatCellValue = (value, column) => {
    if (value === null || value === undefined) return '-'
    
    switch (column.type) {
      case 'currency':
        return formatCurrency(value)
      case 'date':
        return formatDate(value)
      case 'shares':
        return formatShares(value)
      case 'percentage':
        return formatPercentage(value)
      case 'pill':
        return (
          <Pill 
            type={column.pillType || 'default'} 
            value={value}
            customText={column.customText}
            customBgColor={column.customBgColor}
            customTextColor={column.customTextColor}
          />
        )
      case 'pill-with-condition':
        const isPositive = value > 0
        const isZero = value === 0 || value === null
        return (
          <Pill 
            value={value} 
            isPositive={isPositive} 
            isZero={isZero} 
          />
        )
      default:
        return value
    }
  }

  return (
    <div
      className="w-full max-w-[700px] h-full bg-white rounded-[8px] flex flex-col"
      style={{
        boxShadow: '0 2px 8px var(--color-shadow-light)',
        border: '1px solid var(--color-border-primary)',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      {/* Scrollable Container */}
      <div
        className="pl-[15px] pr-[5px]"
        style={{
          overflowY: 'scroll',
          overflowX: 'auto',
          flexGrow: 1,
          boxSizing: 'border-box',
          position: 'relative'
        }}
      >
        <div className="flex flex-col" style={{ minWidth }}>
          {/* Header - Inside scroll container but sticky */}
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              backgroundColor: 'var(--color-bg-primary)',
              borderBottom: '1px solid var(--color-border-primary)',
              padding: '10px 0',
              boxSizing: 'border-box'
            }}
          >
            <div className="pr-[16px] pl-[6px]">
              <div
                className="grid text-[12px] font-medium text-gray-500"
                style={{
                  gridTemplateColumns: columns.map(col => col.width || '1fr').join(' ')
                }}
              >
                {columns.map((column, index) => (
                  <div 
                    key={index} 
                    className={column.headerAlign || 'text-left'}
                    style={column.style}
                  >
                    {column.header}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Rows */}
          {data.map((row, rowIndex) => {
            const isEvenRow = rowIndex % 2 === 0
            const baseBgColor = isEvenRow 
              ? 'var(--color-bg-primary)' 
              : 'var(--color-bg-secondary)'
            
            return (
              <div
                key={row.id || rowIndex}
                style={{
                  backgroundColor: baseBgColor,
                  borderBottom: '1px solid var(--color-border-primary)',
                  transition: 'background-color 0.2s ease',
                  width: '100%'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isEvenRow 
                    ? 'var(--color-bg-hover)' 
                    : 'var(--color-bg-hover-secondary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = baseBgColor
                }}
              >
                <div className="py-[12px] pr-[16px] pl-[6px]">
                  <div
                    className="grid text-[13px] text-gray-700 items-center"
                    style={{
                      gridTemplateColumns: columns.map(col => col.width || '1fr').join(' ')
                    }}
                  >
                    {columns.map((column, colIndex) => (
                      <div 
                        key={colIndex} 
                        className={column.align || 'text-left'}
                        style={column.style}
                      >
                        {column.render ? column.render(row[column.key], row) : formatCellValue(row[column.key], column)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default Table 