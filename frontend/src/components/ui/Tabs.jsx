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
          width: '100%',
          whiteSpace: 'nowrap',
          WebkitOverflowScrolling: 'touch',
          msOverflowStyle: 'auto',
          scrollbarWidth: 'thin',
        }}
      >
        <div
          ref={containerRef}
          style={{
            display: 'inline-flex',
            gap: 0,
            position: 'relative',
            background: '#f3f4f6',
            borderRadius: 10,
            padding: 0,
            overflow: 'hidden',
            minWidth: 'fit-content',
          }}
        >
          {tabs.map((tab, idx) => (
            <div
              key={tab.id}
              data-tab-id={tab.id}
              onClick={() => onChange(tab.id)}
              role="tab"
              aria-selected={activeId === tab.id}
              style={{
                padding: '7px 18px',
                fontSize: 14,
                fontWeight: 600,
                color: activeId === tab.id ? '#2563eb' : '#6b7280',
                background: activeId === tab.id ? '#e5e7fa' : 'transparent',
                borderTopLeftRadius: idx === 0 ? 10 : 0,
                borderBottomLeftRadius: idx === 0 ? 10 : 0,
                borderTopRightRadius: idx === tabs.length - 1 ? 10 : 0,
                borderBottomRightRadius: idx === tabs.length - 1 ? 10 : 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                whiteSpace: 'nowrap',
                boxShadow: 'none',
                transition: 'transform 0.16s cubic-bezier(.4,1.5,.5,1), background 0.18s, color 0.18s',
                transform: 'scale(1)',
                position: 'relative',
                userSelect: 'none',
              }}
              onMouseEnter={e => {
                if (activeId !== tab.id) {
                  e.currentTarget.style.transform = 'scale(1.06)';
                  e.currentTarget.style.background = '#e0e7ef';
                  e.currentTarget.style.color = '#1d4ed8';
                  e.currentTarget.style.boxShadow = '0 2px 8px 0 rgba(37,99,235,0.08)';
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.background = activeId === tab.id ? '#e5e7fa' : 'transparent';
                e.currentTarget.style.color = activeId === tab.id ? '#2563eb' : '#6b7280';
                e.currentTarget.style.boxShadow = 'none';
              }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(1.03) translateY(-2px)'; }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <span style={{ userSelect: 'none' }}>{tab.label}</span>
              {showCount && typeof tab.count === 'number' && (
                <div
                  style={{
                    background: activeId === tab.id ? '#2563eb' : '#e5e7eb',
                    color: activeId === tab.id ? '#fff' : '#6b7280',
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: 8,
                    minWidth: 16,
                    textAlign: 'center',
                    userSelect: 'none',
                  }}
                >
                  {tab.count}
                </div>
              )}
            </div>
          ))}
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
