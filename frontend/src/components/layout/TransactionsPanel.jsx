import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FinancialContext } from '../../contexts/FinancialContext';
import { Spinner } from '../ui';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { FaSearch, FaChevronRight } from 'react-icons/fa';
import CategoryIcon from '../ui/CategoryIcon';
import CircleUserToggle from './CircleUserToggle';
import { useDrawer } from '../../App';
import TransactionDetail from './TransactionDetail';

const TransactionsPanel = ({ isMobile, maxWidth = 700, circleUsers, filteredTransactions, activeFilters, isApplyingFilters }) => {
  const { 
    transactions, 
    transactionsLoading, 
    transactionsUpdating, 
    hasMoreTransactions,
    isLoadingMoreTransactions,
    accounts, 
    user,
    loadMoreTransactions
  } = useContext(FinancialContext);
  const { openDrawer } = useDrawer();
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

  // Use filtered transactions if available, otherwise use regular transactions
  const baseTransactions = filteredTransactions !== null ? filteredTransactions : transactions;

  const filteredTransactionsList = baseTransactions.filter(
    (txn) =>
      (selectedAccount === 'all' || txn.accounts?.account_id === selectedAccount) &&
      txn.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group transactions by date
  const groupedTransactions = React.useMemo(() => {
    const grouped = {};
    filteredTransactionsList.forEach(txn => {
      const date = formatDate(txn.datetime);
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(txn);
    });
    return grouped;
  }, [filteredTransactionsList]);

  const handleTransactionClick = React.useCallback((transaction) => {
    // Create a wrapper component that shows loading initially
    const TransactionDetailWrapper = () => {
      const [isLoading, setIsLoading] = useState(true);
      
      React.useEffect(() => {
        // Hide loading after a short delay to allow component to render
        const timer = setTimeout(() => setIsLoading(false), 50);
        return () => clearTimeout(timer);
      }, []);
      
      if (isLoading) {
        return <Spinner label="Loading..." />;
      }
      
      return <TransactionDetail transaction={transaction} />;
    };
    
    openDrawer({
      title: 'Transaction Details',
      content: <TransactionDetailWrapper />,
      onClose: () => {
        // No navigation needed since we're using the global drawer
      }
    });
  }, [openDrawer]);

  const handleLoadMore = React.useCallback(() => {
    if (user?.id && hasMoreTransactions && !isLoadingMoreTransactions) {
      loadMoreTransactions(user.id);
    }
  }, [user?.id, hasMoreTransactions, isLoadingMoreTransactions, loadMoreTransactions]);

  return (
    <>
      <main className="w-full max-w-full sm:max-w-[700px] mx-auto px-3 pt-16 box-border mb-4 overflow-x-hidden" style={{ background: 'var(--color-bg-primary)' }}>
        {/* Background update indicator */}
        {transactionsUpdating && (
          <div className="fixed top-4 right-4 z-50">
            <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs flex items-center gap-2">
              <Spinner size={12} />
              <span>Updating...</span>
            </div>
          </div>
        )}
        
        {/* Transactions Card - styled like recent transactions */}
        <div className="w-full box-border mx-auto max-w-full sm:max-w-[700px] overflow-x-hidden px-2">
          {isApplyingFilters ? (
            <div className="h-full flex items-center justify-center min-h-[120px]">
              <Spinner size={28} />
            </div>
          ) : transactionsLoading && transactions.length === 0 ? (
            <div className="h-full flex items-center justify-center min-h-[120px]">
              <Spinner size={28} />
            </div>
          ) : filteredTransactionsList.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-center px-6 min-h-[120px]" style={{ color: 'var(--color-text-muted)' }}>
              {activeFilters 
                ? 'No transactions match your current filters. Try adjusting your filter criteria.'
                : transactions.length === 0
                  ? 'No transactions found. Add accounts to see your transaction history.'
                  : 'No transactions match your filters.'}
            </div>
          ) : (
            <>
              {Object.entries(groupedTransactions).map(([date, transactionsForDate], dateIndex) => (
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
                        className="flex items-center px-3 py-4 min-h-[70px] box-border border-b transition-all duration-200 cursor-pointer w-full max-w-full overflow-x-hidden"
                        style={{ 
                          background: 'var(--color-bg-primary)', 
                          borderColor: 'var(--color-border-primary)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--color-bg-hover)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'var(--color-bg-primary)';
                        }}
                        onClick={() => handleTransactionClick(txn)}
                      >
                        {/* Icon/avatar - made smaller */}
                        <div className="flex-shrink-0 mr-3 sm:mr-4 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center overflow-hidden self-center" style={{ 
                          background: txn.icon_url ? 'transparent' : (txn.category_color || 'var(--color-bg-primary)'), 
                          border: 'none'
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
              ))}
              
              {/* Load More Button */}
              {hasMoreTransactions && !activeFilters && (
                <div className="flex justify-center py-6">
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoadingMoreTransactions}
                    className="px-6 py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    style={{ 
                      background: 'var(--color-bg-secondary)',
                      color: 'var(--color-text-primary)',
                      border: '1px solid var(--color-border-primary)'
                    }}
                  >
                    {isLoadingMoreTransactions ? (
                      <div className="flex items-center gap-2">
                        <Spinner size={16} />
                        <span>Loading...</span>
                      </div>
                    ) : (
                      'Load More Transactions'
                    )}
                  </button>
                </div>
              )}
              
              {/* Filter notice */}
              {activeFilters && (
                <div className="flex justify-center py-4">
                  <div className="text-xs text-center px-4 py-2 rounded-lg" style={{ 
                    background: 'var(--color-bg-secondary)',
                    color: 'var(--color-text-muted)',
                    border: '1px solid var(--color-border-primary)'
                  }}>
                    Showing filtered results. Clear filters to load more transactions.
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
};

export default TransactionsPanel;
