import React, { useState, useRef, useEffect } from 'react';
import { FaUniversity, FaTrash } from 'react-icons/fa';
import { FaCircleCheck, FaCircleXmark } from 'react-icons/fa6';
import { HiOutlineDotsVertical } from 'react-icons/hi';
import { MdEdit } from 'react-icons/md';
import { IoMdCash } from 'react-icons/io';
import { Card, RightDrawer } from '../ui';
import ContextMenu from '../ui/ContextMenu';
import { formatCurrency, formatLastUpdated } from '../../utils/formatters';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFinancial } from '../../contexts/FinancialContext';
import { getDisplayBalance, getAccountTypeIcon, getTotal } from './accountsUtils';

const AccountsList = ({ grouped }) => {
  const [menuOpenId, setMenuOpenId] = useState(null);
  const menuRef = useRef(null);
  const triggerRefs = useRef({});
  const navigate = useNavigate();
  const location = useLocation();
  const { plaidItems } = useFinancial();

  const capitalizeWords = (str) =>
    str
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpenId(null);
      }
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') setMenuOpenId(null);
    };

    if (menuOpenId) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [menuOpenId]);

  const accountTypes = [
    { key: 'cash', label: 'Cash', icon: IoMdCash, gradient: 'linear-gradient(135deg, rgba(107, 114, 128, 0.1) 0%, rgba(75, 85, 99, 0.1) 100%)' },
    { key: 'credit', label: 'Credit', icon: 'credit', gradient: 'linear-gradient(135deg, rgba(107, 114, 128, 0.1) 0%, rgba(75, 85, 99, 0.1) 100%)' },
    { key: 'investment', label: 'Investments', icon: 'investment', gradient: 'linear-gradient(135deg, rgba(107, 114, 128, 0.1) 0%, rgba(75, 85, 99, 0.1) 100%)' },
    { key: 'loan', label: 'Loans', icon: 'loan', gradient: 'linear-gradient(135deg, rgba(107, 114, 128, 0.1) 0%, rgba(75, 85, 99, 0.1) 100%)' },
  ];

  return (
    <div className="w-full pb-2">
      {accountTypes.map((type) => {
        const accounts = grouped[type.key] || [];
        if (accounts.length === 0) return null;

        const total = getTotal(accounts);
        const typeIcon = type.icon === IoMdCash ? { icon: IoMdCash, color: '#16a34a' } : getAccountTypeIcon(type.icon);

        return (
          <div key={type.key} className="mb-4">
            {/* Account Type Card */}
            <div 
              className="rounded-xl shadow-lg border overflow-hidden"
              style={{ 
                background: 'var(--color-bg-secondary)', 
                borderColor: 'var(--color-border-primary)',
                boxShadow: '0 4px 6px -1px var(--color-shadow-light)'
              }}
            >
              {/* Card Header with Gradient */}
              <div 
                className="px-4 py-3 border-b"
                style={{ 
                  borderColor: 'var(--color-border-primary)', 
                  background: type.gradient
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <typeIcon.icon size={16} style={{ color: typeIcon.color }} />
                    <span className="text-[14px]" style={{ color: 'var(--color-text-primary)' }}>
                      {type.label}
                    </span>
                    <span className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                      ({accounts.length})
                    </span>
                  </div>
                  <span className="text-[14px]" style={{ color: 'var(--color-text-primary)' }}>
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              {/* Accounts List */}
              <div className="px-2">
                {accounts.map((acc, index) => {
                  const balance = getDisplayBalance(acc);
                  const isZero = balance === 0;
                  const lastSync = acc.item_id && plaidItems[acc.item_id]?.last_transaction_sync;
                  const isLast = index === accounts.length - 1;

                  return (
                    <div
                      key={acc.account_id}
                      className={`flex items-center py-4 min-h-[70px] box-border transition-all duration-200 cursor-pointer w-full max-w-full overflow-x-hidden transform hover:scale-[1.01] hover:shadow-md ${
                        !isLast ? 'border-b' : ''
                      }`}
                      style={{ 
                        background: 'var(--color-bg-secondary)', 
                        borderColor: 'var(--color-border-primary)',
                        borderRadius: '8px',
                        margin: '4px 0'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--color-bg-hover)';
                        e.currentTarget.style.transform = 'translateY(-1px) scale(1.01)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--color-bg-secondary)';
                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                      }}
                      onClick={() => {
                        navigate(`/accounts/${acc.id}`);
                      }}
                    >
                      {/* Institution Logo */}
                      <div className="flex-shrink-0 mr-2 sm:mr-4 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center overflow-hidden self-center transition-all duration-200 transform hover:scale-110" style={{ 
                        background: acc.institution_logo ? 'transparent' : 'var(--color-bg-primary)', 
                        border: '1px solid var(--color-border-primary)',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                        filter: 'drop-shadow(0 1px 3px rgba(0, 0, 0, 0.1))'
                      }}>
                        {acc.institution_logo ? (
                          <img
                            src={acc.institution_logo}
                            alt={acc.institution_name || 'Bank'}
                            className="w-full h-full object-cover"
                            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                          />
                        ) : null}
                        <div className={`${acc.institution_logo ? 'hidden' : 'flex'} items-center justify-center w-full h-full opacity-70`} style={{ color: 'var(--color-text-muted)' }}>
                          <FaUniversity size={16} />
                        </div>
                      </div>

                      {/* Account Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center px-2">
                        <div className="text-[14px] sm:text-[16px] truncate max-w-[180px] sm:max-w-none" style={{ color: 'var(--color-text-primary)' }}>
                          {acc.name}
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 mt-1">
                          {acc.mask && (
                            <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                              ••••{acc.mask}
                            </span>
                          )}
                          <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                            {capitalizeWords(acc.subtype)}
                          </span>
                          {lastSync && (
                            <span className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
                              • {formatLastUpdated(lastSync)}
                            </span>
                          )}
                          {acc.update_success ? (
                            <FaCircleCheck size={8} className="text-green-500 ml-1" />
                          ) : (
                            <FaCircleXmark size={8} className="text-red-500 ml-1" />
                          )}
                        </div>
                      </div>

                      {/* Balance */}
                      <div className="flex-shrink-0 text-right text-[12px] sm:text-[14px] min-w-[60px] sm:min-w-[80px] ml-2 sm:ml-3 whitespace-nowrap transition-colors duration-150 flex items-center justify-center self-center" style={{ color: 'var(--color-text-primary)' }}>
                        {formatCurrency(balance)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AccountsList;
