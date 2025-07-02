import React, { useState, useEffect } from 'react';

const Toggle = ({
  checked = true,
  onChange,
  disabled = false,
  size = 'medium',
  className = '',
  style = {},
  color = '#3b82f6' // Default primary color
}) => {
  const sizes = {
    small: { width: 32, height: 18, thumb: 14 },
    medium: { width: 40, height: 22, thumb: 18 },
    large: { width: 48, height: 26, thumb: 22 }
  };

  const { width, height, thumb } = sizes[size];
  const [isChecked, setIsChecked] = useState(checked);

  useEffect(() => {
    setIsChecked(checked);
  }, [checked]);

  const handleToggle = () => {
    if (disabled) return;
    const newValue = !isChecked;
    setIsChecked(newValue);
    onChange?.(newValue);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isChecked}
      disabled={disabled}
      onClick={handleToggle}
      className={`relative inline-flex items-center transition-colors duration-300 ease-in-out ${className}`}
      style={{
        width,
        height,
        borderRadius: height,
        backgroundColor: isChecked ? color : '#e5e7eb',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: 'none',
        outline: 'none',
        padding: 0,
        ...style
      }}
    >
      <span
        className="absolute transition-transform duration-300 ease-in-out"
        style={{
          width: thumb,
          height: thumb,
          backgroundColor: '#ffffff',
          borderRadius: '50%',
          transform: `translateX(${isChecked ? width - thumb - 2 : 2}px) translateY(-50%)`,
          top: '50%',
          left: 0,
          boxShadow: isChecked
            ? '0 0 6px rgba(59, 130, 246, 0.5)'
            : '0 1px 2px rgba(0,0,0,0.1)'
        }}
      />
    </button>
  );
};

export default Toggle;
