import React, { useState } from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useFinancial } from '../../contexts/FinancialContext';
import { useNavigate } from 'react-router-dom';
import CategoryDropdown from '../ui/CategoryDropdown';

const TransactionDetail = ({ maxWidth = 700, transaction }) => {
  const { accounts, categories, updateTransactionCategory, setToast } = useFinancial();
  const navigate = useNavigate();
  const [note, setNote] = useState(transaction?.notes || '');
  const [localCategoryId, setLocalCategoryId] = useState(transaction?.category_id || null);

  const handleCategoryChange = async (newCategory) => {
    if (!newCategory || !newCategory.id) return;
    console.log('newCategory', newCategory);
    const success = await updateTransactionCategory(transaction.id, newCategory.id);
    if (success) {
      setLocalCategoryId(newCategory.id);
    } else if (setToast) {
      setToast({ type: 'error', message: 'Failed to update category' });
    }
  };

  if (!transaction) {
    return (
      <div className="w-full flex items-center justify-center min-h-[300px] text-gray-500 text-lg">
        Transaction not found.
      </div>
    );
  }

  const account = accounts?.find(acc => acc.account_id === transaction.accounts?.account_id);
  const institutionLogo = account?.institution_logo;
  const institutionName = account?.institution_name;

  const isPositive = transaction.amount > 0;
  const amountColor = isPositive ? 'var(--color-success)' : 'var(--color-text-secondary)';
  const amountPrefix = isPositive ? '+' : '';

  return (
    <main className="w-full max-w-[700px] mx-auto px-4 sm:px-6 box-border pb-0 mb-0 overflow-hidden">
      <div className="w-full flex flex-col gap-6 pt-6">
        {/* Card */}
        <div
          className="w-full rounded-2xl px-4 py-6 sm:px-6 shadow-xl transition-all"
          style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)' }}
        >
          {/* Header */}
          <div className="flex items-start justify-between px-4">
            <div className="flex gap-4 items-start flex-1 min-w-0">
              <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden" style={{ background: transaction.icon_url ? 'transparent' : 'var(--color-gray-200)', border: transaction.icon_url ? 'none' : '1px solid var(--color-border-primary)' }}>
                {transaction.icon_url ? (
                  <img src={transaction.icon_url} alt="icon" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gray-400" />
                )}
              </div>
              <div className="flex flex-col justify-center min-w-0">
                <div className="text-[16px] font-semibold truncate max-w-[120px] sm:max-w-[220px]" style={{ color: 'var(--color-text-primary)' }}>
                  {transaction.description}
                </div>
                <div className="mt-1 text-[12px] text-gray-500">{formatDate(transaction.date)}</div>
              </div>
            </div>
                         <div className="flex items-center" style={{ height: '48px' }}>
               <div className="text-[18px]" style={{ color: amountColor }}>
                 {amountPrefix}{formatCurrency(Math.abs(transaction.amount))}
               </div>
             </div>
          </div>

                     {/* Sections */}
           <div className="mt-6 flex flex-col text-sm text-gray-600">
                         {/* Status */}
             <div className="flex justify-between items-center border-t py-4 px-4" style={{ borderColor: 'var(--color-border-primary)' }}>
               <span className="text-[14px]" style={{ color: 'var(--color-text-primary)' }}>Status</span>
               <span 
                 className="text-[13px] px-2 py-1 rounded-full"
                 style={{ 
                   color: transaction.pending ? 'var(--color-warning)' : 'var(--color-success)',
                   background: transaction.pending ? 'var(--color-warning-bg)' : 'var(--color-success-bg)'
                 }}
               >
                 {transaction.pending ? 'Pending' : 'Posted'}
               </span>
             </div>

             {/* Category */}
             <div className="flex justify-between items-center border-t py-4 px-4" style={{ borderColor: 'var(--color-border-primary)' }}>
               <span className="text-[14px]" style={{ color: 'var(--color-text-primary)' }}>Category</span>
               <CategoryDropdown
                 categories={categories}
                 currentCategory={categories.find(cat => cat.id === localCategoryId)?.name}
                 currentColor={categories.find(cat => cat.id === localCategoryId)?.color}
                 onCategoryChange={handleCategoryChange}
               />
             </div>

             {/* Account */}
             {transaction.accounts?.name && (
               <div 
                 className="flex justify-between items-center border-t py-4 px-4 cursor-pointer transition-colors duration-150" 
                 style={{ borderColor: 'var(--color-border-primary)' }}
                 onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-hover)'}
                 onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                 onClick={() => navigate(`/accounts/${account?.type}/${account?.id}`)}
               >
                 <span className="text-[14px]" style={{ color: 'var(--color-text-primary)' }}>Account</span>
                 <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center" style={{ background: institutionLogo ? 'transparent' : 'var(--color-gray-200)', border: institutionLogo ? 'none' : '1px solid var(--color-border-primary)' }}>
                     {institutionLogo ? (
                       <img 
                         src={institutionLogo} 
                         alt={institutionName || 'Bank'} 
                         className="w-full h-full object-cover rounded-full"
                         style={{ filter: 'grayscale(1) brightness(1.2) contrast(0.8)' }}
                       />
                     ) : (
                       <div className="w-4 h-4 rounded-full bg-gray-400" />
                     )}
                   </div>
                   <div className="flex flex-col items-end">
                     <span className="text-[14px]" style={{ color: 'var(--color-text-secondary)' }}>{transaction.accounts.name}</span>
                     {transaction.accounts.mask && (
                       <span className="text-[11px] font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                         ••••{transaction.accounts.mask}
                       </span>
                     )}
                   </div>
                 </div>
               </div>
             )}

             {/* Type */}
             {transaction.subtype && (
               <div className="flex justify-between items-center border-t py-4 px-4" style={{ borderColor: 'var(--color-border-primary)' }}>
                 <span className="text-[14px]" style={{ color: 'var(--color-text-primary)' }}>Type</span>
                 <span className="text-[14px]" style={{ color: 'var(--color-text-secondary)' }}>{transaction.subtype}</span>
               </div>
             )}

             {/* Notes */}
             <div className="border-t py-4 px-4" style={{ borderColor: 'var(--color-border-primary)' }}>
               <label htmlFor="note" className="text-[14px]" style={{ color: 'var(--color-text-primary)' }}>
                 Note
               </label>
               <textarea
                 id="note"
                 placeholder="Add a note about this transaction..."
                 value={note}
                 onChange={(e) => setNote(e.target.value)}
                 className="mt-2 w-full bg-transparent border rounded-lg p-2 text-[14px] resize-none"
                 rows={3}
                 style={{
                   borderColor: 'var(--color-border-primary)',
                   color: 'var(--color-text-primary)',
                   fontFamily: 'inherit'
                 }}
               />
             </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default TransactionDetail;
