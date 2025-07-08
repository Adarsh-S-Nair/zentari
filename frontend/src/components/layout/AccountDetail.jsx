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

  // Use the app's blue color for toggles
  const appBlue = '#6366f1';

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
  let gradientClass = 'bg-gradient-to-tr from-blue-500 to-blue-300'; // default (investment/other)
  if (type === 'depository') gradientClass = 'bg-gradient-to-tr from-green-700 to-green-500';
  else if (type === 'credit') gradientClass = 'bg-gradient-to-tr from-red-700 to-red-500';
  else if (type === 'loan') gradientClass = 'bg-gradient-to-tr from-yellow-500 to-yellow-300';
  else if (type === 'investment') gradientClass = 'bg-gradient-to-tr from-blue-500 to-blue-300';

  return (
    <main className="w-full max-w-[700px] mx-auto px-4 box-border pb-0 mb-0">
      <div className="w-full m-0">
        <div className="flex flex-col items-center pt-5 pb-2">
          {/* Account Overview Card - Credit card style, blue gradient */}
          <div
            className={`w-full max-w-[700px] rounded-2xl ${gradientClass} text-white px-7 py-6 shadow-lg transition-transform duration-200 hover:scale-102 hover:shadow-xl relative overflow-hidden flex flex-col gap-4 mb-7`}
          >
            {/* Top Row: Logo + Masked Card Number and Auto-Sync */}
            <div className="flex items-center gap-4 min-w-0 flex-1 overflow-hidden">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-200">
                {account.institution_logo ? (
                  <img
                    src={account.institution_logo}
                    alt={account.institution_name || 'Bank'}
                    className="w-full h-full object-cover"
                  />
                ) : null}
              </div>
              {lastFour && (
                <span className="text-[13px] text-gray-100 font-semibold bg-white/15 rounded-full px-4 py-1 tracking-widest inline-block min-w-[36px] text-center font-mono shadow-sm overflow-hidden whitespace-nowrap">
                  {'●'.repeat(4)}{lastFour}
                </span>
              )}
              {/* Auto-Sync Toggle - Aligned right in row */}
              {'auto_sync' in account && (
                <div className="flex items-center gap-1 ml-auto">
                  <FaSyncAlt size={13} className="text-blue-100 opacity-80" />
                  <span className="text-[11px] text-blue-100 font-medium mr-1">Auto-Sync</span>
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
                    size="small"
                    color={appBlue}
                    disabled={autoSyncLoading}
                  />
                </div>
              )}
            </div>
            {/* Top Row: Account Name, Subtype, Balance, and Current Balance label */}
            <div className="flex items-stretch justify-between w-full mt-5 mb-0 gap-2">
              <div className="flex flex-col min-w-0 max-w-[calc(100%-120px)] h-full justify-between items-start">
                <span className="text-[17px] font-semibold -tracking-[0.5px] text-white flex items-center gap-2 min-w-0 overflow-hidden h-[28px] max-h-[28px]">
                  {editingName ? (
                    <input
                      className="bg-white/20 text-white px-3 py-1.5 text-[17px] font-semibold focus:ring-2 focus:ring-blue-300 outline-none min-w-0 flex-1 shadow-none transition-all duration-150 h-[28px] max-h-[28px]"
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
                      <MdEdit size={18} style={{ color: '#e0e7ff', opacity: 0.85, flexShrink: 0 }} />
                    </IconButton>
                  )}
                </span>
                {account.subtype && (
                  <span className="text-[12px] font-medium text-gray-100 bg-white/15 rounded-full px-3 py-1 inline-block tracking-wide w-fit min-w-0 text-ellipsis overflow-hidden whitespace-nowrap mt-1">
                    {capitalizeWords(account.subtype)}
                  </span>
                )}
              </div>
              <div className="flex flex-col items-end min-w-0 max-w-[120px] flex-shrink text-right h-full justify-between">
                <span className="text-[19px] font-bold text-white -tracking-[1px] text-ellipsis overflow-hidden whitespace-nowrap pr-0">
                  {balances.current != null ? formatCurrency(balances.current) : 'N/A'}
                </span>
                <span className="text-[12px] text-blue-100 font-medium mt-1">Current Balance</span>
              </div>
            </div>
          </div>

          {/* Limit/Available Balance Card (if exists) */}
          {(balances.limit != null || balances.available != null) && (
            <div className="w-full bg-gradient-to-tr from-gray-50 to-gray-100 rounded-xl border border-gray-200 px-3 sm:px-6 py-4 text-slate-800 flex flex-col items-end box-border mb-6 text-[13px] font-medium gap-1">
              {balances.available != null && (
                <div className="flex w-full justify-between items-center mb-1">
                  <span className="flex items-center gap-2 opacity-85">
                    <FaWallet size={15} className="opacity-70 mr-1 text-gray-700" />
                    Available
                  </span>
                  <span className="font-bold">{formatCurrency(balances.available)}</span>
                </div>
              )}
              {balances.limit != null && (
                <div className="flex w-full justify-between items-center mb-1">
                  <span className="flex items-center gap-2 opacity-85">
                    <FaCreditCard size={15} className="opacity-70 mr-1 text-gray-700" />
                    Limit
                  </span>
                  <span className="font-bold">{formatCurrency(balances.limit)}</span>
                </div>
              )}
              {/* Last Sync Row */}
              <div className="flex w-full justify-between items-center mb-1">
                <span className="flex items-center gap-2 opacity-85">
                  {account.update_success ? (
                    <FaCircleCheck size={15} className="text-green-700 mr-1" />
                  ) : (
                    <FaCircleXmark size={15} className="text-red-700 mr-1" />
                  )}
                  Last Sync
                </span>
                <span className="font-medium text-[12px] text-slate-400">
                  {plaidItem && plaidItem.last_transaction_sync ? formatLastUpdated(plaidItem.last_transaction_sync) : 'Never synced'}
                </span>
              </div>
            </div>
          )}

          {/* Recent Transactions Widget - Card rows, mobile friendly */}
          <div className="w-full bg-gradient-to-tr from-gray-50 to-gray-100 rounded-xl shadow-sm border border-gray-200 p-0 mb-2 box-border overflow-hidden">
            {/* Section label above the transaction list */}
            <div className="text-[14px] font-semibold text-gray-800 py-4 ml-6 tracking-wide bg-none border-none w-auto inline-block">
              Recent Transactions
            </div>
            <div className="flex flex-col gap-0 w-full">
              {accountTransactions.length === 0 ? (
                <div className="text-center text-gray-400 py-3 text-[13px]">No recent transactions</div>
              ) : accountTransactions.map((txn, i) => {
                const isPositive = txn.amount > 0;
                const amountColor = isPositive ? 'text-green-600' : 'text-red-600';
                const amountPrefix = isPositive ? '+' : '';
                return (
                  <div
                    key={txn.id}
                    className={
                      `flex items-center justify-between bg-white rounded-none shadow-sm mb-0 px-3 sm:px-6 py-4 min-h-[70px] box-border transition-colors duration-150 cursor-pointer gap-0 hover:bg-indigo-50`
                    }
                  >
                    {/* Icon/avatar */}
                    <div className={
                      `flex-shrink-0 mr-4 w-11 h-11 rounded-full flex items-center justify-center overflow-hidden ${txn.icon_url ? 'bg-transparent border-none' : 'bg-gray-300 border border-gray-300'}`
                    }>
                      {txn.icon_url ? (
                        <img src={txn.icon_url} alt="icon" className="w-full h-full rounded-full object-cover block" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-gray-600" />
                      )}
                    </div>
                    {/* Main info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="text-[15px] font-semibold text-gray-900 mb-0.5 truncate max-w-[220px]">{txn.description}</div>
                      <div className="flex items-center gap-2 flex-wrap min-h-[12px]">
                        <span className="text-[10px] text-slate-500 font-normal">{formatDate(txn.date)}</span>
                        {txn.category_name && (
                          <span className="flex items-center gap-1 ml-2 max-w-[80px] overflow-hidden text-ellipsis whitespace-nowrap align-middle">
                            <span className="inline-block w-2 h-2 rounded-full" style={{ background: txn.category_color || '#334155' }} />
                            <span className="text-[9px] font-medium text-slate-700 tracking-wide min-w-0 text-ellipsis overflow-hidden whitespace-nowrap">{txn.category_name}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Amount */}
                    <div className={`flex-shrink-0 text-right font-bold text-[12px] min-w-[70px] ml-3 whitespace-nowrap transition-colors duration-150 flex items-center justify-center ${amountColor.replace('600', '700')}`}>
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