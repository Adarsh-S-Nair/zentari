import React, { useState, useRef, useEffect } from 'react';
import { FiLogOut, FiBell, FiHelpCircle, FiChevronLeft } from 'react-icons/fi';
import { MdLogin } from "react-icons/md";
import { FaUser } from 'react-icons/fa';
import { supabase } from '../../supabaseClient';
import { LogoutModal } from '../modals';
import ContextMenu from '../ui/ContextMenu';

const Topbar = ({ user, onLoginClick, currentPage, showBackArrow = false, onBack, institutionLogo }) => {
  const [userName, setUserName] = useState('');
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const triggerRef = useRef(null);

  // Fetch user's name from user metadata
  useEffect(() => {
    if (user) {
      const userName = user.user_metadata?.display_name || user.email || 'User'
      setUserName(userName);
    } else {
      setUserName('');
    }
  }, [user]);

  useEffect(() => {
    console.log('[Topbar] user:', user);
  }, [user]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setLogoutOpen(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const userMenuItems = [
    {
      label: userName || user?.email || 'User',
      icon: <FaUser size={13} />,
      disabled: true
    },
    {
      label: 'Sign Out',
      icon: <FiLogOut size={14} style={{ marginTop: 1 }} />,
      onClick: () => setLogoutOpen(true)
    }
  ];

  return (
    <>
      <div style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        background: '#fff',
        // borderRadius removed for flat look
        boxShadow: '0 2px 8px 0 rgba(59,130,246,0.04)',
        border: '1.5px solid #f3f4f6',
        boxSizing: 'border-box',
      }}>
        <div style={{
          width: '100%',
          maxWidth: 700,
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxSizing: 'border-box',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {showBackArrow && (
              <button
                onClick={onBack}
                style={{
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#2563eb',
                  fontSize: 22,
                  padding: 0,
                  height: 36,
                  width: 36,
                  borderRadius: 10,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
                aria-label="Back"
              >
                <FiChevronLeft size={22} />
              </button>
            )}
            {institutionLogo && (
              <img src={institutionLogo} alt="Institution Logo" style={{ height: 24, width: 24, objectFit: 'contain', marginRight: 8, borderRadius: 6, background: '#f3f4f6' }} />
            )}
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1f2937' }}>{currentPage || 'Zentari'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {user && (
              <>
                <IconButton icon={<FiBell size={16} color="#374151" />} />
                <IconButton icon={<FiHelpCircle size={16} color="#374151" />} />
              </>
            )}

            {user ? (
              <div style={{ position: 'relative' }}>
                <div
                  ref={triggerRef}
                  role="button"
                  onClick={() => setShowMenu(prev => !prev)}
                  style={{
                    ...iconButtonStyle,
                    backgroundColor: showMenu ? '#3b82f6' : '#f3f4f6',
                    color: showMenu ? '#fff' : '#374151',
                    border: showMenu ? '1.5px solid #3b82f6' : '1.5px solid #f3f4f6',
                    transition: 'background 0.18s, color 0.18s, border 0.18s, transform 0.16s cubic-bezier(.4,1.5,.5,1)',
                  }}
                  onMouseEnter={e => { if (!showMenu) e.currentTarget.style.backgroundColor = '#e5e7eb'; }}
                  onMouseLeave={e => { if (!showMenu) e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
                  onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97) translateY(1.5px)'; }}
                  onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <FaUser size={16} color={showMenu ? '#fff' : '#374151'} />
                </div>

                <ContextMenu
                  isOpen={showMenu}
                  onClose={() => setShowMenu(false)}
                  triggerRef={triggerRef}
                  offset={{ x: -175, y: 35 }}
                  items={userMenuItems}
                />
              </div>
            ) : (
              <div
                role="button"
                onClick={() => {
                  console.log('[Topbar] Log in / Sign up button clicked');
                  if (onLoginClick) {
                    console.log('[Topbar] Calling onLoginClick');
                    onLoginClick();
                  } else {
                    console.warn('[Topbar] onLoginClick is not defined');
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  backgroundColor: 'transparent',
                  color: '#3b82f6',
                  fontSize: 13,
                  fontWeight: 500,
                  borderRadius: 10,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <MdLogin size={16} color="#3b82f6" />
                Log in / Sign up
              </div>
            )}
          </div>
        </div>
      </div>

      <LogoutModal
        isOpen={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={handleLogout}
      />
    </>
  );
};

const iconButtonStyle = {
  width: 32,
  height: 32,
  borderRadius: 9999,
  backgroundColor: '#f3f4f6',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: 'none',
  border: '1.5px solid #f3f4f6',
  cursor: 'pointer',
  transition: 'background 0.18s, color 0.18s, border 0.18s, transform 0.16s cubic-bezier(.4,1.5,.5,1)',
};

const IconButton = ({ icon }) => (
  <div
    role="button"
    style={iconButtonStyle}
    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#e5e7eb'; }}
    onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
    onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97) translateY(1.5px)'; }}
    onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
  >
    {icon}
  </div>
);

export default Topbar;
