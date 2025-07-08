import React from 'react';

const IconButton = ({ children, onClick, className = '', ariaLabel }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center justify-center p-0 m-0 bg-transparent border-none outline-none cursor-pointer transition-transform duration-150 hover:scale-125 focus:scale-125 shadow-none ${className}`}
    aria-label={ariaLabel}
  >
    {children}
  </button>
);

export default IconButton; 