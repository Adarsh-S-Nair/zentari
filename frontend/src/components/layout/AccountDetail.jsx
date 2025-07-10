import React, { useContext, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MdEdit } from 'react-icons/md';
import IconButton from '../ui/IconButton';
import { FinancialContext } from '../../contexts/FinancialContext';
import { formatCurrency, capitalizeWords, formatDate } from '../../utils/formatters';
import Spinner from '../ui/Spinner';
import BalanceTabs from '../ui/BalanceTabs';
import { getApiBaseUrl } from '../../utils/api';

const AccountDetail = ({ maxWidth = 700, account: propAccount }) => {
  const { accountId } = useParams();
  const navigate = useNavigate();
  const { accounts, transactions = [], loading, plaidItems, refreshAccounts } = useContext(FinancialContext) || {};
  const account = propAccount || accounts?.find(acc => String(acc.id) === String(accountId));

  const [editingName, setEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [localName, setLocalName] = useState(account?.name || '');
  const submitRef = useRef(false);

  const plaidItem = account?.item_id ? plaidItems?.[account.item_id] : null;

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
  const accountTransactions = transactions.filter(
    t => t.accounts?.account_id === account.account_id
  ).slice(0, 8);

  const type = (account?.type || '').toLowerCase();
  let gradientStyle = { background: 'var(--color-gradient-primary)' };
  if (type === 'depository') gradientStyle = { background: 'var(--color-gradient-success)' };
  else if (type === 'credit') gradientStyle = { background: 'linear-gradient(135deg, var(--color-danger) 0%, var(--color-danger-light) 100%)' };
  else if (type === 'loan') gradientStyle = { background: 'linear-gradient(135deg, var(--color-warning) 0%, var(--color-warning-light) 100%)' };

  function handleNameEditStart() {
    setEditedName(localName);
    setEditingName(true);
  }

  function handleNameSubmit() {
    if (submitRef.current) return;
    submitRef.current = true;
    setEditingName(false);
    const newName = (editedName || '').trim();
    if (newName && newName !== localName) {
      setSavingName(true);
      const fullUrl = `${getApiBaseUrl()}/database/account/${account.account_id}/name`;
      fetch(fullUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          return res.json();
        })
        .then(data => {
          if (data.success) {
            setLocalName(newName);
            if (typeof refreshAccounts === 'function') refreshAccounts();
          }
        })
        .catch(err => {
          console.error('Failed to update account name:', err);
        })
        .finally(() => {
          setSavingName(false);
          setEditedName('');
          submitRef.current = false;
        });
    } else {
      setEditedName('');
      submitRef.current = false;
    }
  }

  function handleNameCancel() {
    setEditingName(false);
    setEditedName('');
  }

  return (
    <main className="w-full max-w-[700px] mx-auto px-4 sm:px-6 box-border pb-0 mb-0 overflow-hidden">
      <div className="w-full m-0">
        <div className="flex flex-col items-center pt-5 pb-2">
          <div className="w-full flex flex-wrap gap-4 mb-7">
            <div
              className="w-full min-w-0 rounded-2xl text-white px-4 py-7 sm:px-7 shadow-lg transition-transform duration-200 hover:scale-[1.02] hover:shadow-xl relative overflow-hidden flex flex-col gap-4 overflow-x-hidden"
              style={gradientStyle}
            >
              <div className="absolute -bottom-16 -left-16 w-48 h-52 rounded-full opacity-20 pointer-events-none" style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '45% 55% 52% 48% / 48% 52% 48% 52%' }} />
              <div className="absolute -top-12 -right-12 w-56 h-48 rounded-full opacity-15 pointer-events-none" style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '52% 48% 48% 52% / 52% 48% 52% 48%' }} />
              <div className="absolute -bottom-34 -right-20 w-60 h-56 rounded-full opacity-15 pointer-events-none" style={{ background: 'rgba(0,0,0,0.22)', borderRadius: '60% 40% 55% 45% / 50% 60% 40% 50%' }} />

              <div className="flex justify-between w-full items-start">
                <div className="flex-1 max-w-full overflow-hidden">
                  <BalanceTabs balances={balances} />
                </div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ml-4 mt-[2px]" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  {account.institution_logo && (
                    <img
                      src={account.institution_logo}
                      alt={account.institution_name || 'Bank'}
                      className="w-full h-full object-cover"
                      style={{ filter: 'grayscale(1) brightness(2.2) contrast(0.7) opacity(0.5)' }}
                    />
                  )}
                </div>
              </div>

              <div className="flex items-end justify-between w-full mt-auto flex-wrap gap-y-3">
                <div className="flex flex-col min-w-0 flex-1 mr-4">
                  <div className="flex items-center min-w-0 h-[28px] max-h-[28px]" style={{ color: 'var(--color-text-white)' }}>
                    {editingName ? (
                      <input
                        className="px-3 py-1.5 text-[17px] font-semibold focus:ring-2 outline-none min-w-0 flex-1 shadow-none transition-all duration-150 h-[28px] max-h-[28px]"
                        style={{ background: 'rgba(255,255,255,0.2)', color: 'var(--color-text-white)', borderColor: 'var(--color-primary)' }}
                        value={editedName}
                        autoFocus
                        onChange={e => setEditedName(e.target.value)}
                        onBlur={handleNameSubmit}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleNameSubmit();
                          } else if (e.key === 'Escape') {
                            handleNameCancel();
                          }
                        }}
                      />
                    ) : (
                      <div
                        className="flex items-center min-w-0 cursor-pointer group"
                        onClick={handleNameEditStart}
                      >
                        <span className="text-[17px] font-semibold -tracking-[0.5px] overflow-hidden text-ellipsis whitespace-nowrap flex-shrink-0 group-hover:underline">
                          {localName}
                        </span>
                        <IconButton className="ml-2 flex-shrink-0">
                          <MdEdit size={18} style={{ color: 'var(--color-text-white)', opacity: 0.85 }} />
                        </IconButton>
                      </div>
                    )}
                  </div>
                  {account.subtype && (
                    <span className="text-[12px] font-medium rounded-full px-3 py-1 inline-block tracking-wide w-fit mt-1" style={{ color: 'var(--color-text-white)', background: 'rgba(255,255,255,0.15)' }}>
                      {capitalizeWords(account.subtype)}
                    </span>
                  )}
                </div>
                {lastFour && (
                  <span className="text-[13px] font-semibold rounded-full px-4 py-1 tracking-widest inline-block min-w-[36px] text-center font-mono shadow-sm" style={{ color: 'var(--color-text-white)', background: 'rgba(255,255,255,0.15)' }}>
                    {'●'.repeat(4)}{lastFour}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="w-full mb-2">
            <div className="text-[16px] pt-4 tracking-wide" style={{ color: 'var(--color-text-primary)' }}>
              Recent Transactions
            </div>
            <div className="flex flex-col gap-0 w-full">
              {accountTransactions.length === 0 ? (
                <div className="text-center py-3 text-[13px]" style={{ color: 'var(--color-text-muted)' }}>No recent transactions</div>
              ) : accountTransactions.map(txn => {
                const isPositive = txn.amount > 0;
                const amountPrefix = isPositive ? '+' : '';
                return (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between px-4 py-6 min-h-[80px] transition-colors cursor-pointer border-b"
                    style={{ borderColor: 'var(--color-border-primary)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div className="flex-shrink-0 mr-4 w-11 h-11 rounded-full flex items-center justify-center overflow-hidden" style={{ background: txn.icon_url ? 'transparent' : 'var(--color-gray-300)' }}>
                      {txn.icon_url ? (
                        <img src={txn.icon_url} alt="icon" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[15px] -tracking-[0.5px] truncate max-w-[120px] sm:max-w-[220px]" style={{ color: 'var(--color-text-primary)' }}>
                        {txn.description}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] -tracking-[0.3px]" style={{ color: 'var(--color-text-secondary)' }}>{formatDate(txn.date)}</span>
                        {txn.category_name && (
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full" style={{ background: txn.category_color || 'var(--color-gray-500)' }} />
                            <span className="text-[9px] font-medium -tracking-[0.2px]" style={{ color: 'var(--color-text-secondary)' }}>{txn.category_name}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 min-w-[80px] text-right">
                      <span className="text-[14px] font-semibold -tracking-[0.2px]" style={{ 
                        color: isPositive ? 'var(--color-success)' : 'var(--color-text-secondary)'
                      }}>
                        {amountPrefix}{formatCurrency(Math.abs(txn.amount))}
                      </span>
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
