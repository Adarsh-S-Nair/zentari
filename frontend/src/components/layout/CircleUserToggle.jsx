import React, { useRef, useState } from 'react';
import { FaUser, FaUsers } from 'react-icons/fa';
import { Button } from '../ui';
import InfoBubble from '../ui/InfoBubble';

// users: [{ id, name }], selectedUser: id, onSelectUser: fn, maxWidth = 700
export default function CircleUserToggle({ users, selectedUser, onSelectUser, maxWidth = 700 }) {
  // For hop animation
  const btnRefs = useRef({});
  const [hoveredUser, setHoveredUser] = useState(null);

  const handleClick = (id) => {
    const btn = btnRefs.current[id];
    if (btn) {
      btn.style.transition = 'transform 0.16s cubic-bezier(.4,1.5,.5,1)';
      btn.style.transform = 'scale(1.06) translateY(-3px)';
      setTimeout(() => {
        btn.style.transform = 'scale(0.98) translateY(1px)';
        setTimeout(() => {
          btn.style.transform = 'scale(1)';
        }, 80);
      }, 80);
    }
    onSelectUser(id);
  };

  return (
    <div
      style={{
        marginBottom: 0,
        display: 'flex',
        alignItems: 'center',
        height: 'auto',
      }}
    >
      {/* Toggle pill backdrop */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--color-bg-secondary)',
          borderRadius: 999,
          padding: '3px 8px',
          gap: 6,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          minHeight: 34,
          verticalAlign: 'middle',
        }}
      >
        {users.map((user) => (
          <div key={user.id} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <button
              ref={el => btnRefs.current[user.id] = el}
              onClick={() => handleClick(user.id)}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                border: selectedUser === user.id ? '2px solid var(--color-primary)' : '1px solid var(--color-border-primary)',
                background: selectedUser === user.id ? 'rgba(59,130,246,0.10)' : 'var(--color-bg-primary)',
                color: selectedUser === user.id ? 'var(--color-primary)' : 'var(--color-text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 15,
                cursor: 'pointer',
                outline: 'none',
                boxShadow: selectedUser === user.id ? '0 2px 8px rgba(59,130,246,0.08)' : 'none',
                transition: 'transform 0.16s cubic-bezier(.4,1.5,.5,1), box-shadow 0.18s, background 0.18s, border 0.18s',
                transform: 'scale(1)',
                padding: 0,
                overflow: 'hidden',
              }}
              aria-label={user.name}
              onMouseEnter={() => setHoveredUser(user.id)}
              onFocus={() => setHoveredUser(user.id)}
              onBlur={() => setHoveredUser(null)}
              onMouseLeave={() => setHoveredUser(null)}
            >
              {user.id === 'combined' ? (
                <FaUsers size={14} />
              ) : user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', display: 'block', background: 'none', border: 'none', padding: 0, margin: 0 }}
                />
              ) : (
                <FaUser size={14} />
              )}
            </button>
            <InfoBubble
              visible={hoveredUser === user.id}
              position="top"
              center={true}
              anchorRef={{ current: btnRefs.current[user.id] }}
            >
              {user.name}
            </InfoBubble>
          </div>
        ))}
      </div>
    </div>
  );
} 