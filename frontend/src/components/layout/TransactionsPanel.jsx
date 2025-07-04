import React, { useState, useRef } from 'react';
import { FiFilter } from 'react-icons/fi';
import { FaSearch, FaChevronRight } from 'react-icons/fa';
import LightDropdown from '../ui/LightDropdown';
import { formatCurrency } from '../../utils/formatters';
import { useFinancial } from '../../contexts/FinancialContext';
import { Spinner, Card } from '../ui';

const TransactionsPanel = ({ isMobile }) => {
  const { transactions, transactionsLoading, accounts, categories } = useFinancial();
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const listRef = useRef(null);

  const accountOptions = [
    { label: 'All Accounts', value: 'all' },
    ...accounts.map((account) => ({
      label: account.name,
      value: account.account_id,
    })),
  ];

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
    <main className="flex-1 px-[24px] py-[12px] overflow-hidden">
      {/* Filter Row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: 700,
          margin: '0 auto 12px auto',
          gap: 10,
        }}
      >
        {/* Search Input */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            height: 32,
            border: '1px solid #d1d5db',
            borderRadius: 6,
            padding: '0 10px',
            fontSize: 12,
            color: '#111827',
            backgroundColor: '#fff',
            boxSizing: 'border-box',
          }}
        >
          <FaSearch size={12} style={{ marginRight: 6, color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search transactions"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              flex: 1,
              fontSize: 12,
              height: '100%',
              color: '#111827',
              backgroundColor: 'transparent',
            }}
          />
        </div>

        {/* Account Dropdown */}
        <div style={{ height: 32 }}>
          <LightDropdown
            name="account"
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            options={accountOptions}
            style={{
              height: 32,
              fontSize: 12,
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Filters Button */}
        <button
          style={{
            height: 32,
            padding: '0 12px',
            backgroundColor: '#fff',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 500,
            color: '#374151',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            boxSizing: 'border-box',
          }}
        >
          <FiFilter size={12} />
          Filters
        </button>
      </div>

      {/* Transactions Table */}
      <Card className="w-full max-w-[700px] mx-auto p-0 overflow-hidden shadow-sm rounded-xl border border-gray-100" style={{ height: 'calc(100vh - 150px)', display: 'flex', flexDirection: 'column' }}>
        <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: 0 }}>
          {transactionsLoading ? (
            <div className="h-full flex items-center justify-center">
              <Spinner size={24} />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm text-center px-6">
              {transactions.length === 0
                ? 'No transactions found. Add accounts to see your transaction history.'
                : 'No transactions match your filters.'}
            </div>
          ) : (
            filteredTransactions.map((txn, i) => (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '42px 1fr 80px 16px',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderBottom: '1px solid #f3f4f6',
                  fontSize: 12,
                  gap: 12,
                  transition: 'background 0.15s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = '#f9fafb')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = 'transparent')
                }
              >
                {/* Icon */}
                {txn.icon_url ? (
                  <img
                    src={txn.icon_url}
                    alt=""
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 8,
                      objectFit: 'contain',
                      backgroundColor: '#f3f4f6',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      backgroundColor: '#e5e7eb',
                      borderRadius: 8,
                    }}
                  />
                )}

                {/* Description + Metadata */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ color: '#111827', fontWeight: 500 }}>{txn.description}</div>

                  <div style={{ fontSize: 11, color: '#6b7280', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <span>{formatDate(txn.date)}</span>
                    <span>· {txn.accounts?.name || 'Unknown Account'}</span>
                  </div>

                  {txn.category_name && (
                    <div style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 2 }}>
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          backgroundColor: txn.category_color || '#6b7280',
                          flexShrink: 0,
                        }}
                      />
                      <span>{txn.category_name}</span>
                    </div>
                  )}
                </div>

                {/* Amount */}
                <div
                  style={{
                    textAlign: 'right',
                    fontWeight: 500,
                    color: txn.amount > 0 ? '#16a34a' : '#1f2937',
                    fontSize: 12,
                  }}
                >
                  {txn.amount > 0
                    ? `+${formatCurrency(txn.amount)}`
                    : formatCurrency(Math.abs(txn.amount))}
                </div>

                {/* Chevron */}
                <div style={{ paddingLeft: 6 }}>
                  <FaChevronRight size={12} color="#9ca3af" style={{ cursor: 'pointer' }} />
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </main>
  );
};

export default TransactionsPanel;
