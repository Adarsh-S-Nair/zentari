import React, { useState, useRef, useEffect } from 'react';
import { FiLogOut, FiBell, FiHelpCircle, FiChevronLeft, FiSun, FiMoon } from 'react-icons/fi';
import { MdLogin } from "react-icons/md";
import { FaUser } from 'react-icons/fa';
import { supabase } from '../../supabaseClient';
import { LogoutModal } from '../modals';
import ContextMenu from '../ui/ContextMenu';

const Topbar = ({ user, onLoginClick, currentPage, showBackArrow = false, onBack, institutionLogo, isMobile }) => {
  const [userName, setUserName] = useState('');
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const triggerRef = useRef(null);
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    if (user) {
      const name = user.user_metadata?.display_name || user.email || 'User';
      setUserName(name);
      supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single()
        .then(({ data }) => setAvatarUrl(data?.avatar_url || null));
    } else {
      setUserName('');
      setAvatarUrl(null);
    }
  }, [user]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setLogoutOpen(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const userMenuItems = [
    { label: userName || user?.email || 'User', icon: <FaUser size={13} />, disabled: true },
    { label: 'Sign Out', icon: <FiLogOut size={14} style={{ marginTop: 1 }} />, onClick: () => setLogoutOpen(true) }
  ];

  return (
    <>
      <div
        className="fixed top-0 z-[100] h-[56px] min-h-[56px] max-h-[56px] flex items-center transition-all"
        style={{ background: 'var(--color-bg-topbar)', ...(isMobile ? { left: 0, width: '100%' } : { left: 56, width: 'calc(100% - 56px)' }) }}
      >
        <div className="max-w-[700px] mx-auto flex justify-between items-center w-full px-3 sm:px-4 md:px-6">
          {/* Left: Back, Logo, Title */}
          <div className="flex items-center gap-2 min-w-0 truncate">
            {showBackArrow && (
              <button
                onClick={onBack}
                className="flex items-center text-[22px] h-9 w-9 rounded-[10px] cursor-pointer transition-transform duration-150 hover:scale-120 active:scale-95"
                aria-label="Back"
                style={{ background: 'none', color: 'var(--color-primary)' }}
              >
                <FiChevronLeft size={22} />
              </button>
            )}
            {institutionLogo && (
              <img src={institutionLogo} alt="Institution Logo" className="h-6 w-6 object-contain rounded" style={{ background: 'var(--color-bg-tertiary)' }} />
            )}
            <span className="text-[14px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{currentPage || 'Zentari'}</span>
          </div>

          {/* Right: Theme Toggle, Bell, Help, User/Login */}
          <div className="flex items-center gap-2 flex-wrap justify-end min-w-0">
            <button
               aria-label="Toggle theme"
               onClick={toggleTheme}
              className="w-[34px] h-[34px] rounded-full flex items-center justify-center border cursor-pointer transition-all duration-150"
              style={{ marginRight: 2, background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-primary)' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97) translateY(1.5px)'; }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1.15)'; }}
            >
              {theme === 'dark' ? <FiSun size={18} color="var(--color-text-primary)" /> : <FiMoon size={18} color="var(--color-text-primary)" />}
            </button>
            {user && <IconButton icon={<FiBell size={16} color="var(--color-text-primary)" />} />}
            {user && <span className="hidden sm:inline"><IconButton icon={<FiHelpCircle size={16} color="var(--color-text-primary)" />} /></span>}
            {user ? (
              <div className="relative">
                <div
                  ref={triggerRef}
                  role="button"
                  onClick={() => setShowMenu(prev => !prev)}
                  className="w-[34px] h-[34px] rounded-full flex items-center justify-center border transition-all duration-150 cursor-pointer"
                  style={{ 
                    background: showMenu ? 'rgba(59,130,246,0.10)' : 'var(--color-bg-primary)', 
                    borderColor: showMenu ? 'var(--color-primary)' : 'var(--color-border-primary)',
                    boxShadow: showMenu ? '0 2px 8px rgba(59,130,246,0.08)' : 'none'
                  }}
                  onMouseEnter={e => { 
                    if (!showMenu) {
                      e.currentTarget.style.transform = 'scale(1.04)';
                      e.currentTarget.style.background = 'var(--color-bg-secondary)';
                    }
                  }}
                  onMouseLeave={e => { 
                    if (!showMenu) {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.background = 'var(--color-bg-primary)';
                    }
                  }}
                  onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97) translateY(1.5px)'; }}
                  onMouseUp={e => { e.currentTarget.style.transform = 'scale(1.04)'; }}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Profile"
                      className="w-7 h-7 rounded-full object-cover"
                      style={{ background: 'var(--color-bg-tertiary)' }}
                    />
                  ) : (
                    <FaUser size={18} color={showMenu ? 'var(--color-text-white)' : 'var(--color-text-primary)'} />
                  )}
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
                onClick={() => onLoginClick && onLoginClick()}
                className="flex items-center gap-2 px-3 py-1.5 bg-transparent text-[13px] font-medium rounded-[10px] cursor-pointer transition-colors duration-200"
                style={{ color: 'var(--color-primary)' }}
              >
                <MdLogin size={16} color="var(--color-primary)" />
                Log in / Sign up
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="h-[56px] min-h-[56px] max-h-[56px] w-full" />
      <LogoutModal isOpen={logoutOpen} onClose={() => setLogoutOpen(false)} onConfirm={handleLogout} />
    </>
  );
};

const IconButton = ({ icon }) => (
  <div
    role="button"
    className="w-[34px] h-[34px] rounded-full flex items-center justify-center border cursor-pointer transition-all duration-150"
    style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-primary)' }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
    onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97) translateY(1.5px)'; }}
    onMouseUp={e => { e.currentTarget.style.transform = 'scale(1.15)'; }}
  >
    {icon}
  </div>
);

export default Topbar;
