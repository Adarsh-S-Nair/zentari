import React, { useState, useRef, useEffect } from 'react';
import { FiFilter } from 'react-icons/fi';
import { FaSearch, FaChevronRight } from 'react-icons/fa';
import CategoryIcon from '../ui/CategoryIcon';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useFinancial } from '../../contexts/FinancialContext';
import { Spinner, Button } from '../ui';
import CircleUserToggle from './CircleUserToggle';
import { useNavigate } from 'react-router-dom';
import PageToolbar from './PageToolbar';

const TransactionsPanel = ({ isMobile, maxWidth = 700, circleUsers }) => {
  const { transactions, transactionsLoading, accounts, user } = useFinancial();
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
      <PageToolbar>
        <div className="max-w-[700px] mx-auto flex items-center justify-between w-full gap-3 px-3">
          <CircleUserToggle
            users={circleUsers}
            selectedUser={selectedUser}
            onSelectUser={setSelectedUser}
            onAddAccounts={() => {}}
            addLoading={false}
            maxWidth={maxWidth - 120}
          />
          <Button
            label="Filters"
            icon={<FiFilter size={16} />}
            width="w-32"
            className="h-8"
            color="networth"
          />
        </div>
        <div className="max-w-[700px] mx-auto px-3 mt-2">
          <div 
            className="flex items-center py-2.5 px-3 min-h-[40px] w-full" 
            style={{ 
              background: 'var(--color-bg-secondary)',
              borderRadius: '8px',
              boxShadow: '0 1px 2px 0 var(--color-shadow-light)'
            }}
          >
            <FaSearch size={14} className="mr-3" style={{ color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder="Search transactions"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-none outline-none flex-1 text-[14px] bg-transparent min-w-0 h-6 w-full"
              style={{ 
                fontFamily: 'inherit', 
                color: 'var(--color-text-primary)',
                fontSize: '14px'
              }}
            />
          </div>
        </div>
      </PageToolbar>

      <main className="w-full max-w-full sm:max-w-[700px] mx-auto px-3 pt-0 box-border mb-4 overflow-x-hidden" style={{ background: 'var(--color-bg-primary)' }}>
        {/* Transactions Card - styled like recent transactions */}
        <div className="w-full box-border mx-auto max-w-full sm:max-w-[700px] overflow-x-hidden">
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
                      className="flex items-center px-2 py-4 min-h-[70px] box-border border-b transition-colors duration-150 cursor-pointer w-full max-w-full overflow-x-hidden"
                      style={{ background: 'var(--color-bg-primary)', borderColor: 'var(--color-border-primary)' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-bg-primary)'}
                      onClick={() => navigate(`/transaction/${txn.id}`)}
                    >
                      {/* Icon/avatar - made smaller */}
                      <div className="flex-shrink-0 mr-3 sm:mr-4 w-10 h-10 rounded-full flex items-center justify-center overflow-hidden self-center" style={{ background: txn.icon_url ? 'transparent' : 'var(--color-bg-primary)', border: 'none' }}>
                        {txn.icon_url ? (
                          <img src={txn.icon_url} alt="icon" className="w-full h-full rounded-full object-cover block" />
                        ) : txn.category_icon_lib && txn.category_icon_name ? (
                          <CategoryIcon lib={txn.category_icon_lib} name={txn.category_icon_name} size={18} color={'var(--color-text-muted)'} />
                        ) : (
                          <FaChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
                        )}
                      </div>
                      {/* Main info and category */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="text-[16px] truncate max-w-[140px] sm:max-w-[220px]" style={{ color: 'var(--color-text-primary)' }}>{txn.description}</div>
                        {txn.category_name && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: txn.category_color || 'var(--color-primary)' }} />
                            <span className="text-[10px] tracking-wide truncate max-w-[80px] sm:max-w-[160px]" style={{ color: 'var(--color-text-secondary)' }}>{txn.category_name}</span>
                          </div>
                        )}
                      </div>
                      {/* Amount */}
                      <div className="flex-shrink-0 text-right text-[14px] min-w-[56px] sm:min-w-[70px] ml-2 sm:ml-3 whitespace-nowrap transition-colors duration-150 flex items-center justify-center self-center" style={{ color: amountColor }}>
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
