import React from 'react';

const PageToolbar = ({ children }) => (
  <div className="w-full sticky top-[56px] z-20 bg-white border-b border-gray-200 py-4 px-0">
    {children}
  </div>
);

export default PageToolbar; 