import React, { useState, useEffect, useRef } from 'react'
import { formatCurrency, formatDate, toTitleCase } from '../../utils/formatters'
import { useFinancial } from '../../contexts/FinancialContext'
import { useNavigate } from 'react-router-dom'
import CategoryDropdown from '../ui/CategoryDropdown'
import CategoryIcon from '../ui/CategoryIcon'
import { useModal } from '../../App'
import { FaPencilRuler } from 'react-icons/fa'

const DetailRow = ({ label, children, onClick, hoverable = false, backgroundColor }) => (
  <div
    className={`flex justify-between items-center border-t py-4 px-4 text-sm transition-colors ${
      hoverable ? 'cursor-pointer' : ''
    }`}
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

const TransactionDetail = ({ maxWidth = 700, transaction }) => {
  const { accounts, updateTransactionCategory, setToast } = useFinancial()
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



  if (!transaction) {
    return (
      <div className="w-full flex items-center justify-center min-h-[300px] text-gray-500 text-lg">
        Transaction not found.
      </div>
    )
  }

  const account = accounts?.find(a => a.account_id === transaction.accounts?.account_id)
  const isPositive = transaction.amount > 0
  const amountColor = isPositive ? 'var(--color-success)' : 'var(--color-text-secondary)'
  const amountPrefix = isPositive ? '+' : ''
  const logoStyle = transaction.icon_url
    ? {}
    : { background: 'var(--color-bg-secondary)', border: 'none' }

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
    <main className="w-full max-w-[700px] mx-auto px-4 sm:px-6 overflow-hidden">
      <div className="flex flex-col gap-6 pt-6">
        <div
          className="w-full rounded-2xl px-4 py-6 sm:px-6 shadow-xl"
          style={{
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-primary)'
          }}
        >
          {/* Header */}
          <div className="flex justify-between px-4 items-center">
            <div className="flex gap-4 items-center flex-1 min-w-0">
              <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0" style={logoStyle}>
                {transaction.icon_url ? (
                  <img src={transaction.icon_url} alt="icon" className="w-full h-full object-cover rounded-full" />
                ) : transaction.category_icon_lib && transaction.category_icon_name ? (
                  <CategoryIcon lib={transaction.category_icon_lib} name={transaction.category_icon_name} size={24} color={'var(--color-text-muted)'} />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gray-400" />
                )}
              </div>
              <div className="flex flex-col justify-center min-w-0 flex-1">
                <div className="text-[16px] font-semibold -tracking-[0.5px] truncate max-w-[120px] sm:max-w-[220px]" style={{ color: 'var(--color-text-primary)' }}>
                  {transaction.description}
                </div>
              </div>
            </div>
            <div className="flex-shrink-0 min-w-[80px] text-right">
              <span className="text-[18px] font-semibold -tracking-[0.2px]" style={{ color: amountColor }}>
                {amountPrefix}{formatCurrency(Math.abs(transaction.amount))}
              </span>
            </div>
          </div>

          {/* Rows */}
          <div className="mt-6 text-sm flex flex-col">
            <DetailRow label="Status">
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

            <DetailRow 
              label="Category" 
              hoverable 
              onClick={() => setShowCategories(!showCategories)}
              backgroundColor={showCategories ? 'var(--color-bg-primary)' : undefined}
            >
              <div className="flex items-center gap-2">
                {localCategory.color && (
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: localCategory.color }}
                  />
                )}
                <span className="text-[14px] truncate max-w-[80px] sm:max-w-[120px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {localCategory.name || 'Uncategorized'}
                </span>
                <svg 
                  className={`w-4 h-4 transition-transform ${showCategories ? 'rotate-180' : ''}`}
                  style={{ color: 'var(--color-text-secondary)' }}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </DetailRow>

            {/* Connected Category Dropdown */}
            <div 
              ref={dropdownRef}
              className={`transition-all duration-300 ease-in-out overflow-hidden`}
              style={{
                maxHeight: showCategories ? 'none' : '0px',
                background: 'var(--color-bg-primary)',
                borderBottomLeftRadius: '12px',
                borderBottomRightRadius: '12px',
                boxShadow: showCategories ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              <CategoryDropdown
                isOpen={showCategories}
                onClose={() => setShowCategories(false)}
                selectedCategory={localCategory}
                onCategorySelect={handleCategorySelect}
                onCreateRule={() => {
                  console.log("Create Rule button clicked")
                  // This could open a modal or navigate to rule creation
                }}
                setToast={setToast}
              />
            </div>

            {transaction.accounts?.name && (
              <DetailRow
                label="Account"
                hoverable
                onClick={() => navigate(`/accounts/${account?.type}/${account?.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center"
                    style={account?.institution_logo ? {} : {
                      background: 'var(--color-gray-200)',
                      border: '1px solid var(--color-border-primary)'
                    }}
                  >
                    {account?.institution_logo ? (
                      <img src={account.institution_logo} className="w-full h-full object-cover rounded-full"
                        style={{ filter: 'grayscale(1) brightness(1.2) contrast(0.8)' }}
                        alt={account.institution_name || 'Bank'}
                      />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-gray-400" />
                    )}
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[14px]" style={{ color: 'var(--color-text-secondary)' }}>
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
