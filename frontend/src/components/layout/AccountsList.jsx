import React, { useState, useRef, useEffect } from 'react';
import { FaUniversity, FaTrash } from 'react-icons/fa';
import { FaCircleCheck, FaCircleXmark } from 'react-icons/fa6';
import { HiOutlineDotsVertical } from 'react-icons/hi';
import { MdEdit } from 'react-icons/md';
import { Card, RightDrawer } from '../ui';
import ContextMenu from '../ui/ContextMenu';
import { formatCurrency, formatLastUpdated } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';
import { useFinancial } from '../../contexts/FinancialContext';

const AccountsList = ({ accounts, activeTab, getAccountTypeIcon, getTotal }) => {
  const [menuOpenId, setMenuOpenId] = useState(null);
  const menuRef = useRef(null);
  const triggerRefs = useRef({});
  const navigate = useNavigate();
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

  const sortedAccounts = [...accounts].sort((a, b) => {
    const aDate = new Date(a.created_at || 0);
    const bDate = new Date(b.created_at || 0);
    return aDate - bDate;
  });

  return (
    <div className="w-full pb-2">
      {/* Card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-5 w-full mx-auto">
        {sortedAccounts.map((acc) => {
          const balance = acc.balances?.current || 0;
          const isZero = balance === 0;
          const lastSync = acc.item_id && plaidItems[acc.item_id]?.last_transaction_sync;
          if (!triggerRefs.current[acc.account_id]) {
            triggerRefs.current[acc.account_id] = React.createRef();
          }
          return (
            <div
              key={acc.account_id}
              className="rounded-2xl shadow-lg border px-6 py-5 min-h-[140px] flex flex-col justify-between relative overflow-hidden transition-transform duration-200 hover:scale-102 hover:shadow-xl cursor-pointer group"
              style={{ color: 'var(--color-text-primary)', borderColor: 'var(--color-border-primary)', background: 'var(--color-bg-secondary)' }}
              onClick={() => navigate(`/accounts/${acc.id}`)}
            >
              {/* Top: Logo/Bank + Mask */}
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 border" style={{ background: 'var(--color-bg-primary)', borderColor: 'var(--color-border-primary)' }}>
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
                <div className="flex items-center gap-2">
                  {acc.mask && (
                    <span className="text-[12px] font-semibold rounded-full px-3 py-1 tracking-widest inline-block min-w-[36px] text-center font-mono" style={{ color: 'var(--color-text-secondary)', background: 'var(--color-bg-primary)' }}>
                      {'●'.repeat(4)}{acc.mask}
                    </span>
                  )}
                </div>
              </div>
              {/* Middle: Name + Type */}
              <div className="mb-2">
                <div className="text-[16px] font-semibold -tracking-[0.5px] mb-0.5 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                  {acc.name}
                </div>
                <div className="text-[11px] opacity-85 font-normal capitalize" style={{ color: 'var(--color-text-muted)' }}>
                  {capitalizeWords(acc.subtype)}
                </div>
              </div>
              {/* Bottom: Balance and Last Sync */}
              <div className="mt-auto flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <div className="text-[13px] font-medium opacity-90" style={{ color: 'var(--color-text-secondary)' }}>Balance</div>
                  <div className="text-[10px] flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
                    <>
                      Last sync: {lastSync ? formatLastUpdated(lastSync) : 'Never synced'}
                      {acc.update_success ? (
                        <FaCircleCheck size={10} className="text-green-500 ml-1" />
                      ) : (
                        <FaCircleXmark size={10} className="text-red-500 ml-1" />
                      )}
                    </>
                  </div>
                </div>
                <div className="text-[17px] font-semibold -tracking-[0.5px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {formatCurrency(balance)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      

    </div>
  );
};

export default AccountsList;
