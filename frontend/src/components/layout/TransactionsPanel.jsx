import React, { useState, useRef, useEffect } from 'react';
import { FiFilter } from 'react-icons/fi';
import { FaSearch, FaChevronRight } from 'react-icons/fa';
import LightDropdown from '../ui/LightDropdown';
import { formatCurrency } from '../../utils/formatters';
import { useFinancial } from '../../contexts/FinancialContext';
import { Spinner, Card, Button } from '../ui';
import CircleUserToggle from './CircleUserToggle';
import { supabase } from '../../supabaseClient';

const TransactionsPanel = ({ isMobile, maxWidth = 700, circleUsers }) => {
  const { transactions, transactionsLoading, accounts, categories, user } = useFinancial();
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(user?.id || 'combined');
  const listRef = useRef(null);

  useEffect(() => {
    if (user?.id) {
      setSelectedUser(user.id);
    }
  }, [user]);

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

  // Helper to lighten a hex color
  function lightenColor(hex, percent) {
    if (!hex || typeof hex !== 'string') return hex;
    let c = hex.replace('#', '');
    if (c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
    const num = parseInt(c, 16);
    let r = (num >> 16) + Math.round(255 * percent);
    let g = ((num >> 8) & 0x00FF) + Math.round(255 * percent);
    let b = (num & 0x0000FF) + Math.round(255 * percent);
    r = r > 255 ? 255 : r;
    g = g > 255 ? 255 : g;
    b = b > 255 ? 255 : b;
    return `#${(r.toString(16)).padStart(2, '0')}${(g.toString(16)).padStart(2, '0')}${(b.toString(16)).padStart(2, '0')}`;
  }

  return (
    <main className="w-full" style={{ padding: '16px 10px', margin: 0 }}>
      {/* Sticky Filters/Search/Toggle Bar */}
      <div style={{
        position: 'sticky',
        top: 56, // height of Topbar
        zIndex: 20,
        background: '#fff',
        width: '100%',
        boxShadow: '0 2px 8px 0 rgba(59,130,246,0.04)',
        padding: '10px 0 8px 0',
        marginBottom: 18,
      }}>
        <div style={{ width: '100%', maxWidth: maxWidth, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, boxSizing: 'border-box' }}>
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
            color="#3b82f6"
            width="auto"
            style={{ height: 32, fontSize: 13, fontWeight: 500, padding: '0 16px', borderRadius: 10 }}
            icon={<FiFilter size={18} />}
          />
        </div>
        <div style={{ width: '100%', maxWidth: maxWidth, margin: '10px auto 0 auto', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            background: '#f3f4f6',
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
      </div>

      {/* Transactions Card - styled like recent transactions */}
      <div
        style={{
          width: '100%',
          maxWidth: maxWidth,
          margin: '0 auto 18px auto',
          boxSizing: 'border-box',
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
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#fff',
                  borderRadius: 12,
                  boxShadow: '0 1px 4px 0 rgba(59,130,246,0.04)',
                  marginBottom: 10,
                  padding: isMobile ? '14px 10px' : '18px 24px',
                  minHeight: 70,
                  boxSizing: 'border-box',
                  transition: 'background 0.18s',
                  cursor: 'pointer',
                  gap: 0,
                  border: '1.5px solid #f3f4f6',
                }}
                onMouseOver={e => e.currentTarget.style.background = '#f1f5ff'}
                onMouseOut={e => e.currentTarget.style.background = '#fff'}
              >
                {/* Icon/avatar */}
                <div style={{
                  flexShrink: 0,
                  marginRight: 16,
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: txn.icon_url ? '#f3f4f6' : '#e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  border: '1.5px solid #e5e7eb',
                }}>
                  {txn.icon_url ? (
                    <img src={txn.icon_url} alt="icon" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <FaChevronRight size={20} color="#9ca3af" />
                  )}
                </div>
                {/* Main info */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#222', marginBottom: 2, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: isMobile ? 140 : 220 }}>
                    {txn.description}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minHeight: 12 }}>
                    <span style={{ fontSize: 10, color: '#64748b', fontWeight: 400 }}>{formatDate(txn.date)}</span>
                    {txn.category_name && (
                      <span style={{
                        fontSize: 9,
                        fontWeight: 500,
                        color: '#fff',
                        background: `linear-gradient(90deg, ${txn.category_color || '#6366f1'} 0%, ${lightenColor(txn.category_color || '#6366f1', 0.15)} 100%)`,
                        borderRadius: 8,
                        padding: '2px 8px',
                        letterSpacing: 0.15,
                        display: 'inline-block',
                        minWidth: 0,
                        maxWidth: 80,
                        marginLeft: 8,
                        marginTop: 0,
                        verticalAlign: 'middle',
                        boxShadow: '0 1px 2px 0 rgba(59,130,246,0.04)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>{txn.category_name}</span>
                    )}
                  </div>
                </div>
                {/* Amount */}
                <div style={{
                  flexShrink: 0,
                  textAlign: 'right',
                  fontWeight: 700,
                  fontSize: 12,
                  color: amountColor,
                  minWidth: 70,
                  letterSpacing: -0.5,
                  marginLeft: 12,
                  whiteSpace: 'nowrap',
                  transition: 'color 0.18s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
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
