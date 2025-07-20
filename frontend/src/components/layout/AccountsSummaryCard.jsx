import React, { useRef, useState } from 'react';
import { FaChartLine, FaCreditCard } from 'react-icons/fa6';
import { IoMdCash } from 'react-icons/io';
import { FiInfo } from 'react-icons/fi';
import InfoBubble from '../ui/InfoBubble';
import { formatCurrency } from '../../utils/formatters';
import { getRawBalance } from './accountsUtils';

const TooltipIcon = ({ refObj, show, setShow, timeoutRef, size = 14 }) => (
  <div
    ref={refObj}
    className="ml-2 cursor-default opacity-80 hover:opacity-100 p-1 rounded-full transition bg-transparent flex items-center"
    onMouseEnter={() => { clearTimeout(timeoutRef.current); setShow(true); }}
    onMouseLeave={() => { timeoutRef.current = setTimeout(() => setShow(false), 120); }}
    onFocus={() => setShow(true)}
    onBlur={() => setShow(false)}
    tabIndex={0}
    style={{ minWidth: size, minHeight: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
  >
    <FiInfo size={size - 2} style={{ color: 'var(--color-text-white)', opacity: 0.8 }} />
  </div>
);

const BreakdownBar = ({ group, total, colors }) => (
  <div className="w-full h-2.5 flex gap-1 my-1">
    {group.map((g, i) => (
      <div key={i} className="rounded-full" style={{
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

const AccountsSummaryCard = ({ grouped }) => {
  const [activeTab, setActiveTab] = useState('assets');
  const refs = {
    netWorth: useRef(), assets: useRef(), liabilities: useRef(),
    mobAssets: useRef(), mobLiabilities: useRef()
  };
  const timeouts = {
    netWorth: useRef(), assets: useRef(), liabilities: useRef(),
    mobAssets: useRef(), mobLiabilities: useRef()
  };
  const [visible, setVisible] = useState({
    netWorth: false, assets: false, liabilities: false, mobAssets: false, mobLiabilities: false
  });

  const assets = [...(grouped.cash || []), ...(grouped.investment || [])];
  const liabilities = [...(grouped.credit || []), ...(grouped.loan || [])];
  const assetTotal = assets.reduce((sum, a) => sum + getRawBalance(a), 0);
  const liabilityTotal = liabilities.reduce((sum, a) => sum + getRawBalance(a), 0);
  const netWorth = assetTotal - liabilityTotal;

  const mobileTabs = [
    { key: 'assets', label: 'Assets', icon: <IoMdCash size={14} />, color: '#ffffff' },
    { key: 'liabilities', label: 'Liabilities', icon: <FaCreditCard size={14} />, color: '#ffffff' },
  ];

  const barColors = ['rgba(255,255,255,0.65)', 'rgba(255,255,255,0.38)'];

  const renderBreakdown = (type, mobile = false) => {
    const isAssets = type === 'assets';
    const group = isAssets ? ['cash', 'investment'] : ['credit', 'loan'];
    const total = isAssets ? assetTotal : liabilityTotal;
    const values = group.map(k => grouped[k]?.reduce((sum, a) => sum + getRawBalance(a), 0) || 0);
    const labels = isAssets ? ['Cash', 'Investments'] : ['Credit', 'Loans'];
    const title = isAssets ? 'Assets' : 'Liabilities';
    const icon = isAssets ? 
      <IoMdCash size={16} className="mr-1" style={{ color: 'var(--color-text-white)', opacity: 0.85 }} /> : 
      <FaCreditCard size={16} className="mr-1" style={{ color: 'var(--color-text-white)', opacity: 0.85 }} />;
    const refKey = mobile ? (isAssets ? 'mobAssets' : 'mobLiabilities') : type;
    const bubbleText = isAssets
      ? 'Assets are the total value of your cash and investments.'
      : 'Liabilities are the total amount you owe, such as credit cards and loans.';

    return (
      <div className="flex flex-col items-start w-full">
        <div className="flex items-center justify-between w-full mb-1">
          <div className="flex items-center text-[13px] font-medium" style={{ color: 'var(--color-text-white)' }}>
            {icon}
            <span>{title}</span>
            <TooltipIcon
              refObj={refs[refKey]}
              setShow={v => setVisible(prev => ({ ...prev, [refKey]: v }))}
              timeoutRef={timeouts[refKey]}
              size={14}
            />
          </div>
          <span className="text-[14px] font-medium" style={{ color: 'var(--color-text-white)', opacity: 0.92 }}>
            {formatCurrency(total)}
          </span>
        </div>
        <BreakdownBar group={values.map((val, i) => ({ val }))} total={total} colors={barColors} />
        <BreakdownDetails labels={labels} values={values} colors={barColors} />
        <InfoBubble visible={visible[refKey]} anchorRef={refs[refKey]} position="bottom" center>{bubbleText}</InfoBubble>
      </div>
    );
  };

  return (
    <div className="w-full max-w-[700px] mx-auto rounded-xl text-white border-none px-5 py-6 flex flex-col items-start justify-center box-border overflow-hidden shadow-lg transition-transform duration-200 hover:scale-102 hover:shadow-xl mb-6 mt-2" style={{ background: 'var(--color-gradient-primary)' }}>
      <div className="flex items-center w-full justify-between">
        <div className="flex items-center">
          <FaChartLine size={20} className="mr-2" style={{ color: 'var(--color-text-white)', opacity: 0.92 }} />
          <span className="text-[15px] font-medium opacity-90 tracking-wide" style={{ color: 'var(--color-text-white)' }}>Net Worth</span>
          <TooltipIcon refObj={refs.netWorth} setShow={v => setVisible(p => ({ ...p, netWorth: v }))} timeoutRef={timeouts.netWorth} />
          <InfoBubble visible={visible.netWorth} anchorRef={refs.netWorth} position="bottom" center>
            Net Worth = Assets + Liabilities. This is your total financial position.
          </InfoBubble>
        </div>
        <span className="text-[20px] font-medium -tracking-[0.5px]" style={{ color: 'var(--color-text-white)', opacity: 0.92 }}>{formatCurrency(netWorth)}</span>
      </div>

      {/* Mobile Tabs */}
      <div className="sm:hidden flex w-full mt-4 relative">
        {mobileTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 py-2 text-center text-[13px] font-medium transition-colors"
            style={{ 
              color: 'var(--color-text-white)',
              opacity: activeTab === tab.key ? 1 : 0.6 
            }}
          >
            <div className="flex items-center justify-center gap-1">
              <div style={{ color: 'var(--color-text-white)' }}>{tab.icon}</div>
              <span>{tab.label}</span>
            </div>
          </button>
        ))}
        <div className="absolute bottom-0 h-0.5 transition-all duration-300 ease-in-out" style={{ width: '50%', left: activeTab === 'assets' ? '0%' : '50%', background: '#fff' }} />
      </div>

      {/* Mobile Content */}
      <div className="sm:hidden w-full mt-4">{renderBreakdown(activeTab, true)}</div>

      {/* Desktop Content */}
      <div className="hidden sm:flex gap-4 mt-2 w-full">
        {renderBreakdown('assets')}
        {renderBreakdown('liabilities')}
      </div>
    </div>
  );
};

export default AccountsSummaryCard;
