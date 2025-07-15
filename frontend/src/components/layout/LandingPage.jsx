import React, { useState } from 'react';
import { MdEmail } from 'react-icons/md';
import { FaLock, FaUser } from 'react-icons/fa';
import { supabase } from '../../supabaseClient';
import { Button } from '../ui';

function Field({ icon, type, placeholder, value, onChange, onKeyPress, autoComplete }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      backgroundColor: '#f9fafb',
      borderRadius: 8,
      padding: '10px 12px',
      border: '1px solid #e5e7eb',
      boxSizing: 'border-box',
      width: '100%',
    }}>
      {icon && (
        <div style={{ width: 22, minWidth: 22, maxWidth: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 8 }}>
          {icon}
        </div>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyPress}
        autoComplete={autoComplete}
        style={{
          flex: 1,
          border: 'none',
          outline: 'none',
          fontSize: 14,
          color: '#111827',
          background: 'transparent',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

// Add a function to generate a random hex color (without #)
function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

export default function LandingPage() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Responsive: detect mobile
  const isMobile = typeof window !== 'undefined' ? window.innerWidth <= 670 : false;

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    if (!email || !password || (isSignup && (!firstName || !lastName))) {
      setError('Please fill out all fields.');
      setLoading(false);
      return;
    }
    try {
      if (isSignup) {
        const displayName = `${firstName} ${lastName}`.trim();
        const bgColor = getRandomColor();
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName + ' ' + lastName)}&background=${bgColor}&color=fff&size=128`;
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName } },
        });
        if (signUpError) throw signUpError;
        const userId = signUpData.user?.id || signUpData.session?.user?.id;
        if (userId) {
          await supabase.from('profiles').upsert({
            id: userId,
            full_name: displayName,
            avatar_url: avatarUrl,
          });
        }
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
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        background: 'linear-gradient(90deg, #f1f5f9 0%, #e0e7ef 100%)',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Left panel - hidden on mobile */}
      {!isMobile && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 40,
            background: 'linear-gradient(120deg, #3b82f6 0%, #6366f1 100%)',
            position: 'relative',
            overflow: 'hidden',
            boxSizing: 'border-box',
          }}
        >
          {/* Faint logo/icon */}
          <div
            style={{
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
            }}
          >
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
      <div
        style={{
          flex: 1,
          minWidth: isMobile ? '100%' : 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#fff',
          boxSizing: 'border-box',
          height: isMobile ? '100dvh' : '100vh',
          overflow: 'hidden',
        }}
      >
        <form
          onSubmit={e => { e.preventDefault(); handleSubmit(); }}
          style={{
            width: '100%',
            maxWidth: 360,
            background: '#fff',
            borderRadius: 0,
            padding: isMobile ? '32px 16px' : 32,
            boxShadow: 'none',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 18,
          }}
        >
          <h2 style={{ fontSize: 22, fontWeight: 700, textAlign: 'center', marginBottom: 8, color: '#1e293b' }}>
            {isSignup ? 'Sign Up' : 'Log In'}
          </h2>
          {isSignup && (
            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
              <div style={{ flex: 1, minWidth: 0, boxSizing: 'border-box' }}>
                <Field
                  icon={<FaUser size={16} color="#6b7280" />}
                  type="text"
                  placeholder="First Name"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  onKeyPress={handleKeyPress}
                  autoComplete="given-name"
                />
              </div>
              <div style={{ flex: 1, minWidth: 0, boxSizing: 'border-box' }}>
                <Field
                  icon={<FaUser size={16} color="#6b7280" />}
                  type="text"
                  placeholder="Last Name"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  onKeyPress={handleKeyPress}
                  autoComplete="family-name"
                />
              </div>
            </div>
          )}
          <Field
            icon={<MdEmail size={18} color="#6b7280" />}
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyPress={handleKeyPress}
            autoComplete="email"
          />
          <Field
            icon={<FaLock size={16} color="#6b7280" />}
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
          />
          {error && <div style={{ color: 'red', fontSize: 13, textAlign: 'center', width: '100%' }}>{error}</div>}
          {success && <div style={{ color: '#16a34a', fontSize: 13, textAlign: 'center', width: '100%' }}>{success}</div>}
          <Button
            color="networth"
            onClick={handleSubmit}
            disabled={loading}
            loading={loading}
            label={loading ? 'Please wait...' : isSignup ? 'Create account' : 'Log in'}
            className="h-8"
            width="w-full"
          />
          <p style={{ fontSize: 13, textAlign: 'center', marginTop: 6, color: '#6b7280', width: '100%' }}>
            {isSignup ? (
              <>Already have an account?{' '}
                <span onClick={() => { setIsSignup(false); setError(null); setSuccess(null); }} style={{ color: '#2563eb', cursor: 'pointer' }}>Log in</span></>
            ) : (
              <>Don't have an account?{' '}
                <span onClick={() => { setIsSignup(true); setError(null); setSuccess(null); }} style={{ color: '#2563eb', cursor: 'pointer' }}>Sign up</span></>
            )}
          </p>
        </form>
      </div>
    </div>
  );
} 