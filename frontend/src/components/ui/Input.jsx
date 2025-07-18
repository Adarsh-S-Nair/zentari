import React from 'react';

const Input = ({ 
  type = 'text',
  value,
  onChange,
  placeholder,
  options = [],
  disabled = false,
  error = false,
  className = '',
  step,
  ...props 
}) => {
  const baseClasses = `
    w-full px-3 py-2.5 text-sm rounded-md border transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-blue-500
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const themeClasses = `
    bg-transparent
    border-[var(--color-input-border)]
    text-[var(--color-text-primary)]
    placeholder-[var(--color-text-muted)]
    focus:border-[var(--color-input-focus)]
    ${error ? 'border-[var(--color-input-error)] focus:ring-[var(--color-input-error)]' : ''}
  `;

  const combinedClasses = `${baseClasses} ${themeClasses} ${className}`;

  // Handle select/dropdown
  if (type === 'select') {
    return (
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`${combinedClasses} appearance-none`}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
          backgroundPosition: 'right 0.5rem center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '1.5em 1.5em',
          paddingRight: '2.5rem'
        }}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  // Handle textarea
  if (type === 'textarea') {
    return (
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`${combinedClasses} resize-none`}
        rows={props.rows || 3}
        {...props}
      />
    );
  }

  // Handle number input with step
  if (type === 'number') {
    return (
      <input
        type="number"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        step={step}
        className={combinedClasses}
        {...props}
      />
    );
  }

  // Default text input
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={combinedClasses}
      {...props}
    />
  );
};

export default Input; 