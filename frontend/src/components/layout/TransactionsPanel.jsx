import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FinancialContext } from '../../contexts/FinancialContext';
import { Spinner } from '../ui';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { FaSearch, FaChevronRight } from 'react-icons/fa';
import CategoryIcon from '../ui/CategoryIcon';
import CircleUserToggle from './CircleUserToggle';

const TransactionsPanel = ({ isMobile, maxWidth = 700, circleUsers }) => {
  const { transactions, transactionsLoading, accounts, user } = useContext(FinancialContext);
  const navigate = useNavigate();
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(user?.id || 'combined');
  const listRef = useRef(null);

  useEffect(() => {
    if (user?.id) {
      setSelectedUser(user.id);
    }
  }, [user]);

  const filteredTransactions = transactions.filter(
    (txn) =>
      (selectedAccount === 'all' || txn.accounts?.account_id === selectedAccount) &&
      txn.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group transactions by date
  const groupedTransactions = React.useMemo(() => {
    const grouped = {};
    filteredTransactions.forEach(txn => {
      const date = formatDate(txn.datetime);
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(txn);
    });
    return grouped;
  }, [filteredTransactions]);


  return (
    <>
      <main className="w-full max-w-full sm:max-w-[700px] mx-auto px-3 pt-0 box-border mb-4 overflow-x-hidden" style={{ background: 'var(--color-bg-primary)' }}>
        {/* Transactions Card - styled like recent transactions */}
        <div className="w-full box-border mx-auto max-w-full sm:max-w-[700px] overflow-x-hidden px-2">
          {transactionsLoading ? (
            <div className="h-full flex items-center justify-center min-h-[120px]">
              <Spinner size={28} />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-center px-6 min-h-[120px]" style={{ color: 'var(--color-text-muted)' }}>
              {transactions.length === 0
                ? 'No transactions found. Add accounts to see your transaction history.'
                : 'No transactions match your filters.'}
            </div>
          ) : (
            Object.entries(groupedTransactions).map(([date, transactionsForDate], dateIndex) => (
              <div key={date}>
                {/* Date divider */}
                <div className="px-2 py-3 border-b" style={{ borderColor: 'var(--color-border-primary)' }}>
                  <span className="text-[12px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                    {date}
                  </span>
                </div>
                {/* Transactions for this date */}
                {transactionsForDate.map((txn, i) => {
                  const isPositive = txn.amount > 0;
                  const amountColor = isPositive ? 'var(--color-success)' : 'var(--color-text-secondary)';
                  const amountPrefix = isPositive ? '+' : '';
                  return (
                    <div
                      key={txn.id || i}
                      className="flex items-center px-3 py-4 min-h-[70px] box-border border-b transition-all duration-200 cursor-pointer w-full max-w-full overflow-x-hidden transform hover:scale-[1.01] hover:shadow-md"
                      style={{ 
                        background: 'var(--color-bg-primary)', 
                        borderColor: 'var(--color-border-primary)',
                        margin: '4px 0'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--color-bg-hover)';
                        e.currentTarget.style.transform = 'translateY(-1px) scale(1.01)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--color-bg-primary)';
                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                      }}
                      onClick={() => navigate(`/transaction/${txn.id}`)}
                    >
                      {/* Icon/avatar - made smaller */}
                      <div className="flex-shrink-0 mr-3 sm:mr-4 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center overflow-hidden self-center transition-all duration-200 transform hover:scale-110" style={{ 
                        background: txn.icon_url ? 'transparent' : (txn.category_color || 'var(--color-bg-primary)'), 
                        border: 'none',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                        filter: 'drop-shadow(0 1px 3px rgba(0, 0, 0, 0.1))'
                      }}>
                        {txn.icon_url ? (
                          <img src={txn.icon_url} alt="icon" className="w-full h-full rounded-full object-cover block" />
                        ) : txn.category_icon_lib && txn.category_icon_name ? (
                          <CategoryIcon lib={txn.category_icon_lib} name={txn.category_icon_name} size={16} color={'var(--color-text-white)'} />
                        ) : (
                          <FaChevronRight size={14} style={{ color: 'var(--color-text-white)' }} />
                        )}
                      </div>
                      {/* Main info and category */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center px-3">
                        <div className="text-[14px] sm:text-[16px] truncate max-w-[160px] sm:max-w-[200px] lg:max-w-none" style={{ color: 'var(--color-text-primary)' }}>{txn.description}</div>
                        {txn.category_name && (
                          <div className="flex items-center gap-1 sm:gap-2 mt-1">
                            <span className="inline-block w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full flex-shrink-0" style={{ background: txn.category_color || 'var(--color-primary)' }} />
                            <span className="text-[9px] sm:text-[10px] tracking-wide truncate max-w-[100px] sm:max-w-none" style={{ color: 'var(--color-text-secondary)' }}>{txn.category_name}</span>
                          </div>
                        )}
                      </div>
                      {/* Amount */}
                      <div className="flex-shrink-0 text-right text-[12px] sm:text-[14px] min-w-[70px] sm:min-w-[90px] ml-3 whitespace-nowrap transition-colors duration-150 flex items-center justify-center self-center" style={{ color: amountColor }}>
                        {amountPrefix}{formatCurrency(Math.abs(txn.amount))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </main>
    </>
  );
};

export default TransactionsPanel;
