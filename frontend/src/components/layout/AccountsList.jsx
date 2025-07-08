import React, { useState, useRef, useEffect } from 'react';
import { FaUniversity, FaTrash } from 'react-icons/fa';
import { FaCircleCheck, FaCircleXmark } from 'react-icons/fa6';
import { HiOutlineDotsVertical } from 'react-icons/hi';
import { MdEdit } from 'react-icons/md';
import { Card } from '../ui';
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full mx-auto">
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
              className="rounded-2xl bg-gradient-to-tr from-gray-50 to-gray-100 text-gray-900 shadow-lg border border-gray-200 px-6 py-5 min-h-[140px] flex flex-col justify-between relative overflow-hidden transition-transform duration-200 hover:scale-102 hover:shadow-xl cursor-pointer group"
              onClick={() => navigate(`/accounts/${acc.id}`)}
              tabIndex={0}
              role="button"
              aria-label={`View account ${acc.name}`}
            >
              {/* Top: Logo/Bank + Mask */}
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-200">
                  {acc.institution_logo ? (
                    <img
                      src={acc.institution_logo}
                      alt={acc.institution_name || 'Bank'}
                      className="w-full h-full object-cover"
                      onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                    />
                  ) : null}
                  <div className={`${acc.institution_logo ? 'hidden' : 'flex'} items-center justify-center w-full h-full text-gray-400 opacity-70`}>
                    <FaUniversity size={16} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {acc.mask && (
                    <span className="text-[12px] text-slate-500 font-semibold bg-slate-400/10 rounded-full px-3 py-1 tracking-widest inline-block min-w-[36px] text-center font-mono">
                      {'●'.repeat(4)}{acc.mask}
                    </span>
                  )}
                </div>
              </div>
              {/* Middle: Name + Type */}
              <div className="mb-2">
                <div className="text-[16px] font-semibold -tracking-[0.5px] mb-0.5 truncate text-gray-900">
                  {acc.name}
                </div>
                <div className="text-[11px] opacity-85 font-normal capitalize text-slate-500">
                  {capitalizeWords(acc.subtype)}
                </div>
              </div>
              {/* Bottom: Balance and Last Sync */}
              <div className="mt-auto flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <div className="text-[13px] font-medium opacity-90">Balance</div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
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
                <div className="text-[17px] font-semibold -tracking-[0.5px] text-gray-800">
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
