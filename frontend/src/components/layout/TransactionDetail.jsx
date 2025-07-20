import React, { useState, useEffect, useRef } from 'react'
import { formatCurrency, formatDate, toTitleCase } from '../../utils/formatters'
import { useFinancial } from '../../contexts/FinancialContext'
import { useNavigate } from 'react-router-dom'
import InlineCategoryDropdown from '../ui/CategoryDropdown'
import { useModal } from '../../App'
import { FaPencilRuler } from 'react-icons/fa'

const DetailRow = ({ label, children, onClick, hoverable = false, backgroundColor, isFirst = false }) => (
  <div
    className={`flex justify-between items-center py-4 px-3 text-sm transition-colors ${
      hoverable ? 'cursor-pointer' : ''
    } ${!isFirst ? 'border-t' : ''}`}
    style={{ 
      borderColor: 'var(--color-border-primary)',
      background: backgroundColor || 'transparent'
    }}
    onMouseEnter={hoverable && !backgroundColor ? (e) => e.currentTarget.style.background = 'var(--color-bg-hover)' : undefined}
    onMouseLeave={hoverable && !backgroundColor ? (e) => e.currentTarget.style.background = 'transparent' : undefined}
    onClick={onClick}
  >
    <span className="text-[14px]" style={{ color: 'var(--color-text-primary)' }}>{label}</span>
    {children}
  </div>
)

const TransactionDetail = ({ maxWidth = 700, transaction, inBottomSheet = false }) => {
  const { accounts, updateTransactionCategory, setToast, categories } = useFinancial()
  const navigate = useNavigate()
  const { showModal } = useModal()
  const [note, setNote] = useState(transaction?.notes || '')
  const [showCategories, setShowCategories] = useState(false)
  const dropdownRef = useRef(null)

  const [localCategory, setLocalCategory] = useState({
    id: transaction?.category_id || null,
    name: transaction?.category_name || null,
    color: transaction?.category_color || null,
  })

  useEffect(() => {
    if (transaction) {
      setLocalCategory({
        id: transaction.category_id || null,
        name: transaction.category_name || null,
        color: transaction.category_color || null,
      })
    }
  }, [transaction?.category_id, transaction?.category_name, transaction?.category_color])

  // Handle clicking outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowCategories(false)
      }
    }

    if (showCategories) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCategories])


  if (!transaction) {
    return (
      <div className="w-full flex items-center justify-center min-h-[300px] text-gray-500 text-lg">
        Transaction not found.
      </div>
    )
  }

  const account = accounts?.find(a => a.account_id === transaction.accounts?.account_id)

  const handleCategorySelect = async (category) => {
    const categoryId = category?.id || null
    setLocalCategory({
      id: category?.id || null,
      name: category?.name || null,
      color: category?.color || null,
    })
    setShowCategories(false)
    const success = await updateTransactionCategory(transaction.id, categoryId)
    if (!success && setToast) {
      setToast({ type: 'error', message: 'Failed to update category' })
      setLocalCategory({
        id: transaction.category_id,
        name: transaction.category_name,
        color: transaction.category_color,
      })
    }
  }

  return (
    <main className={`w-full max-w-[700px] mx-auto h-full flex flex-col`}>
      <div className={`flex flex-col gap-6 pt-6 pb-6 flex-1 overflow-y-auto ${inBottomSheet ? 'px-4' : 'px-4 sm:px-6'}`}>
        {/* Transaction amount and description above main card */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-2xl font-semibold" style={{ color: transaction.amount > 0 ? 'var(--color-success)' : 'var(--color-text-secondary)' }}>
            {transaction.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(transaction.amount))}
          </span>
          <div className="text-sm text-center" style={{ color: 'var(--color-text-secondary)' }}>
            {transaction.description}
          </div>
        </div>
        
        <div
          className="w-full rounded-2xl px-1 py-1 sm:px-1 flex-shrink-0"
          style={{
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-primary)'
          }}
        >
          {/* Rows */}
          <div className="text-sm flex flex-col">
            <DetailRow label="Status" isFirst={true}>
              <span
                className="text-[12px] px-2 py-1 rounded-md font-normal"
                style={{
                  color: transaction.pending ? 'var(--color-warning)' : 'var(--color-success)',
                  background: transaction.pending
                    ? 'linear-gradient(135deg, var(--color-warning-bg) 0%, rgba(255, 193, 7, 0.10) 100%)'
                    : 'linear-gradient(135deg, var(--color-success-bg) 0%, rgba(40, 167, 69, 0.10) 100%)',
                  border: `1px solid ${transaction.pending ? 'rgba(255, 193, 7, 0.12)' : 'rgba(40, 167, 69, 0.12)'}`,
                  boxShadow: `0 1px 2px ${transaction.pending ? 'rgba(255, 193, 7, 0.07)' : 'rgba(40, 167, 69, 0.07)'}`
                }}
              >
                {transaction.pending ? 'Pending' : 'Posted'}
              </span>
            </DetailRow>

            <DetailRow label="Date">
              <span className="text-[14px]" style={{ color: 'var(--color-text-secondary)' }}>
                {formatDate(transaction.datetime)}
              </span>
            </DetailRow>

            <DetailRow label="Category">
              <div className="relative">
                <button
                  onClick={() => setShowCategories(!showCategories)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all duration-150 hover:scale-[1.02] hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  style={{
                    borderColor: 'var(--color-border-primary)',
                    background: 'var(--color-bg-primary)',
                    color: 'var(--color-text-primary)',
                    minWidth: '180px',
                    maxWidth: '240px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--color-bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--color-bg-primary)';
                  }}
                >
                  {localCategory.color && (
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: localCategory.color }}
                    />
                  )}
                  <span className="text-[14px] truncate flex-1 text-left">
                    {localCategory.name || 'Uncategorized'}
                  </span>
                  <svg 
                    className={`w-4 h-4 transition-transform flex-shrink-0 ${showCategories ? 'rotate-180' : ''}`}
                    style={{ color: 'var(--color-text-secondary)' }}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                <InlineCategoryDropdown
                  isOpen={showCategories}
                  onClose={() => setShowCategories(false)}
                  selectedCategory={localCategory}
                  onCategorySelect={handleCategorySelect}
                  dropdownRef={dropdownRef}
                />
              </div>
            </DetailRow>

            {transaction.accounts?.name && (
              <DetailRow
                label="Account"
                hoverable
                onClick={() => navigate(`/accounts/${account?.type}/${account?.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center"
                    style={account?.institution_logo ? {} : {
                      background: 'var(--color-gray-200)',
                      border: '1px solid var(--color-border-primary)'
                    }}
                  >
                    {account?.institution_logo ? (
                      <img src={account.institution_logo} className="w-full h-full object-cover rounded-full"
                        alt={account.institution_name || 'Bank'}
                      />
                    ) : (
                      <div className="w-3 h-3 rounded-full bg-gray-400" />
                    )}
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[14px] truncate max-w-[120px] sm:max-w-[180px]" style={{ color: 'var(--color-text-secondary)' }}>
                      {transaction.accounts.name}
                    </span>
                    {transaction.accounts.mask && (
                      <span className="text-[11px] font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                        ••••{transaction.accounts.mask}
                      </span>
                    )}
                  </div>
                </div>
              </DetailRow>
            )}

            {transaction.subtype && (
              <DetailRow label="Type">
                <span className="text-[14px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {transaction.subtype}
                </span>
              </DetailRow>
            )}

            {transaction.payment_channel && (
              <DetailRow label="Payment Channel">
                <span
                  className="text-[12px] px-2 py-1 rounded-md font-normal"
                  style={{
                    color: 'var(--color-primary)',
                    background: 'linear-gradient(135deg, var(--color-primary-bg) 0%, rgba(59, 130, 246, 0.10) 100%)',
                    border: '1px solid rgba(59, 130, 246, 0.12)',
                    boxShadow: '0 1px 2px rgba(59, 130, 246, 0.07)'
                  }}
                >
                  {toTitleCase(transaction.payment_channel)}
                </span>
              </DetailRow>
            )}

            {transaction.website && (
              <DetailRow label="Website">
                <a
                  href={transaction.website.startsWith('http') ? transaction.website : `https://${transaction.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[14px] hover:underline"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {transaction.website}
                </a>
              </DetailRow>
            )}

            {transaction.location && (() => {
              const { address, city, region, postal_code, country, store_number } = transaction.location
              const lines = [
                address,
                [city, region, postal_code].filter(Boolean).join(', '),
                country,
                store_number ? `Store #${store_number}` : null
              ].filter(Boolean)

              return lines.length > 0 && (
                <div className="border-t py-4 px-4 text-[14px]" style={{ borderColor: 'var(--color-border-primary)' }}>
                  <span className="text-[14px]" style={{ color: 'var(--color-text-primary)' }}>Location</span>
                  <div className="mt-2 space-y-1 text-[14px]" style={{ color: 'var(--color-text-secondary)' }}>
                    {lines.map((line, idx) => (
                      <div key={idx}>{line}</div>
                    ))}
                  </div>
                </div>
              )
            })()}

            <div className="border-t py-4 px-4" style={{ borderColor: 'var(--color-border-primary)' }}>
              <label htmlFor="note" className="text-[14px]" style={{ color: 'var(--color-text-primary)' }}>Note</label>
              <textarea
                id="note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-2 w-full bg-transparent border rounded-lg p-2 text-[14px] resize-none"
                style={{
                  borderColor: 'var(--color-border-primary)',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'inherit'
                }}
                placeholder="Add a note about this transaction..."
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default TransactionDetail
