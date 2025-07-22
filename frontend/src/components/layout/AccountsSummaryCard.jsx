import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FaChartLine, FaCreditCard } from 'react-icons/fa6';
import { IoMdCash } from 'react-icons/io';
import { FiInfo } from 'react-icons/fi';
import { formatCurrency } from '../../utils/formatters';
import { getRawBalance } from './accountsUtils';

const TooltipIcon = ({ tooltipText, size = 14 }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const timeoutRef = useRef(null);
  const iconRef = useRef(null);

  const handleMouseEnter = () => {
    clearTimeout(timeoutRef.current);
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setShowTooltip(false), 120);
  };

  return (
    <>
      <div
        ref={iconRef}
        className="ml-2 cursor-default opacity-80 hover:opacity-100 p-1 rounded-full transition bg-transparent flex items-center"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ minWidth: size, minHeight: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <FiInfo size={size - 2} style={{ color: 'var(--color-text-white)', opacity: 0.8 }} />
      </div>
      
      {/* Tooltip positioned relative to viewport */}
      {showTooltip && createPortal(
        <div 
          className="fixed z-[9999] px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg"
          style={{
            top: iconRef.current ? iconRef.current.getBoundingClientRect().top - 8 : '50%',
            left: iconRef.current ? iconRef.current.getBoundingClientRect().left + (iconRef.current.offsetWidth / 2) : '50%',
            transform: 'translate(-50%, -100%)',
            maxWidth: '200px',
            whiteSpace: 'normal',
            wordWrap: 'break-word',
            pointerEvents: 'none'
          }}
        >
          {tooltipText}
          {/* Arrow pointing down */}
          <div 
            className="absolute w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"
            style={{
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)'
            }}
          />
        </div>,
        document.body
      )}
    </>
  );
};

const BreakdownBar = ({ group, total, colors }) => (
  <div className="w-full h-2.5 flex gap-1 my-1 rounded-full overflow-hidden">
    {group.map((g, i) => (
      <div key={i} className="h-full" style={{
        width: `${total ? (g.val / total) * 100 : 0}%`,
        background: colors[i],
      }} />
    ))}
  </div>
);

const BreakdownDetails = ({ labels, values, colors }) => (
  <div className="flex flex-col gap-1 mt-1 w-full text-[11px]">
    {labels.map((label, i) => (
      <div key={i} className="flex items-center justify-between">
        <span className="flex items-center gap-1" style={{ color: 'var(--color-text-white)' }}>
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: colors[i] }} />
          {label}
        </span>
        <span style={{ color: 'var(--color-text-white)', opacity: 0.8 }}>{formatCurrency(values[i])}</span>
      </div>
    ))}
  </div>
);

const SummaryCard = ({ title, amount, gradient, breakdown, tooltipText }) => (
  <div
    className="w-full rounded-xl text-white border-none px-4 py-3 flex flex-col items-start justify-center box-border overflow-hidden shadow-lg transition-transform duration-200 hover:scale-102 hover:shadow-xl"
    style={{ background: gradient, minWidth: 0, maxWidth: '100%' }}
  >
    <div className="flex items-center w-full justify-between mb-2">
      <div className="flex items-center min-w-0">
        <span className="text-[13px] font-medium opacity-90 tracking-wide" style={{ color: 'var(--color-text-white)' }}>{title}</span>
        <TooltipIcon tooltipText={tooltipText} size={12} />
      </div>
      <span className="text-[16px] font-medium -tracking-[0.5px] flex-shrink-0 ml-2" style={{ color: 'var(--color-text-white)', opacity: 0.92 }}>
        {formatCurrency(amount)}
      </span>
    </div>

    {breakdown && (
      <>
        <BreakdownBar group={breakdown.values.map((val, i) => ({ val }))} total={breakdown.total} colors={breakdown.colors} />
        <BreakdownDetails labels={breakdown.labels} values={breakdown.values} colors={breakdown.colors} />
      </>
    )}
  </div>
);

const AccountsSummaryCard = ({ grouped = {} }) => {
  // Carousel state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const carouselRef = useRef(null);

  // Calculate totals and breakdowns
  // Safely access properties of 'grouped' by defaulting to empty arrays if undefined/null
  const assets = [...(grouped.cash || []), ...(grouped.investment || [])];
  const liabilities = [...(grouped.credit || []), ...(grouped.loan || [])];
  const assetTotal = assets.reduce((sum, a) => sum + getRawBalance(a), 0);
  const liabilityTotal = liabilities.reduce((sum, a) => sum + getRawBalance(a), 0);
  const netWorth = assetTotal - liabilityTotal;

  const cashTotal = (grouped.cash || []).reduce((sum, a) => sum + getRawBalance(a), 0);
  const investmentTotal = (grouped.investment || []).reduce((sum, a) => sum + getRawBalance(a), 0);
  const creditTotal = (grouped.credit || []).reduce((sum, a) => sum + getRawBalance(a), 0);
  const loanTotal = (grouped.loan || []).reduce((sum, a) => sum + getRawBalance(a), 0);

  // Data for the cards
  const cardsData = [
    {
      title: "Net Worth",
      amount: netWorth,
      gradient: "var(--color-gradient-networth)",
      breakdown: {
        labels: ['Assets', 'Liabilities'],
        values: [assetTotal, liabilityTotal],
        total: Math.max(assetTotal, liabilityTotal),
        colors: ['rgba(255,255,255,0.8)', 'rgba(255,255,255,0.4)']
      },
      tooltipText: "Net Worth = Assets - Liabilities. This is your total financial position.",
      refKey: "netWorth"
    },
    {
      title: "Assets",
      amount: assetTotal,
      gradient: "var(--color-gradient-assets)",
      breakdown: {
        labels: ['Cash', 'Investments'],
        values: [cashTotal, investmentTotal],
        total: assetTotal,
        colors: ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.5)']
      },
      tooltipText: "Assets are the total value of your cash and investments.",
      refKey: "assets"
    },
    {
      title: "Liabilities",
      amount: liabilityTotal,
      gradient: "var(--color-gradient-liabilities)",
      breakdown: {
        labels: ['Credit', 'Loans'],
        values: [creditTotal, loanTotal],
        total: liabilityTotal,
        colors: ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.5)']
      },
      tooltipText: "Liabilities are the total amount you owe, such as credit cards and loans.",
      refKey: "liabilities"
    }
  ];

  // Carousel handlers
  const handleTouchStart = (e) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
    setCurrentX(e.touches[0].clientX);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    
    const newX = e.touches[0].clientX;
    setCurrentX(newX);
    
    const deltaX = newX - startX;
    setTranslateX(deltaX);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    const deltaX = currentX - startX;
    const threshold = 50; // Minimum swipe distance
    
    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0 && currentIndex > 0) {
        // Swipe right - go to previous
        setCurrentIndex(currentIndex - 1);
      } else if (deltaX < 0 && currentIndex < cardsData.length - 1) {
        // Swipe left - go to next
        setCurrentIndex(currentIndex + 1);
      }
    }
    
    // Reset translate
    setTranslateX(0);
  };

  // Reset translate when currentIndex changes
  useEffect(() => {
    setTranslateX(0);
  }, [currentIndex]);

  return (
    // Main container for the accounts summary cards.
    // max-w-[700px] ensures it doesn't get too wide on large screens.
    // mx-auto centers it horizontally.
    <div className="w-full max-w-[700px] mx-auto mb-6 mt-2">
      {/* Desktop Layout: Cards displayed in a row with gap */}
      {/* Hidden on small screens (sm:hidden) */}
      <div className="hidden sm:flex flex-row gap-3">
        {cardsData.map((card, index) => (
          <SummaryCard
            key={index}
            title={card.title}
            amount={card.amount}
            gradient={card.gradient}
            breakdown={card.breakdown}
            tooltipText={card.tooltipText}
          />
        ))}
      </div>

      {/* Mobile Carousel Layout: Single card with slide animation */}
      {/* Visible only on small screens (sm:hidden) */}
      <div className="sm:hidden overflow-hidden">
        <div 
          ref={carouselRef}
          className="w-full flex justify-center transition-transform duration-300 ease-out"
          style={{ transform: `translateX(${translateX}px)` }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-full max-w-sm">
            <SummaryCard
              title={cardsData[currentIndex].title}
              amount={cardsData[currentIndex].amount}
              gradient={cardsData[currentIndex].gradient}
              breakdown={cardsData[currentIndex].breakdown}
              tooltipText={cardsData[currentIndex].tooltipText}
            />
          </div>
        </div>

        {/* Carousel Indicators */}
        <div className="flex justify-center gap-2 mt-3">
          {cardsData.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                currentIndex === index
                  ? 'bg-blue-500 w-6' // Active indicator is wider and blue
                  : 'bg-gray-300'    // Inactive indicator is smaller and gray
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AccountsSummaryCard;
