import React, { useState, useRef, useEffect } from 'react';
import { FiFilter } from 'react-icons/fi';
import { FaSearch, FaChevronRight } from 'react-icons/fa';
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

      <main className="w-full max-w-full sm:max-w-[700px] mx-auto px-3 pt-0 box-border mb-4" style={{ background: 'var(--color-bg-primary)' }}>
        {/* Transactions Card - styled like recent transactions */}
        <div className="w-full box-border mx-auto max-w-full sm:max-w-[700px]">
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
            filteredTransactions.map((txn, i) => {
              const isPositive = txn.amount > 0;
              const amountColor = isPositive ? 'var(--color-success)' : 'var(--color-text-secondary)';
              const amountPrefix = isPositive ? '+' : '';
              return (
                <div
                  key={i}
                  className="flex items-center px-2 py-4 min-h-[80px] box-border border-b transition-colors duration-150 cursor-pointer w-full max-w-full"
                  style={{ background: 'var(--color-bg-primary)', borderColor: 'var(--color-border-primary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-bg-primary)'}
                  onClick={() => navigate(`/transaction/${txn.id}`)}
                >
                  {/* Icon/avatar */}
                  <div className="flex-shrink-0 mr-3 sm:mr-4 w-12 h-12 rounded-full flex items-center justify-center overflow-hidden self-center" style={{ background: txn.icon_url ? 'transparent' : 'var(--color-gray-200)', border: txn.icon_url ? 'none' : '1px solid var(--color-border-primary)' }}>
                    {txn.icon_url ? (
                      <img src={txn.icon_url} alt="icon" className="w-full h-full rounded-full object-cover block" />
                    ) : (
                      <FaChevronRight size={20} style={{ color: 'var(--color-text-muted)' }} />
                    )}
                  </div>
                  {/* Main info and category */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="text-[16px] truncate max-w-[120px] sm:max-w-[220px]" style={{ color: 'var(--color-text-primary)' }}>{txn.description}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-normal" style={{ color: 'var(--color-text-secondary)' }}>{formatDate(txn.datetime)}</span>
                    </div>
                    {txn.category_name && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: txn.category_color || 'var(--color-primary)' }} />
                        <span className="text-[10px] tracking-wide min-w-0 text-ellipsis overflow-hidden whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>{txn.category_name}</span>
                      </div>
                    )}
                  </div>
                  {/* Amount */}
                  <div className="flex-shrink-0 text-right text-[14px] min-w-[56px] sm:min-w-[70px] ml-2 sm:ml-3 whitespace-nowrap transition-colors duration-150 flex items-center justify-center self-center" style={{ color: amountColor }}>
                    {amountPrefix}{formatCurrency(Math.abs(txn.amount))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </>
  );
};

export default TransactionsPanel;
