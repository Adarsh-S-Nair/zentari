import React, { useState, useRef } from 'react';
import { FiFilter } from 'react-icons/fi';
import { FaSearch, FaChevronRight } from 'react-icons/fa';
import LightDropdown from '../ui/LightDropdown';
import { formatCurrency } from '../../utils/formatters';
import { useFinancial } from '../../contexts/FinancialContext';
import { Spinner, Card, Button } from '../ui';
import CircleUserToggle from './CircleUserToggle';

const TransactionsPanel = ({ isMobile, maxWidth = 700 }) => {
  const { transactions, transactionsLoading, accounts, categories } = useFinancial();
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const listRef = useRef(null);

  const accountOptions = [
    { label: 'All Accounts', value: 'all' },
    ...accounts.map((account) => ({
      label: account.name,
      value: account.account_id,
      mask: account.mask,
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

  // Helper for mask display
  const getMaskDisplay = (mask, isMobile) => {
    if (!mask) return '';
    return mask
  };

  return (
    <main className="flex-1 px-[24px] py-[12px] overflow-hidden">
      {/* CircleUserToggle and Filters Row */}
      <div style={{ width: '100%', maxWidth: maxWidth, margin: '0 auto 18px auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, boxSizing: 'border-box' }}>
        <CircleUserToggle
          users={[
            { id: 'combined', name: 'Combined' },
            { id: 'user1', name: 'Alice' },
            { id: 'user2', name: 'Bob' },
            { id: 'user3', name: 'Charlie' },
          ]}
          selectedUser={'combined'}
          onSelectUser={() => {}}
          onAddAccounts={() => {}}
          addLoading={false}
          maxWidth={maxWidth - 120}
        />
        <Button
          label="Filters"
          color="#3b82f6"
          width="auto"
          style={{ height: 32, fontSize: 13, fontWeight: 500, padding: '0 16px', borderRadius: 10 }}
          icon={<FiFilter size={18} />}
        />
      </div>

      {/* Modern search bar below toggle */}
      <div style={{ width: '100%', maxWidth: maxWidth, margin: '0 auto 18px auto', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(99,102,241,0.07)',
          borderRadius: 10,
          padding: isMobile ? '7px 10px' : '10px 16px',
          minHeight: 36,
          boxSizing: 'border-box',
          boxShadow: '0 1px 4px 0 rgba(59,130,246,0.04)',
        }}>
          <FaSearch size={15} style={{ marginRight: 8, color: '#6b7280' }} />
          <input
            type="text"
            placeholder="Search transactions"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              flex: 1,
              fontSize: 13,
              height: 24,
              color: '#222',
              backgroundColor: 'transparent',
              minWidth: 0,
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Transactions Card - styled like recent transactions */}
      <div
        style={{
          width: '100%',
          maxWidth: maxWidth,
          background: 'linear-gradient(120deg, #f7f8fa 0%, #f3f4f6 100%)',
          borderRadius: 14,
          boxShadow: '0 2px 8px 0 rgba(59,130,246,0.10)',
          border: '1.5px solid #e5e7eb',
          padding: 0,
          margin: '0 auto 18px auto',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        <div style={{ fontSize: isMobile ? 14 : 15, fontWeight: 500, color: '#222', padding: isMobile ? '10px 10px 6px 10px' : '13px 18px 7px 18px', borderBottom: '1px solid #f1f5f9', background: 'transparent', letterSpacing: 0.1 }}>All Transactions</div>
        <div
          ref={listRef}
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            maxHeight: isMobile ? 'calc(100vh - 310px)' : 'calc(100vh - 280px)',
            overflowY: 'auto',
            padding: 0
          }}
        >
          {transactionsLoading ? (
            <div className="h-full flex items-center justify-center" style={{ minHeight: 120 }}>
              <Spinner size={28} />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm text-center px-6" style={{ minHeight: 120 }}>
              {transactions.length === 0
                ? 'No transactions found. Add accounts to see your transaction history.'
                : 'No transactions match your filters.'}
            </div>
          ) : (
            filteredTransactions.map((txn, i) => {
              const isPositive = txn.amount > 0;
              const amountColor = isPositive ? '#16a34a' : '#dc2626';
              const amountPrefix = isPositive ? '+' : '';
              return (
                <div
                  key={i}
                  style={
                    isMobile
                      ? {
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: i % 2 === 0 ? '#fff' : '#f8fafc',
                          borderBottom: i === filteredTransactions.length - 1 ? 'none' : '1px solid #f1f5f9',
                          padding: '18px 8px 24px 8px',
                          minHeight: 110,
                          boxSizing: 'border-box',
                          transition: 'background 0.18s',
                          cursor: 'pointer',
                          gap: 0,
                        }
                      : {
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: i % 2 === 0 ? '#fff' : '#f8fafc',
                          borderBottom: i === filteredTransactions.length - 1 ? 'none' : '1px solid #f1f5f9',
                          padding: '28px 32px',
                          minHeight: 96,
                          boxSizing: 'border-box',
                          transition: 'background 0.18s',
                          cursor: 'pointer',
                          gap: 0,
                        }
                  }
                  onMouseOver={e => e.currentTarget.style.background = '#f1f5ff'}
                  onMouseOut={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#f8fafc'}
                >
                  {isMobile ? (
                    <>
                      {/* Left: Icon and main info */}
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
                        {/* Icon */}
                        <div style={{ flexShrink: 0, marginRight: 12, display: 'flex', alignItems: 'center', height: '100%' }}>
                          {txn.icon_url ? (
                            <img src={txn.icon_url} alt="icon" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', background: '#f3f4f6', border: '1.5px solid #e5e7eb', display: 'block' }} />
                          ) : (
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e5e7eb', display: 'block' }} />
                          )}
                        </div>
                        {/* Main info */}
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, overflow: 'hidden', justifyContent: 'center' }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#222', marginBottom: 2, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 140 }}>{txn.description}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', minHeight: 12 }}>
                            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>{formatDate(txn.date)}</span>
                            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>
                              · {txn.accounts?.name || 'Unknown Account'}
                              {txn.accounts?.mask && (
                                <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: 11, marginLeft: 4 }}>
                                  {getMaskDisplay(txn.accounts.mask, isMobile)}
                                </span>
                              )}
                            </span>
                          </div>
                          {/* Category pill row, always visible and not clipped */}
                          {txn.category_name && (
                            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{
                                fontSize: 11,
                                fontWeight: 400,
                                color: txn.category_color || '#6366f1',
                                background: txn.category_color ? `${txn.category_color}22` : '#eef2ff',
                                borderRadius: 7,
                                padding: '4px 12px',
                                letterSpacing: 0.1,
                                display: 'inline-block',
                                minWidth: 0,
                                maxWidth: 140,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}>{txn.category_name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Right: Amount only, vertically centered */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 70, marginLeft: 8, height: '100%' }}>
                        <div style={{ fontWeight: 600, fontSize: 15, color: amountColor, letterSpacing: -0.5, whiteSpace: 'nowrap', overflow: 'hidden', paddingRight: 2 }}>
                          {amountPrefix}{formatCurrency(Math.abs(txn.amount))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Icon - circle style */}
                      <div style={{ flexShrink: 0, marginRight: 22 }}>
                        {txn.icon_url ? (
                          <img src={txn.icon_url} alt="icon" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', background: '#f3f4f6', border: '1.5px solid #e5e7eb' }} />
                        ) : (
                          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#e5e7eb' }} />
                        )}
                      </div>
                      {/* Description/metadata */}
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 2, overflow: 'hidden' }}>
                        <div style={{ fontSize: 15, fontWeight: 500, color: '#222', marginBottom: 2, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 200 }}>{txn.description}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minHeight: 16 }}>
                          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>{formatDate(txn.date)}</span>
                          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>
                            · {txn.accounts?.name || 'Unknown Account'} · 
                            {txn.accounts?.mask && (
                              <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: 12, marginLeft: 4 }}>
                                {getMaskDisplay(txn.accounts.mask, false)}
                              </span>
                            )}
                          </span>
                        </div>
                        {/* Category pill row */}
                        {txn.category_name && (
                          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{
                              fontSize: 12,
                              fontWeight: 400,
                              color: txn.category_color || '#6366f1',
                              background: txn.category_color ? `${txn.category_color}22` : '#eef2ff',
                              borderRadius: 7,
                              padding: '3px 10px',
                              letterSpacing: 0.1,
                              display: 'inline-block',
                              minWidth: 0,
                              maxWidth: 120,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>{txn.category_name}</span>
                          </div>
                        )}
                      </div>
                      {/* Amount */}
                      <div style={{ flex: 1, textAlign: 'right', fontWeight: 600, fontSize: 16, color: amountColor, minWidth: 70, letterSpacing: -0.5, marginTop: 0, whiteSpace: 'nowrap', overflow: 'hidden', paddingRight: 12 }}>
                        {amountPrefix}{formatCurrency(Math.abs(txn.amount))}
                      </div>
                      {/* Chevron */}
                      <div style={{ paddingLeft: 8 }}>
                        <FaChevronRight size={14} color="#9ca3af" style={{ cursor: 'pointer' }} />
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
};

export default TransactionsPanel;
