import React, { useState, useRef, useEffect } from 'react';
import { FiFilter } from 'react-icons/fi';
import { FaSearch, FaChevronRight } from 'react-icons/fa';
import { formatCurrency } from '../../utils/formatters';
import { useFinancial } from '../../contexts/FinancialContext';
import { Spinner, Button } from '../ui';
import CircleUserToggle from './CircleUserToggle';

const TransactionsPanel = ({ isMobile, maxWidth = 700, circleUsers }) => {
  const { transactions, transactionsLoading, accounts, user } = useFinancial();
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <main className="w-full max-w-full sm:max-w-[700px] mx-auto px-3 pt-0 box-border mb-4">
      {/* Sticky Filters/Search/Toggle Bar */}
      <div className="sticky top-[56px] z-20 bg-white w-full box-border px-2 sm:px-4 py-4 mb-5 border-b border-gray-200">
        <div className="flex flex-col gap-2 w-full">
          <div className="flex items-center justify-between gap-3 w-full">
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
              color="networth"
              width="w-auto"
              className="h-8 text-[13px] font-medium rounded-lg px-4"
              icon={<FiFilter size={18} />}
            />
          </div>
          <div className="flex items-center w-full">
            <div className="flex flex-1 items-center bg-gray-100 rounded-lg shadow-sm py-2 px-2 sm:px-4 min-h-[36px] w-full">
              <FaSearch size={15} className="mr-2 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-none outline-none flex-1 text-[14px] font-semibold text-gray-600 bg-transparent min-w-0 h-6"
                style={{ fontFamily: 'inherit' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Card - styled like recent transactions */}
      <div className="w-full box-border mx-auto max-w-full sm:max-w-[700px]">
        {transactionsLoading ? (
          <div className="h-full flex items-center justify-center min-h-[120px]">
            <Spinner size={28} />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm text-center px-6 min-h-[120px]">
            {transactions.length === 0
              ? 'No transactions found. Add accounts to see your transaction history.'
              : 'No transactions match your filters.'}
          </div>
        ) : (
          filteredTransactions.map((txn, i) => {
            const isPositive = txn.amount > 0;
            const amountColor = isPositive ? 'text-green-600' : 'text-red-600';
            const amountPrefix = isPositive ? '+' : '';
            return (
              <div
                key={i}
                className={`flex items-center bg-white px-2 sm:px-4 py-4 min-h-[80px] box-border border-b border-gray-200 transition-colors duration-150 cursor-pointer w-full max-w-full hover:bg-gray-50`}
              >
                {/* Icon/avatar */}
                <div className={`flex-shrink-0 mr-3 sm:mr-4 w-12 h-12 rounded-full flex items-center justify-center overflow-hidden self-center ${txn.icon_url ? 'bg-transparent border-none' : 'bg-gray-200 border border-gray-200'}`}>
                  {txn.icon_url ? (
                    <img src={txn.icon_url} alt="icon" className="w-full h-full rounded-full object-cover block" />
                  ) : (
                    <FaChevronRight size={20} className="text-gray-400" />
                  )}
                </div>
                {/* Main info and category */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="text-[16px] font-semibold text-gray-900 truncate max-w-[120px] sm:max-w-[220px]">{txn.description}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-slate-500 font-normal">{formatDate(txn.date)}</span>
                  </div>
                  {txn.category_name && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: txn.category_color || '#6366f1' }} />
                      <span className="text-[10px] font-medium text-slate-500 tracking-wide min-w-0 text-ellipsis overflow-hidden whitespace-nowrap">{txn.category_name}</span>
                    </div>
                  )}
                </div>
                {/* Amount */}
                <div className={`flex-shrink-0 text-right font-bold text-[14px] min-w-[56px] sm:min-w-[70px] ml-2 sm:ml-3 whitespace-nowrap transition-colors duration-150 flex items-center justify-center self-center ${amountColor}`}>
                  {amountPrefix}{formatCurrency(Math.abs(txn.amount))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
};

export default TransactionsPanel;
