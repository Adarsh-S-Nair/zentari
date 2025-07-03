import React, { useRef, useEffect, useState } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const Tabs = ({ tabs = [], activeId, onChange, showCount = false }) => {
  const scrollRef = useRef(null);
  const containerRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({});
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

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
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
      <div
        onClick={() => scrollBy(-150)}
        style={{
          cursor: 'pointer',
          padding: 4,
          display: showLeft ? 'flex' : 'none',
          alignItems: 'center',
          opacity: showLeft ? 1 : 0,
          transform: showLeft ? 'translateY(0)' : 'translateY(-5px)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
        }}
      >
        <FiChevronLeft size={18} />
      </div>

      <div
        ref={scrollRef}
        onScroll={updateScrollButtons}
        style={{
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          display: 'flex',
          flexGrow: 1,
          position: 'relative',
        }}
      >
        <div
          ref={containerRef}
          style={{
            display: 'flex',
            gap: 8,
            position: 'relative',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          {tabs.map((tab) => (
            <div
              key={tab.id}
              data-tab-id={tab.id}
              onClick={() => onChange(tab.id)}
              role="tab"
              aria-selected={activeId === tab.id}
              style={{
                padding: '10px 16px',
                fontSize: 13,
                fontWeight: 500,
                color: activeId === tab.id ? 'var(--color-primary)' : '#6b7280',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                whiteSpace: 'nowrap',
              }}
            >
              <span>{tab.label}</span>
              {showCount && typeof tab.count === 'number' && (
                <div
                  style={{
                    backgroundColor: activeId === tab.id ? 'var(--color-primary)' : '#e5e7eb',
                    color: activeId === tab.id ? '#ffffff' : '#6b7280',
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: 10,
                    minWidth: 16,
                    textAlign: 'center',
                  }}
                >
                  {tab.count}
                </div>
              )}
            </div>
          ))}

          <div
            style={{
              position: 'absolute',
              bottom: 0,
              height: 2,
              backgroundColor: 'var(--color-primary)',
              borderRadius: 999,
              ...indicatorStyle,
            }}
          />
        </div>
      </div>

      <div
        onClick={() => scrollBy(150)}
        style={{
          cursor: 'pointer',
          padding: 4,
          display: showRight ? 'flex' : 'none',
          alignItems: 'center',
          opacity: showRight ? 1 : 0,
          transform: showRight ? 'translateY(0)' : 'translateY(-5px)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
        }}
      >
        <FiChevronRight size={18} />
      </div>
    </div>
  );
};

export default Tabs;
