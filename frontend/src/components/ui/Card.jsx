import React from 'react';

/**
 * Reusable Card component with consistent styling
 * 
 * @param {string} title - Optional title for the card
 * @param {React.ReactNode} children - Card content
 * @param {React.ReactNode} header - Optional custom header component
 * @param {string} className - Additional CSS classes for the card
 * @param {string} titleClassName - Additional CSS classes for the title
 * @param {string} bodyClassName - Additional CSS classes for the body
 * @param {function} onClick - Optional click handler
 * @param {boolean} hoverable - Whether the card should have hover effects
 * @param {string} padding - Padding classes (default: 'p-6')
 * @param {object} props - Additional props passed to the div element
 */
const Card = ({ 
  title, 
  children, 
  header,
  className = '', 
  titleClassName = '',
  bodyClassName = '',
  onClick,
  hoverable = false,
  padding = 'p-6',
  ...props 
}) => {
  const baseClasses = `
    rounded-xl border
    ${hoverable ? 'cursor-pointer transition-all duration-200 hover:shadow-lg' : ''}
    ${onClick ? 'cursor-pointer' : ''}
  `;

  const cardClasses = `
    ${baseClasses}
    ${className}
  `.trim();

  const titleClasses = `
    text-[13px] font-medium p-6 pb-4
    ${titleClassName}
  `.trim();

  const bodyClasses = `
    ${bodyClassName}
  `.trim();

  return (
    <div 
      className={cardClasses}
      style={{
        background: 'var(--color-bg-secondary)',
        borderColor: 'var(--color-border-primary)',
        boxShadow: '0 1px 3px 0 var(--color-shadow-light)'
      }}
      onClick={onClick}
      {...props}
    >
      {header ? (
        <div className="p-6 pb-4">
          {header}
        </div>
      ) : title && (
        <h3 
          className={titleClasses}
          style={{ color: 'var(--color-text-muted)' }}
        >
          {title}
        </h3>
      )}
      <div className={bodyClasses}>
        {children}
      </div>
    </div>
  );
};

export default Card; 