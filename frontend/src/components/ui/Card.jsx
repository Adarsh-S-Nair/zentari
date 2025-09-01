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
 * @param {('none'|'sm'|'md')} elevation - Shadow size; default 'sm'
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
  elevation = 'md',
  ...props 
}) => {
  const { style: userStyle, ...restProps } = props || {}

  const baseClasses = `
    rounded-lg border
    ${hoverable ? 'cursor-pointer transition-all duration-200 hover:shadow' : ''}
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

  const shadow = elevation === 'none'
    ? 'none'
    : elevation === 'md'
      ? '0 2px 8px rgba(0,0,0,0.06)'
      : '0 1px 2px rgba(0,0,0,0.05)'

  return (
    <div 
      className={cardClasses}
      style={{
        background: 'var(--color-bg-secondary)',
        borderColor: 'var(--color-border-primary)',
        boxShadow: shadow,
        ...(userStyle || {})
      }}
      onClick={onClick}
      {...restProps}
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