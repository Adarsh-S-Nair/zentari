import React, { useContext, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { FaCircleCheck, FaCircleXmark, FaWallet, FaCreditCard } from 'react-icons/fa6';
import { FaSyncAlt } from 'react-icons/fa';
import { MdEdit } from 'react-icons/md';
import IconButton from '../ui/IconButton';
import { FinancialContext } from '../../contexts/FinancialContext';
import { formatCurrency, capitalizeWords, formatDate, formatLastUpdated } from '../../utils/formatters';
import Toggle from '../ui/Toggle';
import Spinner from '../ui/Spinner';

const AccountDetail = ({ maxWidth = 700, account: propAccount }) => {
  const { accountId } = useParams();
  const navigate = useNavigate();
  const { accounts, transactions = [], loading, plaidItems } = useContext(FinancialContext) || {};
  // Use propAccount if provided, otherwise fallback to context lookup
  const account = propAccount || accounts?.find(acc => String(acc.id) === String(accountId));

  // Local state for optimistic UI
  const [autoSyncLoading, setAutoSyncLoading] = useState(false);
  const [autoSyncError, setAutoSyncError] = useState(null);
  const [localAutoSync, setLocalAutoSync] = useState(account?.auto_sync);
  const [editingName, setEditingName] = useState(false);
  const [editedName, setEditedName] = useState(account?.name || '');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState(null);
  const [localName, setLocalName] = useState(account?.name || '');

  // Get plaid item from context
  const plaidItem = account?.item_id ? plaidItems?.[account.item_id] : null;

  // Use the app's primary color for toggles
  const appBlue = 'var(--color-primary)';

  if (loading || (!accounts && !account)) {
    return (
      <div className="flex items-center justify-center h-[60vh] w-full">
        <Spinner label="Loading account..." />
      </div>
    );
  }
  if (!account) {
    return <div className="p-8 text-lg text-red-600">Account not found.</div>;
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

  // Determine gradient based on type
  const type = (account?.type || '').toLowerCase();
  let gradientStyle = { background: 'var(--color-gradient-primary)' }; // default (investment/other)
  if (type === 'depository') gradientStyle = { background: 'var(--color-gradient-success)' };
  else if (type === 'credit') gradientStyle = { background: 'linear-gradient(135deg, var(--color-danger) 0%, var(--color-danger-light) 100%)' };
  else if (type === 'loan') gradientStyle = { background: 'linear-gradient(135deg, var(--color-warning) 0%, var(--color-warning-light) 100%)' };
  else if (type === 'investment') gradientStyle = { background: 'var(--color-gradient-primary)' };

  return (
    <main className="w-full max-w-[700px] mx-auto px-4 box-border pb-0 mb-0">
      <div className="w-full m-0">
        <div className="flex flex-col items-center pt-5 pb-2">
          {/* Account Overview Row (info cards removed) */}
          <div className="w-full flex flex-wrap gap-4 mb-7">
            {/* Account Overview Card - Credit card style, green gradient */}
            <div
              className="flex-1 min-w-[300px] rounded-2xl text-white px-7 py-6 shadow-lg transition-transform duration-200 hover:scale-102 hover:shadow-xl relative overflow-hidden flex flex-col gap-4"
              style={gradientStyle}
            >
              {/* Decorative circles pattern */}
              <div className="absolute -bottom-16 -left-16 w-48 h-52 rounded-full opacity-20" style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '45% 55% 52% 48% / 48% 52% 48% 52%' }}></div>
              <div className="absolute -top-12 -right-12 w-56 h-48 rounded-full opacity-15" style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '52% 48% 48% 52% / 52% 48% 52% 48%' }}></div>
              <div className="absolute -bottom-34 -right-20 w-60 h-56 rounded-full opacity-15" style={{ background: 'rgba(0,0,0,0.22)', borderRadius: '60% 40% 55% 45% / 50% 60% 40% 50%' }}></div>
            {/* Top Row: Balance (left) and Institution Logo (right) */}
            <div className="flex items-start justify-between w-full">
              {/* Balance Section - Top Left */}
              <div className="flex flex-col items-start">
                <span className="text-[13px] font-medium opacity-80 tracking-wide mb-1" style={{ color: 'var(--color-text-white)' }}>Current Balance</span>
                <span className="text-[20px] font-medium -tracking-[0.5px] opacity-92" style={{ color: 'var(--color-text-white)' }}>
                  {balances.current != null ? formatCurrency(balances.current) : 'N/A'}
                </span>
              </div>
              
              {/* Institution Logo - Top Right */}
              <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>
                {account.institution_logo ? (
                  <img
                    src={account.institution_logo}
                    alt={account.institution_name || 'Bank'}
                    className="w-full h-full object-cover"
                    style={{ filter: 'grayscale(1) brightness(2.2) contrast(0.7) opacity(0.5)' }}
                  />
                ) : null}
              </div>
            </div>

            {/* Bottom Row: Account Name (left) and Masked Number (right) */}
            <div className="flex items-end justify-between w-full mt-auto">
              {/* Account Name Section - Bottom Left */}
              <div className="flex flex-col min-w-0 flex-1 mr-4">
                <span className="text-[17px] font-semibold -tracking-[0.5px] flex items-center gap-2 min-w-0 overflow-hidden h-[28px] max-h-[28px]" style={{ color: 'var(--color-text-white)' }}>
                  {editingName ? (
                    <input
                      className="px-3 py-1.5 text-[17px] font-semibold focus:ring-2 outline-none min-w-0 flex-1 shadow-none transition-all duration-150 h-[28px] max-h-[28px]"
                      style={{ background: 'rgba(255,255,255,0.2)', color: 'var(--color-text-white)', borderColor: 'var(--color-primary)' }}
                      value={editedName || localName}
                      autoFocus
                      onChange={e => setEditedName(e.target.value)}
                      onFocus={e => { if (!editedName) setEditedName(localName); }}
                      onBlur={async () => {
                        setEditingName(false);
                        const newName = (editedName || localName).trim();
                        if (newName && newName !== localName) {
                          setSavingName(true);
                          setNameError(null);
                          try {
                            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
                            const url = `${baseUrl.replace(/\/$/, '')}/database/account/${account.account_id}/name`;
                            const res = await fetch(url, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ name: newName })
                            });
                            const data = await res.json();
                            if (data.success) {
                              setLocalName(newName);
                              setEditedName('');
                            } else {
                              setNameError(data.error || 'Failed to update name');
                              alert(data.error || 'Failed to update name');
                            }
                          } catch (err) {
                            setNameError(err.message);
                            alert('Failed to update name: ' + err.message);
                          } finally {
                            setSavingName(false);
                          }
                        } else {
                          setEditedName(localName);
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.target.blur();
                        } else if (e.key === 'Escape') {
                          setEditedName(localName);
                          setEditingName(false);
                        }
                      }}
                    />
                  ) : (
                    <span
                      className="overflow-hidden text-ellipsis whitespace-nowrap inline-block min-w-0 flex-1 cursor-pointer hover:underline"
                      onClick={() => setEditingName(true)}
                    >
                      {localName}
                    </span>
                  )}
                  {!editingName && (
                    <IconButton ariaLabel="Edit account name" onClick={() => setEditingName(true)}>
                      <MdEdit size={18} style={{ color: 'var(--color-text-white)', opacity: 0.85, flexShrink: 0 }} />
                    </IconButton>
                  )}
                </span>
                {account.subtype && (
                  <span className="text-[12px] font-medium rounded-full px-3 py-1 inline-block tracking-wide w-fit min-w-0 text-ellipsis overflow-hidden whitespace-nowrap mt-1" style={{ color: 'var(--color-text-white)', background: 'rgba(255,255,255,0.15)' }}>
                    {capitalizeWords(account.subtype)}
                  </span>
                )}
              </div>
              
              {/* Masked Number - Bottom Right */}
              {lastFour && (
                <span className="text-[13px] font-semibold rounded-full px-4 py-1 tracking-widest inline-block min-w-[36px] text-center font-mono shadow-sm overflow-hidden whitespace-nowrap flex-shrink-0" style={{ color: 'var(--color-text-white)', background: 'rgba(255,255,255,0.15)' }}>
                  {'●'.repeat(4)}{lastFour}
                </span>
              )}
            </div>
            </div>
          </div>

          {/* Limit/Available Balance Card (if exists) */}
          {(balances.limit != null || balances.available != null) && (
            <div className="w-full rounded-xl border px-3 sm:px-6 py-4 flex flex-col items-end box-border mb-6 text-[13px] font-medium gap-1" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-primary)', color: 'var(--color-text-primary)' }}>
              {balances.available != null && (
                <div className="flex w-full justify-between items-center mb-1">
                  <span className="flex items-center gap-2 opacity-85">
                    <FaWallet size={15} className="opacity-70 mr-1" style={{ color: 'var(--color-text-muted)' }} />
                    Available
                  </span>
                  <span className="font-bold" style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(balances.available)}</span>
                </div>
              )}
              {balances.limit != null && (
                <div className="flex w-full justify-between items-center mb-1">
                  <span className="flex items-center gap-2 opacity-85">
                    <FaCreditCard size={15} className="opacity-70 mr-1" style={{ color: 'var(--color-text-muted)' }} />
                    Limit
                  </span>
                  <span className="font-bold" style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(balances.limit)}</span>
                </div>
              )}
            </div>
          )}

          {/* Recent Transactions Widget - Card rows, mobile friendly */}
          <div className="w-full rounded-xl shadow-sm border p-0 mb-2 box-border overflow-hidden" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-primary)' }}>
            {/* Section label above the transaction list */}
            <div className="text-[14px] font-semibold py-4 ml-6 tracking-wide bg-none border-none w-auto inline-block" style={{ color: 'var(--color-text-primary)' }}>
              Recent Transactions
            </div>
            <div className="flex flex-col gap-0 w-full">
              {accountTransactions.length === 0 ? (
                <div className="text-center py-3 text-[13px]" style={{ color: 'var(--color-text-muted)' }}>No recent transactions</div>
              ) : accountTransactions.map((txn, i) => {
                const isPositive = txn.amount > 0;
                const amountColor = isPositive ? 'var(--color-success)' : 'var(--color-danger)';
                const amountPrefix = isPositive ? '+' : '';
                return (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between rounded-none shadow-sm mb-0 px-3 sm:px-6 py-4 min-h-[70px] box-border transition-colors duration-150 cursor-pointer gap-0"
                    style={{ background: 'var(--color-bg-secondary)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-bg-secondary)'}
                  >
                    {/* Icon/avatar */}
                    <div className="flex-shrink-0 mr-4 w-11 h-11 rounded-full flex items-center justify-center overflow-hidden" style={{ background: txn.icon_url ? 'transparent' : 'var(--color-gray-300)', border: txn.icon_url ? 'none' : '1px solid var(--color-border-primary)' }}>
                      {txn.icon_url ? (
                        <img src={txn.icon_url} alt="icon" className="w-full h-full rounded-full object-cover block" />
                      ) : (
                        <div className="w-5 h-5 rounded-full" style={{ background: 'var(--color-gray-400)' }} />
                      )}
                    </div>
                    {/* Main info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="text-[15px] font-semibold mb-0.5 truncate max-w-[220px]" style={{ color: 'var(--color-text-primary)' }}>{txn.description}</div>
                      <div className="flex items-center gap-2 flex-wrap min-h-[12px]">
                        <span className="text-[10px] font-normal" style={{ color: 'var(--color-text-muted)' }}>{formatDate(txn.date)}</span>
                        {txn.category_name && (
                          <span className="flex items-center gap-1 ml-2 max-w-[80px] overflow-hidden text-ellipsis whitespace-nowrap align-middle">
                            <span className="inline-block w-2 h-2 rounded-full" style={{ background: txn.category_color || 'var(--color-gray-500)' }} />
                            <span className="text-[9px] font-medium tracking-wide min-w-0 text-ellipsis overflow-hidden whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>{txn.category_name}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Amount */}
                    <div className="flex-shrink-0 text-right font-bold text-[12px] min-w-[70px] ml-3 whitespace-nowrap transition-colors duration-150 flex items-center justify-center" style={{ color: amountColor }}>
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