import React, { useState, useEffect, useRef } from 'react';
import { FiUser, FiLogOut, FiBell, FiHelpCircle } from 'react-icons/fi';
import { supabase } from '../../supabaseClient';
import { LogoutModal } from '../modals';

const Topbar = ({ user, onLoginClick, currentPage }) => {
  const [userName, setUserName] = useState('');
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (user) {
      supabase
        .from('user_profiles')
        .select('name')
        .eq('id', user.id)
        .single()
        .then(({ data, error }) => {
          if (!error && data?.name) setUserName(data.name);
        });
    }
  }, [user]);

  // Close on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };

    const handleEsc = (e) => {
      if (e.key === 'Escape') setShowProfileMenu(false);
    };

    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [showProfileMenu]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setLogoutOpen(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <>
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', borderBottom: '1px solid #e5e7eb', backgroundColor: '#fff' }}>
        <div style={{ width: '100%', maxWidth: 700, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1f2937' }}>
            {currentPage || 'Trading API'}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {user && (
              <>
                <IconButton icon={<FiBell size={16} />} />
                <IconButton icon={<FiHelpCircle size={16} />} />
              </>
            )}

            {user ? (
              <div style={{ position: 'relative' }} ref={menuRef}>
                <div
                  role="button"
                  onClick={() => setShowProfileMenu((prev) => !prev)}
                  style={iconButtonStyle}
                >
                  <FiUser size={16} color="#4b5563" />
                </div>

                {showProfileMenu && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 40,
                      width: 192,
                      backgroundColor: '#fff',
                      borderRadius: 8,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      border: '1px solid #e5e7eb',
                      zIndex: 50,
                      fontSize: 13,
                      color: '#374151'
                    }}
                  >
                    <div style={{ padding: '8px 0' }}>
                      <div style={{ padding: '8px 16px', borderBottom: '1px solid #f3f4f6' }}>
                        {userName || user.email}
                      </div>
                      <div
                        role="button"
                        onClick={() => setLogoutOpen(true)}
                        style={{
                          padding: '8px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          cursor: 'pointer',
                          transition: 'background-color 0.2s ease',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <FiLogOut size={14} />
                        <span>Sign Out</span>
                      </div>
                    </div>
                  </div>
                )}
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
                  backgroundColor: '#2563eb',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 500,
                  borderRadius: 9999,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              >
                <FiUser size={14} />
                Log In
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
