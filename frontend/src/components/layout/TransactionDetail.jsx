import React, { useState, useEffect } from 'react'
import { formatCurrency, formatDate, toTitleCase } from '../../utils/formatters'
import { useFinancial } from '../../contexts/FinancialContext'
import { useNavigate } from 'react-router-dom'
import CategoryDropdown from '../ui/CategoryDropdown'

const DetailRow = ({ label, children, onClick, hoverable = false }) => (
  <div
    className={`flex justify-between items-center border-t py-4 px-4 text-sm ${
      hoverable ? 'cursor-pointer hover:bg-[var(--color-bg-hover)] transition-colors' : ''
    }`}
    style={{ borderColor: 'var(--color-border-primary)' }}
    onClick={onClick}
  >
    <span className="text-[14px]" style={{ color: 'var(--color-text-primary)' }}>{label}</span>
    {children}
  </div>
)

const TransactionDetail = ({ maxWidth = 700, transaction }) => {
  const { accounts, categories, updateTransactionCategory, setToast } = useFinancial()
  const navigate = useNavigate()

  const [note, setNote] = useState(transaction?.notes || '')
  const [localCategoryId, setLocalCategoryId] = useState(transaction?.category_id || null)

  // Update localCategoryId when transaction changes (e.g., on page refresh)
  useEffect(() => {
    if (transaction?.category_id) {
      setLocalCategoryId(transaction.category_id)
    }
  }, [transaction?.category_id])

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
  const logoStyle = transaction.icon_url ? {} : {
    background: 'var(--color-gray-200)',
    border: '1px solid var(--color-border-primary)'
  }

  const handleCategoryChange = async (newCategory) => {
    if (!newCategory?.id) return
    const prevCategoryId = localCategoryId
    setLocalCategoryId(newCategory.id)
    const success = await updateTransactionCategory(transaction.id, newCategory.id)
    if (!success && setToast) {
      setToast({ type: 'error', message: 'Failed to update category' })
      // setLocalCategoryId(prevCategoryId) // Optional revert
    }
  }

  return (
    <main className="w-full max-w-[700px] mx-auto px-4 sm:px-6 pb-0 mb-0 overflow-hidden">
      <div className="flex flex-col gap-6 pt-6">
        {/* Card */}
        <div
          className="w-full rounded-2xl px-4 py-6 sm:px-6 shadow-xl"
          style={{
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-primary)'
          }}
        >
          {/* Header */}
          <div className="flex justify-between px-4 items-start">
            <div className="flex gap-4 items-start flex-1 min-w-0">
              <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden" style={logoStyle}>
                {transaction.icon_url ? (
                  <img src={transaction.icon_url} alt="icon" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gray-400" />
                )}
              </div>
                              <div className="flex flex-col justify-center min-w-0">
                  <div className="font-semibold truncate max-w-[220px] text-[16px]" style={{ color: 'var(--color-text-primary)' }}>
                    {transaction.description}
                  </div>
                </div>
            </div>
            <div className="text-[18px] flex items-center" style={{ height: '48px', color: amountColor }}>
              {amountPrefix}{formatCurrency(Math.abs(transaction.amount))}
            </div>
          </div>

          {/* Rows */}
          <div className="mt-6 text-sm text-gray-600 flex flex-col">
            <DetailRow label="Status">
              <span className="text-[13px] px-3 py-1.5 rounded-full font-medium shadow-sm"
                style={{
                  color: transaction.pending ? 'var(--color-warning)' : 'var(--color-success)',
                  background: transaction.pending 
                    ? 'linear-gradient(135deg, var(--color-warning-bg) 0%, rgba(255, 193, 7, 0.15) 100%)'
                    : 'linear-gradient(135deg, var(--color-success-bg) 0%, rgba(40, 167, 69, 0.15) 100%)',
                  border: `1px solid ${transaction.pending ? 'rgba(255, 193, 7, 0.2)' : 'rgba(40, 167, 69, 0.2)'}`,
                  boxShadow: `0 2px 4px ${transaction.pending ? 'rgba(255, 193, 7, 0.15)' : 'rgba(40, 167, 69, 0.15)'}`
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
              <CategoryDropdown
                categories={categories}
                currentCategory={transaction.category_name || categories.find(cat => cat.id === localCategoryId)?.name}
                currentColor={transaction.category_color || categories.find(cat => cat.id === localCategoryId)?.color}
                onCategoryChange={handleCategoryChange}
              />
            </DetailRow>

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
                <span className="text-[14px]" style={{ color: 'var(--color-text-secondary)' }}>{transaction.subtype}</span>
              </DetailRow>
            )}

            {transaction.payment_channel && (
                           <DetailRow label="Payment Channel">
               <span className="text-[13px] px-3 py-1.5 rounded-full font-medium shadow-sm"
                 style={{
                   color: 'var(--color-primary)',
                   background: 'linear-gradient(135deg, var(--color-primary-bg) 0%, rgba(59, 130, 246, 0.15) 100%)',
                   border: '1px solid rgba(59, 130, 246, 0.2)',
                   boxShadow: '0 2px 4px rgba(59, 130, 246, 0.15)'
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

            {/* Notes */}
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
