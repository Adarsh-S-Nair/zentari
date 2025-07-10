import React, { useEffect, useState, useRef } from 'react';
import { FiLogOut } from 'react-icons/fi';
import { supabase } from '../../supabaseClient';
import { Button } from '../ui';

export default function LogoutModal({ isOpen, onClose, onLogout }) {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) setVisible(true);

    const handleKeyDown = (e) => e.key === 'Escape' && closeWithDelay();
    const handleClickOutside = (e) =>
      modalRef.current && !modalRef.current.contains(e.target) && closeWithDelay();

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const closeWithDelay = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  const handleConfirmLogout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      closeWithDelay();
      onLogout?.();
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[300] flex items-center justify-center"
      style={{ 
        background: 'var(--color-backdrop-overlay)',
        backdropFilter: `blur(var(--color-backdrop-blur))`
      }}
    >
      <div
        ref={modalRef}
        className="z-[400] w-[360px] bg-white rounded-[14px] px-6 pt-7 pb-5 shadow-2xl transition-all"
        style={{
          transform: visible ? 'translateY(0)' : 'translateY(-20px)',
          opacity: visible ? 1 : 0,
          transition: 'all 0.2s ease',
        }}
      >
        <div className="flex items-center gap-2.5 mb-3.5">
          <FiLogOut size={20} className="text-red-700" />
          <h2 className="text-[18px] font-semibold text-gray-900 m-0">Log out</h2>
        </div>
        <p className="text-[14px] text-gray-600 leading-[1.5] mb-5">
          Are you sure you want to log out of your account?
        </p>
        <div className="flex justify-end gap-2">
          <Button
            color="white"
            darkText
            onClick={closeWithDelay}
            disabled={loading}
            label="Cancel"
          />
          <Button
            color="bg-gradient-to-r from-red-700 to-red-600 text-white hover:from-red-800 hover:to-red-700"
            onClick={handleConfirmLogout}
            disabled={loading}
            loading={loading}
            label="Log out"
          />
        </div>
      </div>
    </div>
  );
}
