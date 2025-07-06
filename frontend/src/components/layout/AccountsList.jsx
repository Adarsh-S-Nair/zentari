import React, { useState, useRef, useEffect } from 'react';
import { FaUniversity, FaTrash } from 'react-icons/fa';
import { FaCircleCheck, FaCircleXmark } from 'react-icons/fa6';
import { HiOutlineDotsVertical } from 'react-icons/hi';
import { MdEdit } from 'react-icons/md';
import { Card } from '../ui';
import ContextMenu from '../ui/ContextMenu';
import { formatCurrency, formatLastUpdated } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';

const AccountsList = ({ accounts, activeTab, getAccountTypeIcon, getTotal }) => {
  const [menuOpenId, setMenuOpenId] = useState(null);
  const menuRef = useRef(null);
  const triggerRefs = useRef({});
  const navigate = useNavigate();

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
    <div style={{ width: '100%', padding: '0 0 8px 0' }}>
      {/* Card grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '20px',
        width: '100%',
        margin: '0 auto',
      }}>
        {sortedAccounts.map((acc) => {
          const balance = acc.balances?.current || 0;
          const isZero = balance === 0;
          if (!triggerRefs.current[acc.account_id]) {
            triggerRefs.current[acc.account_id] = React.createRef();
          }
          // Use a subtle neutral gradient for the card background
          const cardBg = 'linear-gradient(120deg, #f7f8fa 0%, #f3f4f6 100%)';
          return (
            <div
              key={acc.account_id}
              style={{
                borderRadius: 16,
                background: cardBg,
                color: '#222',
                boxShadow: '0 1px 2px 0 rgba(59,130,246,0.03)',
                border: '1.5px solid #e5e7eb',
                padding: '20px 22px',
                minHeight: 140,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
                transition: 'transform 0.16s cubic-bezier(.4,1.5,.5,1), box-shadow 0.18s',
                cursor: 'pointer',
              }}
              onClick={() => navigate(`/accounts/${acc.id}`)}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'scale(1.012)';
                e.currentTarget.style.boxShadow = '0 3px 12px 0 rgba(59,130,246,0.07)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(59,130,246,0.03)';
              }}
              tabIndex={0}
              role="button"
              aria-label={`View account ${acc.name}`}
            >
              {/* Top: Logo/Bank + Mask */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                  border: '1.5px solid #e5e7eb'
                }}>
                  {acc.institution_logo ? (
                    <img
                      src={acc.institution_logo}
                      alt={acc.institution_name || 'Bank'}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                    />
                  ) : null}
                  <div style={{
                    display: acc.institution_logo ? 'none' : 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                    color: '#6b7280',
                    opacity: 0.7
                  }}>
                    <FaUniversity size={16} />
                  </div>
                </div>
                <div style={{ fontSize: 15, opacity: 0.85, fontWeight: 400, letterSpacing: 2, fontFamily: 'monospace', verticalAlign: 'middle', display: 'flex', alignItems: 'center' }}>
                   {acc.mask ? `${'●'.repeat(4)}${acc.mask}` : ''}
                </div>
              </div>
              {/* Middle: Name + Type */}
              <div style={{ marginBottom: 8 }}>
                <div style={{
                  fontSize: 16,
                  fontWeight: 600,
                  letterSpacing: -0.5,
                  marginBottom: 2,
                  textShadow: 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>{acc.name}</div>
                <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 400, textTransform: 'capitalize' }}>
                  {capitalizeWords(acc.subtype)}
                </div>
              </div>
              {/* Bottom: Balance and Last Updated */}
              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, opacity: 0.92 }}>Balance</div>
                  <div style={{ fontSize: 10, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {acc.updated_at && (
                      <>
                        Last updated: {formatLastUpdated(acc.updated_at)}
                        {acc.update_success ? (
                          <FaCircleCheck size={10} style={{ color: 'var(--color-success)' }} />
                        ) : (
                          <FaCircleXmark size={10} style={{ color: 'var(--color-danger)' }} />
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 17, fontWeight: 500, letterSpacing: -0.5, color: '#444', textShadow: 'none' }}>
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
