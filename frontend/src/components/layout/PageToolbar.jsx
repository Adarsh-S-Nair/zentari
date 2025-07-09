import React from 'react';

const PageToolbar = ({ children }) => (
  <div className="w-full sticky top-[56px] z-20 py-4 px-0" style={{ background: 'var(--color-bg-topbar)', borderBottom: '1px solid var(--color-border-primary)' }}>
    {children}
  </div>
);

export default PageToolbar; 