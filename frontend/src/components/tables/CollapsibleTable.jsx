import React, { useState, useRef, useEffect } from 'react'
import { FiChevronDown } from 'react-icons/fi'

function CollapsibleTable({ 
  data, 
  columns, 
  renderRow, 
  renderExpandedContent, 
  isMobile, 
  emptyMessage = "No data found" 
}) {
  const [expandedRows, setExpandedRows] = useState(new Set())

  const toggleRow = (rowId) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(rowId)) {
      newExpanded.delete(rowId)
    } else {
      newExpanded.add(rowId)
    }
    setExpandedRows(newExpanded)
  }

  if (!data || data.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#6b7280',
        fontSize: '13px',
        fontStyle: 'italic'
      }}>
        {emptyMessage}
      </div>
    )
  }

  return (
    <div
      className="w-full max-w-[700px] h-full bg-white rounded-[8px] flex flex-col"
      style={{
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        border: '1px solid #e5e7eb',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      {/* Scrollable Container */}
      <div
        className="px-[20px]"
        style={{
          overflowY: 'scroll',
          overflowX: 'auto',
          flexGrow: 1,
          boxSizing: 'border-box',
          position: 'relative'
        }}
      >
        <div className="flex flex-col" style={{ minWidth: columns.minWidth || '648px' }}>
          {/* Header - Inside scroll container but sticky */}
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              backgroundColor: 'white',
              borderBottom: '1px solid #e5e7eb',
              padding: '10px 0',
              boxSizing: 'border-box'
            }}
          >
            <div className="pr-[16px] pl-[6px]">
              <div
                className="grid text-[12px] font-medium text-gray-500"
                style={{
                  gridTemplateColumns: columns.gridTemplateColumns,
                  minWidth: columns.minWidth || '648px'
                }}
              >
                {columns.headers.map((header, index) => (
                  <div key={index} className={header.className || ''}>
                    {header.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Rows */}
          {data.map((item, index) => {
            const rowId = item.id || item.trade_id || item.date || index
            const isExpanded = expandedRows.has(rowId)
            
            return (
              <CollapsibleRow
                key={rowId}
                item={item}
                isExpanded={isExpanded}
                onToggle={() => toggleRow(rowId)}
                renderRow={renderRow}
                renderExpandedContent={renderExpandedContent}
                columns={columns}
                isMobile={isMobile}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

function CollapsibleRow({ 
  item, 
  isExpanded, 
  onToggle, 
  renderRow, 
  renderExpandedContent, 
  columns, 
  isMobile 
}) {
  const [height, setHeight] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const contentRef = useRef(null)

  useEffect(() => {
    if (isExpanded && contentRef.current) {
      setHeight(contentRef.current.scrollHeight)
    } else {
      setHeight(0)
    }
  }, [isExpanded])

  return (
    <div
      onClick={onToggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: isHovered ? '#fdfdfd' : 'white',
        borderBottom: '1px solid #e5e7eb',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
        width: '100%'
      }}
    >
      <div className="py-[12px] pr-[16px] pl-[6px]">
        <div 
          className="grid text-[13px] text-gray-700 items-center"
          style={{
            gridTemplateColumns: columns.gridTemplateColumns
          }}
        >
          {renderRow(item, isExpanded, isMobile)}
        </div>
      </div>

      <div
        style={{
          height: `${height}px`,
          transition: 'height 0.3s ease',
          overflow: 'hidden'
        }}
      >
        <div
          ref={contentRef}
          className="text-[12px] text-gray-600 bg-gray-50 rounded-[4px] px-[16px] py-[10px]"
        >
          {renderExpandedContent(item)}
        </div>
      </div>
    </div>
  )
}

export default CollapsibleTable 