import React, { useState, useRef, useEffect } from 'react';
import { FiLogOut, FiBell, FiHelpCircle} from 'react-icons/fi';
import { MdLogin } from "react-icons/md";
import { FaUser } from 'react-icons/fa';
import { supabase } from '../../supabaseClient';
import { LogoutModal } from '../modals';
import ContextMenu from '../ui/ContextMenu';

const Topbar = ({ user, onLoginClick, currentPage }) => {
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
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#fff'
      }}>
        <div style={{
          width: '100%',
          maxWidth: 700,
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1f2937' }}>
            {currentPage || 'Zentari'}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {user && (
              <>
                <IconButton icon={<FiBell size={16} />} />
                <IconButton icon={<FiHelpCircle size={16} />} />
              </>
            )}

            {user ? (
              <div style={{ position: 'relative' }}>
                <div
                  ref={triggerRef}
                  role="button"
                  onClick={() => setShowMenu(prev => !prev)}
                  style={iconButtonStyle}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                >
                  <FaUser size={16} color="#4b5563" />
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
                onClick={onLoginClick}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  backgroundColor: 'transparent',
                  color: '#374151',
                  fontSize: 13,
                  fontWeight: 500,
                  borderRadius: 6,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <MdLogin size={16} />
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
  boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
};

const IconButton = ({ icon }) => (
  <div
    role="button"
    style={iconButtonStyle}
    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
  >
    {icon}
  </div>
);

export default Topbar;
