import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MdKeyboardArrowDown } from 'react-icons/md';

const CategoryDropdown = ({ 
  categories = [],
  currentCategory, 
  currentColor, 
  onCategoryChange,
  className = "" 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const [search, setSearch] = useState("");
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [shouldRenderDropdown, setShouldRenderDropdown] = useState(false);

  // Calculate position when opening dropdown
  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      let left = rect.right - 192; // 192px = w-48
      if (left < 0) left = 0;
      const top = rect.bottom + 8;
      console.log('Trigger rect:', rect);
      console.log('Dropdown position:', { top, left });
      setPosition({
        top,
        left,
        width: rect.width
      });
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (triggerRef.current && !triggerRef.current.contains(event.target) &&
          dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setShouldRenderDropdown(true);
      setDropdownVisible(false);
      // Trigger animation on next tick
      setTimeout(() => setDropdownVisible(true), 10);
    } else {
      setDropdownVisible(false);
      // Wait for animation to finish before unmounting
      const timeout = setTimeout(() => setShouldRenderDropdown(false), 200);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  const handleToggle = () => {
    console.log('Toggle clicked, current isOpen:', isOpen); // Debug
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
    console.log('Setting isOpen to:', !isOpen); // Debug
  };

  const handleCategorySelect = (category) => {
    onCategoryChange?.(category);
    setIsOpen(false);
  };

  // Filtered categories
  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={`relative ${className}`}>
      {/* Category Display (Clickable) */}
      <div 
        ref={triggerRef}
        className="flex gap-2 items-center cursor-pointer hover:opacity-80 transition-opacity"
        onClick={handleToggle}
      >
        <div 
          className="w-2 h-2 rounded-full" 
          style={{ background: currentColor || 'var(--color-primary)' }} 
        />
        <span className="text-[14px]" style={{ color: 'var(--color-text-secondary)' }}>
          {currentCategory || 'Uncategorized'}
        </span>
        <MdKeyboardArrowDown 
          size={16} 
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: 'var(--color-text-secondary)' }}
        />
      </div>

      {/* Dropdown Menu - Rendered via Portal */}
      {shouldRenderDropdown && createPortal(
        <div 
          ref={dropdownRef}
          className={`fixed w-48 rounded-lg shadow-lg z-[9999] transition-all duration-200 ease-out ${dropdownVisible ? 'opacity-100' : 'opacity-0'}`}
          style={{ 
            top: position.top,
            left: position.left,
            background: 'var(--color-bg-primary)',
            border: '1px solid var(--color-border-primary)',
            boxShadow: '0 8px 32px 0 var(--color-shadow-heavy)',
            backdropFilter: 'blur(4px)',
            transform: dropdownVisible ? 'translateY(0)' : 'translateY(-8px)',
          }}
          onMouseDown={e => e.stopPropagation()}
        >
          {/* Search Bar */}
          <div className="px-1 pt-2 pb-2 border-b" style={{ borderColor: 'var(--color-border-primary)' }}>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search categories…"
              className="w-full rounded-md px-3 py-2 text-[12px] bg-transparent border outline-none"
              style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-input-border)',
                color: 'var(--color-text-primary)',
                fontFamily: 'inherit'
              }}
            />
          </div>
          <div className="py-2">
            {filteredCategories.map((category) => (
              <div
                key={category.id}
                className="flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors hover:bg-[var(--color-bg-hover)]"
                onClick={() => handleCategorySelect(category)}
              >
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ background: category.color }} 
                />
                <span 
                  className="text-[12px]"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {category.name}
                </span>
              </div>
            ))}
            {/* Remove Category Option */}
            <div className="border-t mt-2 pt-2" style={{ borderColor: 'var(--color-border-primary)' }}>
              <div
                className="flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors hover:bg-[var(--color-bg-hover)]"
                onClick={() => handleCategorySelect(null)}
              >
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <span 
                  className="text-[12px]"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Remove Category
                </span>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default CategoryDropdown; 