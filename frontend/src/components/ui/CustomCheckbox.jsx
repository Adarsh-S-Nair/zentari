import React from 'react';
import { FiCheck } from 'react-icons/fi';

const CustomCheckbox = ({ checked, onChange, className = '', ...props }) => {
  return (
    <div
      className={`relative w-4 h-4 rounded border-2 transition-all duration-200 cursor-pointer flex items-center justify-center hover:scale-105 ${className}`}
      style={{
        borderColor: checked ? 'var(--color-primary)' : 'var(--color-border-primary)',
        background: checked ? 'var(--color-primary)' : 'transparent'
      }}
      onClick={onChange}
      onMouseEnter={(e) => {
        if (!checked) {
          e.currentTarget.style.borderColor = 'var(--color-primary)';
          e.currentTarget.style.background = 'var(--color-primary-bg)';
        }
      }}
      onMouseLeave={(e) => {
        if (!checked) {
          e.currentTarget.style.borderColor = 'var(--color-border-primary)';
          e.currentTarget.style.background = 'transparent';
        }
      }}
      {...props}
    >
      {checked && (
        <FiCheck 
          size={10} 
          className="text-white" 
          style={{ color: 'white' }}
        />
      )}
    </div>
  );
};

export default CustomCheckbox; 