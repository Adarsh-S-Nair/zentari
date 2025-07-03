import React, { useState, useRef, useEffect } from 'react';
import { FaUniversity, FaTrash } from 'react-icons/fa';
import { FaCircleCheck, FaCircleXmark } from 'react-icons/fa6';
import { HiOutlineDotsVertical } from 'react-icons/hi';
import { MdEdit } from 'react-icons/md';
import { Card } from '../ui';
import ContextMenu from '../ui/ContextMenu';
import { formatCurrency, formatLastUpdated } from '../../utils/formatters';

const AccountsList = ({ accounts, activeTab, getAccountTypeIcon, getTotal }) => {
  const [menuOpenId, setMenuOpenId] = useState(null);
  const menuRef = useRef(null);
  const triggerRefs = useRef({});

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
    <Card className="p-0 w-full overflow-hidden">
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 20px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        flexWrap: 'wrap',
        gap: 8
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {(() => {
            const { icon: IconComponent, color: iconColor } = getAccountTypeIcon(activeTab);
            return (
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: iconColor + '15',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: iconColor
              }}>
                <IconComponent size={18} />
              </div>
            );
          })()}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h2>
            <span style={{
              fontSize: '12px',
              color: '#6b7280',
              marginTop: '2px'
            }}>{accounts.length} accounts</span>
          </div>
        </div>
        <div style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#111827',
          marginRight: '24px'
        }}>
          {formatCurrency(getTotal(accounts))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '12px 20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sortedAccounts.map((acc) => {
            const balance = acc.balances?.current || 0;
            const isZero = balance === 0;
            if (!triggerRefs.current[acc.account_id]) {
              triggerRefs.current[acc.account_id] = React.createRef();
            }

            return (
              <div
                key={acc.account_id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  padding: '6px 0',
                  borderBottom: '1px solid #f3f4f6',
                  gap: 12,
                  position: 'relative',
                }}
              >
                {/* Left side */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  minWidth: 0,
                  flex: 1
                }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}>
                    {acc.institution_logo ? (
                      <img
                        src={acc.institution_logo}
                        alt={acc.institution_name || 'Bank'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div style={{
                      display: acc.institution_logo ? 'none' : 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      height: '100%',
                      color: '#6b7280'
                    }}>
                      <FaUniversity size={12} />
                    </div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#111827',
                      marginBottom: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {acc.name}
                    </div>
                    <div style={{
                      fontSize: 10,
                      color: '#6b7280',
                      whiteSpace: 'nowrap'
                    }}>
                      {capitalizeWords(acc.subtype)} {acc.mask ? `• ****${acc.mask}` : ''}
                    </div>
                    {/* Mobile view last updated */}
                    <div className="mobile-last-updated" style={{
                      fontSize: 9,
                      color: '#9ca3af',
                      display: 'none',
                      alignItems: 'center',
                      gap: 4,
                      marginTop: 2
                    }}>
                      {acc.updated_at && (
                        <>
                          Last updated: {formatLastUpdated(acc.updated_at)}
                          {acc.update_success ? (
                            <FaCircleCheck size={9} style={{ color: 'var(--color-success)' }} />
                          ) : (
                            <FaCircleXmark size={9} style={{ color: 'var(--color-danger)' }} />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right side - balance and menu */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexShrink: 0
                }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    minWidth: 80
                  }}>
                    <div style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: isZero ? '#6b7280' : '#1f2937',
                      textAlign: 'right'
                    }}>
                      {formatCurrency(balance)}
                    </div>
                    {/* Desktop view last updated */}
                    {acc.updated_at && (
                      <div className="desktop-last-updated" style={{
                        fontSize: 9,
                        color: '#9ca3af',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        Last updated: {formatLastUpdated(acc.updated_at)}
                        {acc.update_success ? (
                          <FaCircleCheck size={9} style={{ color: 'var(--color-success)' }} />
                        ) : (
                          <FaCircleXmark size={9} style={{ color: 'var(--color-danger)' }} />
                        )}
                      </div>
                    )}
                  </div>

                  <div ref={menuRef}>
                    <div
                      ref={triggerRefs.current[acc.account_id]}
                      role="button"
                      onClick={() =>
                        setMenuOpenId(menuOpenId === acc.account_id ? null : acc.account_id)
                      }
                      style={{
                        width: 24,
                        height: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        borderRadius: 4,
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f3f4f6';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <HiOutlineDotsVertical size={14} color="#6b7280" />
                    </div>

                    <ContextMenu
                      isOpen={menuOpenId === acc.account_id}
                      onClose={() => setMenuOpenId(null)}
                      triggerRef={triggerRefs.current[acc.account_id]}
                      offset={{ x: -175, y: 30 }}
                      items={[
                        {
                          label: 'Edit',
                          icon: <MdEdit size={14} />,
                          onClick: () => {}
                        },
                        {
                          label: 'Delete',
                          icon: <FaTrash size={13} />,
                          onClick: () => {}
                        }
                      ]}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile/Desktop "Last updated" visibility toggle */}
      <style>
        {`
          @media (max-width: 640px) {
            .desktop-last-updated {
              display: none !important;
            }
            .mobile-last-updated {
              display: flex !important;
            }
          }
        `}
      </style>
    </Card>
  );
};

export default AccountsList;
