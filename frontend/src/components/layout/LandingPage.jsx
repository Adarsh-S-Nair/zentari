import React, { useState } from 'react';
import { MdEmail } from 'react-icons/md';
import { FaLock, FaUser } from 'react-icons/fa';
import { supabase } from '../../supabaseClient';
import { Button } from '../ui';

function Field({ icon, type, placeholder, value, onChange, onKeyPress }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        padding: '10px 12px',
        border: '1px solid #e5e7eb',
        boxSizing: 'border-box',
      }}
    >
      {icon}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyPress}
        style={{
          flex: 1,
          border: 'none',
          outline: 'none',
          fontSize: '14px',
          color: '#111827',
          background: 'transparent',
          marginLeft: '8px',
        }}
      />
    </div>
  );
}

export default function LandingPage({ setLoginOpen }) {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Responsive: detect mobile
  const isMobile = window.innerWidth <= 670;

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    if (!email || !password || (isSignup && !name)) {
      setError('Please fill out all fields.');
      setLoading(false);
      return;
    }
    try {
      if (isSignup) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: name } },
        });
        if (signUpError) throw signUpError;
        if (!signUpData.session) {
          setSuccess('Please check your email to confirm your account before signing in.');
          setLoading(false);
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
      setSuccess('Success! Redirecting...');
      setLoading(false);
      window.location.reload();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: isMobile ? 'column' : 'row', background: 'linear-gradient(90deg, #f1f5f9 0%, #e0e7ef 100%)' }}>
      {/* Left panel - hidden on mobile */}
      {!isMobile && (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 40,
          background: 'linear-gradient(120deg, #3b82f6 0%, #6366f1 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Animated gradient overlay */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'radial-gradient(circle at 60% 40%, rgba(255,255,255,0.10) 0%, transparent 70%)',
            zIndex: 1,
            pointerEvents: 'none',
            animation: 'pulse 4s ease-in-out infinite',
          }} />
          {/* Faint logo/icon */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: 180,
            color: 'rgba(255,255,255,0.08)',
            fontWeight: 900,
            zIndex: 0,
            userSelect: 'none',
            letterSpacing: -8,
            fontFamily: 'Inter, system-ui, sans-serif',
          }}>
            Z
          </div>
          <h1 style={{ fontSize: 38, fontWeight: 800, letterSpacing: -1, color: '#fff', marginBottom: 18, zIndex: 2 }}>Zentari</h1>
          <p style={{ fontSize: 17, color: '#e0e7ef', maxWidth: 340, textAlign: 'center', lineHeight: 1.5, zIndex: 2 }}>
            The modern way to track, analyze, and simulate your finances. <br />
            Secure. Fast. Beautiful.
          </p>
        </div>
      )}
      {/* Right panel (form) */}
      <div style={{
        flex: 1,
        minWidth: isMobile ? '100vw' : 320,
        maxWidth: isMobile ? '100vw' : 420,
        background: isMobile ? '#fff' : '#fff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        boxShadow: isMobile ? 'none' : '0 0 32px 0 rgba(59,130,246,0.07)',
        padding: isMobile ? '0' : 40,
        width: isMobile ? '100vw' : '100%',
        height: isMobile ? '100vh' : undefined,
        minHeight: isMobile ? '100vh' : undefined,
        boxSizing: 'border-box',
      }}>
        <div style={{
          width: isMobile ? '100%' : '100%',
          maxWidth: isMobile ? 400 : 340,
          background: '#fff',
          borderRadius: isMobile ? 0 : 16,
          padding: isMobile ? '32px 16px' : 32,
          boxShadow: isMobile ? 'none' : '0 4px 24px 0 rgba(59,130,246,0.06)',
          position: 'relative',
          overflow: 'hidden',
          minHeight: isMobile ? '100vh' : 340,
          height: isMobile ? '100vh' : undefined,
          margin: isMobile ? '0 auto' : 0,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}>
          {/* Animated form switch */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            pointerEvents: 'none',
            zIndex: 1,
          }}>
            <style>{`
              @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.7; } 100% { opacity: 1; } }
              .fade-slide-in { opacity: 1; transform: translateY(0); transition: opacity 0.35s, transform 0.35s; }
              .fade-slide-out { opacity: 0; transform: translateY(30px); transition: opacity 0.35s, transform 0.35s; pointer-events: none; position: absolute; width: 100%; }
            `}</style>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, textAlign: 'center', marginBottom: 18, color: '#1e293b', zIndex: 2 }}>
            {isSignup ? 'Sign Up' : 'Log In'}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'relative', minHeight: 180 }}>
            {/* Login Form */}
            <div className={isSignup ? 'fade-slide-out' : 'fade-slide-in'} style={{ position: isSignup ? 'absolute' : 'relative', width: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Field
                  icon={<MdEmail size={18} color="#6b7280" />}
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
                <Field
                  icon={<FaLock size={16} color="#6b7280" />}
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
                {error && !isSignup && <div style={{ color: 'red', fontSize: 13, textAlign: 'center' }}>{error}</div>}
                {success && !isSignup && <div style={{ color: '#16a34a', fontSize: 13, textAlign: 'center' }}>{success}</div>}
              </div>
              <Button
                label={'Log In'}
                onClick={handleSubmit}
                loading={loading && !isSignup}
                color="#3b82f6"
                width="100%"
                style={{ fontSize: 15, fontWeight: 600, borderRadius: 10, marginTop: 18 }}
              />
            </div>
            {/* Signup Form */}
            <div className={isSignup ? 'fade-slide-in' : 'fade-slide-out'} style={{ position: !isSignup ? 'absolute' : 'relative', width: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Field
                  icon={<FaUser size={16} color="#6b7280" />}
                  type="text"
                  placeholder="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
                <Field
                  icon={<MdEmail size={18} color="#6b7280" />}
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
                <Field
                  icon={<FaLock size={16} color="#6b7280" />}
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
                {error && isSignup && <div style={{ color: 'red', fontSize: 13, textAlign: 'center' }}>{error}</div>}
                {success && isSignup && <div style={{ color: '#16a34a', fontSize: 13, textAlign: 'center' }}>{success}</div>}
              </div>
              <Button
                label={'Sign Up'}
                onClick={handleSubmit}
                loading={loading && isSignup}
                color="#3b82f6"
                width="100%"
                style={{ fontSize: 15, fontWeight: 600, borderRadius: 10, marginTop: 18 }}
              />
            </div>
            <div style={{ textAlign: 'center', marginTop: 10, fontSize: 13, color: '#64748b', zIndex: 2 }}>
              {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
              <span
                style={{ color: '#3b82f6', cursor: 'pointer', fontWeight: 500 }}
                onClick={() => setIsSignup((v) => !v)}
              >
                {isSignup ? 'Log In' : 'Sign Up'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 