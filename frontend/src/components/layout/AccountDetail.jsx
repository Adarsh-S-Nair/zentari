import React, { useContext, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { FaCircleCheck, FaCircleXmark, FaWallet, FaCreditCard } from 'react-icons/fa6';
import { FinancialContext } from '../../contexts/FinancialContext';
import { formatCurrency, capitalizeWords, formatDate, formatLastUpdated } from '../../utils/formatters';
import Toggle from '../ui/Toggle';
import Spinner from '../ui/Spinner';

const AccountDetail = ({ maxWidth = 700, account: propAccount }) => {
  const { accountId } = useParams();
  const navigate = useNavigate();
  const { accounts, transactions = [], loading } = useContext(FinancialContext) || {};
  // Use propAccount if provided, otherwise fallback to context lookup
  const account = propAccount || accounts?.find(acc => String(acc.id) === String(accountId));

  // Local state for optimistic UI
  const [autoSyncLoading, setAutoSyncLoading] = useState(false);
  const [autoSyncError, setAutoSyncError] = useState(null);
  const [localAutoSync, setLocalAutoSync] = useState(account?.auto_sync);

  // State for plaid_item sync info
  const [plaidItem, setPlaidItem] = useState(null);
  const [plaidItemLoading, setPlaidItemLoading] = useState(true);
  const [plaidItemError, setPlaidItemError] = useState(null);

  useEffect(() => {
    if (!account) return;
    setPlaidItemLoading(true);
    setPlaidItemError(null);
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'localhost:8000';
    const url = `${baseUrl.replace(/\/$/, '')}/database/account/${account.id}/plaid-item`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPlaidItem(data.plaid_item);
        } else {
          setPlaidItemError(data.error || 'Failed to fetch sync info');
        }
      })
      .catch(err => setPlaidItemError(err.message))
      .finally(() => setPlaidItemLoading(false));
  }, [account]);

  if (loading || (!accounts && !account)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', width: '100%' }}>
        <Spinner label="Loading account..." />
      </div>
    );
  }
  if (!account) {
    return <div style={{ padding: 32, fontSize: 18, color: '#dc2626' }}>Account not found.</div>;
  }
  const lastFour = account.mask ? String(account.mask).slice(-4) : '';
  const balances = account.balances || {};
  // Filter transactions for this account
  const accountTransactions = transactions.filter(
    t => t.accounts?.account_id === account.account_id
  ).slice(0, 8); // Show up to 8 recent
  const institutionLogo = account?.institution_logo || null;

  // Responsive helpers
  const isMobileScreen = typeof window !== 'undefined' && window.innerWidth <= 400;

  return (
    <main className="flex-1 px-[24px] overflow-y-auto overflow-x-hidden">
      <div style={{ width: '100%', maxWidth: maxWidth, margin: '0 auto' }}>
        <div className="flex flex-col items-center pt-[20px] pb-[24px]">
          {/* Account Overview Card - Gradient, white text, full width */}
          <div
            style={{
              width: '100%',
              background: 'linear-gradient(90deg, #6366f1 0%, #60a5fa 100%)',
              borderRadius: 16,
              boxShadow: '0 6px 32px 0 rgba(59,130,246,0.16), 0 1.5px 8px 0 rgba(59,130,246,0.10)',
              padding: isMobileScreen ? '14px' : '20px 32px',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxSizing: 'border-box',
              marginBottom: 18,
              gap: 18,
              color: '#fff',
              minWidth: 0,
              position: 'relative',
            }}
          >
            {/* Left: logo, name, institution, subtype */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1, overflow: 'hidden' }}>
              {account.institution_logo && (
                <img
                  src={account.institution_logo}
                  alt="Institution Logo"
                  style={{
                    height: 38,
                    width: 38,
                    objectFit: 'cover',
                    borderRadius: '50%',
                    background: '#f3f4f6',
                    boxShadow: '0 2px 8px 0 rgba(59,130,246,0.10)',
                    flexShrink: 0,
                    border: '2px solid #fff',
                  }}
                />
              )}
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                <div style={{
                  fontSize: isMobileScreen ? 14 : 15,
                  fontWeight: 700,
                  color: '#fff',
                  marginBottom: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  minWidth: 0,
                  flexWrap: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  maxWidth: isMobileScreen ? 160 : 220,
                }}>
                  <span style={{
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    maxWidth: isMobileScreen ? 100 : 140,
                    display: 'inline-block',
                  }}>{account.name}</span>
                  {lastFour && (
                    <span style={{
                      fontSize: isMobileScreen ? 11 : 12,
                      color: '#e0e7ff',
                      fontWeight: 600,
                      background: 'rgba(255,255,255,0.18)',
                      borderRadius: 999,
                      padding: isMobileScreen ? '2px 7px' : '2.5px 10px',
                      marginLeft: 6,
                      letterSpacing: 1,
                      display: 'inline-block',
                      minWidth: 28,
                      maxWidth: 40,
                      textAlign: 'center',
                      boxShadow: '0 1px 4px rgba(59,130,246,0.08)',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                    }}>{lastFour}</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', minWidth: 0 }}>
                  <span style={{ fontSize: isMobileScreen ? 11 : 12, color: '#e0e7ff', fontWeight: 500, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: isMobileScreen ? 70 : 120 }}>{account.institution_name}</span>
                  {account.subtype && (
                    <span style={{
                      fontSize: isMobileScreen ? 10 : 11,
                      fontWeight: 600,
                      color: '#fff',
                      background: 'rgba(255,255,255,0.13)',
                      borderRadius: 999,
                      padding: isMobileScreen ? '2px 7px' : '2.5px 9px',
                      display: 'inline-block',
                      letterSpacing: 0.2,
                      marginLeft: 2,
                      maxWidth: isMobileScreen ? 60 : 100,
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                    }}>{capitalizeWords(account.subtype)}</span>
                  )}
                </div>
              </div>
            </div>
            {/* Right: current balance only (toggle moved elsewhere) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMobileScreen ? 'flex-end' : 'flex-end', minWidth: 0, flexShrink: 0, marginLeft: isMobileScreen ? 8 : 0, position: 'relative' }}>
              <div style={{ fontSize: isMobileScreen ? 16 : 18, fontWeight: 700, color: '#fff', letterSpacing: -1, textShadow: '0 1px 4px rgba(59,130,246,0.10)', marginBottom: 2, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', minWidth: 0, paddingRight: isMobileScreen ? 6 : 8 }}>
                {balances.current != null ? formatCurrency(balances.current) : 'N/A'}
              </div>
              <div style={{ fontSize: isMobileScreen ? 10 : 11, color: '#e0e7ff', fontWeight: 500 }}>Current Balance</div>
            </div>
          </div>

          {/* Limit/Available Balance Card (if exists) */}
          {(balances.limit != null || balances.available != null) && (
            <div style={{
              width: '100%',
              background: 'linear-gradient(120deg, #f7f8fa 0%, #f3f4f6 100%)',
              borderRadius: 14,
              boxShadow: '0 4px 18px 0 rgba(59,130,246,0.10), 0 1.5px 8px 0 rgba(59,130,246,0.06)',
              border: '1.5px solid #e5e7eb',
              padding: isMobileScreen ? '10px 12px 8px 12px' : '14px 22px 12px 22px',
              color: '#334155',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              boxSizing: 'border-box',
              marginBottom: 10,
              fontSize: isMobileScreen ? 12 : 13,
              fontWeight: 500,
              gap: 2,
            }}>
              {balances.available != null && (
                <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: balances.limit != null ? 2 : 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.85 }}>
                    <FaWallet size={15} style={{ opacity: 0.7, marginRight: 2 }} />
                    Available
                  </span>
                  <span style={{ fontWeight: 700 }}>{formatCurrency(balances.available)}</span>
                </div>
              )}
              {balances.limit != null && (
                <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.85 }}>
                    <FaCreditCard size={15} style={{ opacity: 0.7, marginRight: 2 }} />
                    Limit
                  </span>
                  <span style={{ fontWeight: 700 }}>{formatCurrency(balances.limit)}</span>
                </div>
              )}
            </div>
          )}
          {/* Last Transaction Sync Row (Plaid) */}
          {plaidItemLoading ? (
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontSize: 11, color: '#64748b', fontWeight: 400, margin: '-2px 0 10px 0', padding: '0 18px 0 0', minHeight: 20 }}>
              <span>Loading sync info...</span>
            </div>
          ) : plaidItemError ? (
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontSize: 11, color: '#dc2626', fontWeight: 400, margin: '-2px 0 10px 0', padding: '0 18px 0 0', minHeight: 20 }}>
              <span>Error loading sync info</span>
            </div>
          ) : plaidItem && (
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, fontSize: 11, color: '#64748b', fontWeight: 400, margin: '-2px 0 10px 0', padding: '0 18px 0 0', minHeight: 20 }}>
              <span style={{ display: 'flex', alignItems: 'center' }}>
                {account.update_success ? (
                  <FaCircleCheck size={12} style={{ color: 'var(--color-success)', marginRight: 3 }} />
                ) : (
                  <FaCircleXmark size={12} style={{ color: 'var(--color-danger)', marginRight: 3 }} />
                )}
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>
                  {plaidItem.last_transaction_sync ? formatLastUpdated(plaidItem.last_transaction_sync) : 'Never synced'}
                </span>
              </span>
              {/* Auto Sync Toggle with label */}
              {'auto_sync' in account && (
                <span style={{ display: 'flex', alignItems: 'center', marginLeft: 10 }}>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500, marginRight: 5 }}>Auto-Sync</span>
                  <Toggle
                    checked={localAutoSync ?? !!account.auto_sync}
                    onChange={async (checked) => {
                      setAutoSyncLoading(true);
                      setAutoSyncError(null);
                      setLocalAutoSync(checked);
                      try {
                        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'localhost:8000';
                        const url = `${baseUrl.replace(/\/$/, '')}/database/account/${account.account_id}/auto-sync`;
                        const res = await fetch(url, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ auto_sync: checked })
                        });
                        const data = await res.json();
                        if (!data.success) {
                          setLocalAutoSync(!checked); // revert
                          setAutoSyncError('Failed to update auto-sync');
                          alert('Failed to update auto-sync: ' + (data.error || 'Unknown error'));
                        }
                      } catch (err) {
                        setLocalAutoSync(!checked); // revert
                        setAutoSyncError('Failed to update auto-sync');
                        alert('Failed to update auto-sync: ' + err.message);
                      } finally {
                        setAutoSyncLoading(false);
                      }
                    }}
                    size={isMobileScreen ? 'small' : 'medium'}
                    color="#6366f1"
                    disabled={autoSyncLoading}
                  />
                </span>
              )}
            </div>
          )}

          {/* Recent Transactions Widget - Card rows, mobile friendly */}
          <div
            style={{
              width: '100%',
              background: 'linear-gradient(120deg, #f7f8fa 0%, #f3f4f6 100%)',
              borderRadius: 14,
              boxShadow: '0 2px 8px 0 rgba(59,130,246,0.10)',
              border: '1.5px solid #e5e7eb',
              padding: '0',
              marginBottom: 18,
              boxSizing: 'border-box',
              overflow: 'hidden',
            }}
          >
            {/* Card-style header, not bold */}
            <div style={{
              fontSize: isMobileScreen ? 14 : 15,
              fontWeight: 500,
              color: '#222',
              padding: isMobileScreen ? '10px 10px 6px 10px' : '13px 18px 7px 18px',
              borderBottom: '1px solid #f1f5f9',
              background: 'transparent',
              letterSpacing: 0.1,
            }}>Recent Transactions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, width: '100%' }}>
              {accountTransactions.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9ca3af', padding: isMobileScreen ? '12px 0' : '18px 0', fontSize: isMobileScreen ? 12 : 13 }}>No recent transactions</div>
              ) : accountTransactions.map((txn, idx) => {
                const isPositive = txn.amount > 0;
                const amountColor = isPositive ? '#059669' : '#222';
                const amountPrefix = isPositive ? '+' : '';
                return (
                  <div
                    key={txn.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: idx % 2 === 0 ? '#fff' : '#f8fafc',
                      borderBottom: idx === accountTransactions.length - 1 ? 'none' : '1px solid #f1f5f9',
                      padding: isMobileScreen ? '8px 10px' : '10px 18px',
                      minHeight: isMobileScreen ? 32 : 38,
                      boxSizing: 'border-box',
                      transition: 'background 0.18s',
                      cursor: 'pointer',
                      gap: 0,
                    }}
                    onMouseOver={e => e.currentTarget.style.background = '#f1f5ff'}
                    onMouseOut={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#f8fafc'}
                  >
                    {/* Icon */}
                    <div style={{ flexShrink: 0, marginRight: isMobileScreen ? 8 : 14 }}>
                      {txn.icon_url ? (
                        <img src={txn.icon_url} alt="icon" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', background: '#f3f4f6', border: '1.5px solid #e5e7eb' }} />
                      ) : (
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e5e7eb' }} />
                      )}
                    </div>
                    {/* Description/metadata */}
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 2, overflow: 'hidden' }}>
                      <div style={{ fontSize: isMobileScreen ? 12 : 13, fontWeight: 400, color: '#222', marginBottom: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: isMobileScreen ? 120 : 180 }}>{txn.description}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: isMobileScreen ? 5 : 8, flexWrap: 'wrap', minHeight: isMobileScreen ? 12 : 16 }}>
                        <span style={{ fontSize: isMobileScreen ? 10 : 11, color: '#64748b', fontWeight: 400 }}>{formatDate(txn.date)}</span>
                        {txn.category_name && (
                          <span style={{
                            fontSize: isMobileScreen ? 10 : 11,
                            fontWeight: 400,
                            color: txn.category_color || '#6366f1',
                            background: txn.category_color ? `${txn.category_color}22` : '#eef2ff',
                            borderRadius: 7,
                            padding: isMobileScreen ? '1px 5px' : '1.5px 7px',
                            marginLeft: 2,
                            letterSpacing: 0.1,
                            display: 'inline-block',
                            minWidth: 0,
                            maxWidth: isMobileScreen ? 60 : 90,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>{txn.category_name}</span>
                        )}
                      </div>
                    </div>
                    {/* Amount */}
                    <div style={{ flex: 1, textAlign: 'right', fontWeight: 500, fontSize: isMobileScreen ? 12 : 13, color: amountColor, minWidth: isMobileScreen ? 40 : 60, letterSpacing: -0.5, marginTop: 0, whiteSpace: 'nowrap', overflow: 'hidden', paddingRight: isMobileScreen ? 6 : 8 }}>
                      {amountPrefix}{formatCurrency(Math.abs(txn.amount))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default AccountDetail; 