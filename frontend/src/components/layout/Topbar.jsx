import React, { useState, useRef, useEffect } from 'react';
import { FiLogOut, FiBell, FiHelpCircle, FiChevronLeft } from 'react-icons/fi';
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
        className="fixed top-0 z-[100] bg-white border-b border-gray-200 h-[56px] min-h-[56px] max-h-[56px] flex items-center transition-all"
        style={isMobile ? { left: 0, width: '100%' } : { left: 56, width: 'calc(100% - 56px)' }}
      >
        <div className="max-w-[700px] mx-auto flex justify-between items-center w-full px-3 sm:px-4 md:px-6">
          {/* Left: Back, Logo, Title */}
          <div className="flex items-center gap-2 min-w-0 truncate">
            {showBackArrow && (
              <button
                onClick={onBack}
                className="flex items-center text-[#2563eb] text-[22px] h-9 w-9 rounded-[10px] hover:bg-[#f3f4f6] transition-colors"
                aria-label="Back"
              >
                <FiChevronLeft size={22} />
              </button>
            )}
            {institutionLogo && (
              <img src={institutionLogo} alt="Institution Logo" className="h-6 w-6 object-contain rounded bg-[#f3f4f6]" />
            )}
            <span className="text-[14px] font-semibold text-gray-900 truncate">{currentPage || 'Zentari'}</span>
          </div>

          {/* Right: Bell, Help, User/Login */}
          <div className="flex items-center gap-2 flex-wrap justify-end min-w-0">
            {user && <IconButton icon={<FiBell size={16} color="#374151" />} />}
            {user && <span className="hidden sm:inline"><IconButton icon={<FiHelpCircle size={16} color="#374151" />} /></span>}
            {user ? (
              <div className="relative">
                <div
                  ref={triggerRef}
                  role="button"
                  onClick={() => setShowMenu(prev => !prev)}
                  className={`w-[34px] h-[34px] rounded-full flex items-center justify-center border transition-all duration-150 ${showMenu ? 'bg-blue-600 text-white border-blue-600' : 'bg-[#f3f4f6] text-gray-700 border-[#f3f4f6]'} cursor-pointer`}
                  onMouseEnter={e => { if (!showMenu) e.currentTarget.classList.add('bg-gray-200'); }}
                  onMouseLeave={e => { if (!showMenu) e.currentTarget.classList.remove('bg-gray-200'); }}
                  onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97) translateY(1.5px)'; }}
                  onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Profile"
                      className="w-7 h-7 rounded-full object-cover bg-gray-200"
                    />
                  ) : (
                    <FaUser size={18} color={showMenu ? '#fff' : '#374151'} />
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
                className="flex items-center gap-2 px-3 py-1.5 bg-transparent text-blue-600 text-[13px] font-medium rounded-[10px] cursor-pointer transition-colors duration-200 hover:bg-[#f3f4f6]"
              >
                <MdLogin size={16} color="#3b82f6" />
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
    className="w-[34px] h-[34px] rounded-full bg-[#f3f4f6] flex items-center justify-center border border-[#f3f4f6] cursor-pointer transition-all duration-150 hover:bg-gray-200"
    onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97) translateY(1.5px)'; }}
    onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
  >
    {icon}
  </div>
);

export default Topbar;
