import React, { useRef, useEffect, useState } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const Tabs = ({ tabs = [], activeId, onChange, showCount = false }) => {
  const scrollRef = useRef(null);
  const containerRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({});
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);
  const [hoveredTab, setHoveredTab] = useState(null);

  const updateIndicator = () => {
    const activeTab = containerRef.current?.querySelector(`[data-tab-id="${activeId}"]`);
    if (activeTab) {
      const { offsetLeft, offsetWidth } = activeTab;
      setIndicatorStyle({
        transform: `translateX(${offsetLeft}px)`,
        width: offsetWidth,
        transition: 'all 300ms ease',
      });
    }
  };

  const updateScrollButtons = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeft(scrollLeft > 5);
    setShowRight(scrollLeft + clientWidth < scrollWidth - 5);
  };

  const scrollBy = (amount) => {
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  useEffect(() => {
    updateIndicator();
  }, [activeId, tabs]);

  useEffect(() => {
    updateScrollButtons();
    const handleResize = () => updateScrollButtons();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="relative flex items-center gap-6">
      <div
        onClick={() => scrollBy(-150)}
        className={`cursor-pointer p-1 flex items-center transition-all duration-300 ease-in-out ${
          showLeft ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'
        }`}
        style={{ display: showLeft ? 'flex' : 'none' }}
      >
        <FiChevronLeft size={18} />
      </div>

      <div
        ref={scrollRef}
        onScroll={updateScrollButtons}
        className="overflow-x-auto w-full whitespace-nowrap scrollbar-thin"
        style={{ WebkitOverflowScrolling: 'touch', msOverflowStyle: 'auto' }}
      >
        <div
          ref={containerRef}
          className="inline-flex gap-0 relative rounded-[10px] p-0 overflow-hidden min-w-fit"
          style={{ background: 'var(--color-bg-secondary)' }}
        >
          {tabs.map((tab, idx) => {
            const isActive = activeId === tab.id;
            const isHovered = hoveredTab === tab.id;
            
            return (
              <div
                key={tab.id}
                data-tab-id={tab.id}
                onClick={() => onChange(tab.id)}
                role="tab"
                aria-selected={isActive}
                className={`px-[18px] py-[7px] text-sm font-semibold cursor-pointer flex items-center gap-2 whitespace-nowrap transition-all duration-150 ease-out transform relative select-none hover:scale-105 active:scale-[1.03] active:-translate-y-0.5 ${
                  isActive 
                    ? 'scale-100' 
                    : isHovered
                    ? 'scale-105'
                    : 'scale-100'
                } ${
                  idx === 0 ? 'rounded-l-[10px]' : ''
                } ${
                  idx === tabs.length - 1 ? 'rounded-r-[10px]' : ''
                }`}
                style={{
                  color: isActive 
                    ? 'var(--color-primary)' 
                    : isHovered
                    ? 'var(--color-text-secondary)'
                    : 'var(--color-text-muted)',
                  background: isActive 
                    ? 'var(--color-primary-bg)' 
                    : isHovered
                    ? 'var(--color-bg-hover-secondary)'
                    : 'transparent'
                }}
                onMouseEnter={() => setHoveredTab(tab.id)}
                onMouseLeave={() => setHoveredTab(null)}
              >
                <span className="select-none">{tab.label}</span>
                {showCount && typeof tab.count === 'number' && (
                  <div
                    className={`text-xs font-semibold px-1.5 py-0.5 rounded-lg min-w-4 text-center select-none`}
                    style={{
                      background: isActive 
                        ? 'var(--color-primary)' 
                        : isHovered
                        ? 'var(--color-primary-bg)'
                        : 'var(--color-bg-secondary)',
                      color: isActive 
                        ? 'var(--color-text-white)' 
                        : isHovered
                        ? 'var(--color-primary)'
                        : 'var(--color-text-muted)'
                    }}
                  >
                    {tab.count}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div
        onClick={() => scrollBy(150)}
        className={`cursor-pointer p-1 flex items-center transition-all duration-300 ease-in-out ${
          showRight ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'
        }`}
        style={{ display: showRight ? 'flex' : 'none' }}
      >
        <FiChevronRight size={18} />
      </div>
    </div>
  );
};

export default Tabs;
