import React from 'react';

const sizeMap = {
  small: { track: 'w-8 h-4', thumb: 'w-3.5 h-3.5', translate: 'translate-x-4' },
  medium: { track: 'w-10 h-5', thumb: 'w-4 h-4', translate: 'translate-x-5' },
  large: { track: 'w-12 h-6', thumb: 'w-5 h-5', translate: 'translate-x-6' },
};

function hexToRgba(hex, alpha = 1) {
  // Convert hex to rgba string
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

const Toggle = ({
  checked = true,
  onChange,
  disabled = false,
  size = 'medium',
  className = '',
  color,
  ...props
}) => {
  const s = sizeMap[size] || sizeMap.medium;
  const activeBg = color || '#6366f1';
  const focusRing = hexToRgba(activeBg, 0.25);
  const thumbShadow = checked ? `0 2px 8px 0 ${hexToRgba(activeBg, 0.25)}` : '0 1px 2px 0 rgba(0,0,0,0.08)';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      tabIndex={0}
      onClick={() => !disabled && onChange?.(!checked)}
      onKeyDown={e => {
        if (disabled) return;
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onChange?.(!checked);
        }
      }}
      className={`relative inline-flex items-center transition-colors duration-200 focus:outline-none ${s.track} rounded-full ${checked ? '' : 'bg-gray-200'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      style={{
        backgroundColor: checked ? activeBg : undefined,
        boxShadow: checked ? `0 0 0 0 ${activeBg}` : undefined,
      }}
      {...props}
    >
      <span
        className={`inline-block rounded-full bg-white transition-transform duration-200 ${s.thumb} ${checked ? s.translate : 'translate-x-0'} shadow`}
        style={{
          boxShadow: thumbShadow,
          border: checked ? 'none' : '1.5px solid #e5e7eb',
        }}
      />
      {/* Focus ring (custom, for color) */}
      <span
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          boxShadow: `0 0 0 0 ${checked ? focusRing : 'transparent'}`,
          transition: 'box-shadow 0.2s',
        }}
        aria-hidden="true"
      />
    </button>
  );
};

export default Toggle;
