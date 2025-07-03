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
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        ref={modalRef}
        style={{
          width: '360px',
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          padding: '28px 24px 22px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          transform: visible ? 'translateY(0)' : 'translateY(-20px)',
          opacity: visible ? 1 : 0,
          transition: 'all 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <FiLogOut size={20} color="#b91c1c" />
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: 0 }}>Log out</h2>
        </div>

        <p style={{ fontSize: 14, color: '#4b5563', lineHeight: '1.5', marginBottom: 20 }}>
          Are you sure you want to log out of your account?
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button
            color="var(--color-white)"
            darkText
            onClick={closeWithDelay}
            disabled={loading}
            label="Cancel"
          />
          <Button
            color="var(--color-danger)"
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
