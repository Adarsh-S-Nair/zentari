import React, { useRef, useState } from 'react';
import { FaChartLine, FaCreditCard } from 'react-icons/fa6';
import { IoMdCash } from 'react-icons/io';
import { FiInfo } from 'react-icons/fi';
import InfoBubble from '../ui/InfoBubble';
import { formatCurrency } from '../../utils/formatters';

const AccountsSummaryCard = ({ grouped }) => {
  const [showNetWorthInfo, setShowNetWorthInfo] = useState(false);
  const [showAssetsInfo, setShowAssetsInfo] = useState(false);
  const [showLiabilitiesInfo, setShowLiabilitiesInfo] = useState(false);
  const netWorthInfoRef = useRef(null);
  const assetsInfoRef = useRef(null);
  const liabilitiesInfoRef = useRef(null);
  const netWorthTimeout = useRef();
  const assetsTimeout = useRef();
  const liabilitiesTimeout = useRef();

  const handleShow = (setShow, timeoutRef) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShow(true);
  };
  const handleHide = (setShow, timeoutRef) => {
    timeoutRef.current = setTimeout(() => setShow(false), 120);
  };

  const assets = [...(grouped.cash || []), ...(grouped.investment || [])];
  const liabilities = [...(grouped.credit || []), ...(grouped.loan || [])];
  const assetTotal = assets.reduce((sum, a) => sum + (a.balances?.current || 0), 0);
  const liabilityTotal = liabilities.reduce((sum, a) => sum + (a.balances?.current || 0), 0);
  const totalBalance = assetTotal + liabilityTotal;

  return (
    <div className="w-full max-w-[700px] mx-auto rounded-xl text-white border-none px-5 py-6 flex flex-col items-start justify-center box-border overflow-hidden shadow-lg transition-transform duration-200 hover:scale-102 hover:shadow-xl mb-6 mt-2" style={{ background: 'var(--color-gradient-primary)' }}>
      <div className="flex items-center w-full mb-1 justify-between">
        <div className="flex items-center">
          <FaChartLine size={20} className="mr-2" style={{ color: 'var(--color-text-white)', opacity: 0.92 }} />
          <span className="text-[15px] font-medium opacity-90 tracking-wide" style={{ color: 'var(--color-text-white)' }}>Net Worth</span>
          <div
            ref={netWorthInfoRef}
            className="ml-2 cursor-default opacity-80 hover:opacity-100 p-1 rounded-full transition bg-transparent flex items-center"
            onMouseEnter={() => handleShow(setShowNetWorthInfo, netWorthTimeout)}
            onMouseLeave={() => handleHide(setShowNetWorthInfo, netWorthTimeout)}
            onFocus={() => handleShow(setShowNetWorthInfo, netWorthTimeout)}
            onBlur={() => handleHide(setShowNetWorthInfo, netWorthTimeout)}
            tabIndex={0}
            style={{ minWidth: 28, minHeight: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <FiInfo size={16} style={{ color: 'var(--color-text-white)', opacity: 0.85 }} />
          </div>
          <InfoBubble
            visible={showNetWorthInfo}
            anchorRef={netWorthInfoRef}
            position="bottom"
            center={true}
          >
            Net Worth = Assets + Liabilities. This is your total financial position.
          </InfoBubble>
        </div>
        <span className="text-[20px] font-medium -tracking-[0.5px] text-right" style={{ color: 'var(--color-text-white)', opacity: 0.92 }}>{formatCurrency(totalBalance)}</span>
      </div>
      {/* Responsive breakdown bars */}
      <div className="flex flex-col sm:flex-row w-full gap-4 mt-2">
        {/* Assets Breakdown */}
        <div className="flex-1 flex flex-col items-start">
          <div className="flex items-center w-full justify-between mb-1">
            <div className="flex items-center">
              <IoMdCash size={16} className="mr-1" style={{ color: 'var(--color-text-white)', opacity: 0.85 }} />
              <span className="text-[13px] font-medium opacity-80 tracking-wide" style={{ color: 'var(--color-text-white)' }}>Assets</span>
              <div
                ref={assetsInfoRef}
                className="ml-2 cursor-default opacity-80 hover:opacity-100 p-1 rounded-full transition bg-transparent flex items-center"
                onMouseEnter={() => handleShow(setShowAssetsInfo, assetsTimeout)}
                onMouseLeave={() => handleHide(setShowAssetsInfo, assetsTimeout)}
                onFocus={() => handleShow(setShowAssetsInfo, assetsTimeout)}
                onBlur={() => handleHide(setShowAssetsInfo, assetsTimeout)}
                tabIndex={0}
                style={{ minWidth: 24, minHeight: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <FiInfo size={14} style={{ color: 'var(--color-text-white)', opacity: 0.8 }} />
              </div>
              <InfoBubble
                visible={showAssetsInfo}
                anchorRef={assetsInfoRef}
                position="bottom"
                center={true}
              >
                Assets are the total value of your cash and investments.
              </InfoBubble>
            </div>
            <span className="text-[14px] font-medium" style={{ color: 'var(--color-text-white)', opacity: 0.92 }}>{formatCurrency(assetTotal)}</span>
          </div>
          <div className="w-full h-2.5 flex gap-1 my-1">
            <div
              className="rounded-full"
              style={{
                width: `${assetTotal > 0 ? (grouped.cash?.reduce((sum, a) => sum + (a.balances?.current || 0), 0) / assetTotal) * 100 : 0}%`,
                background: 'rgba(255,255,255,0.65)',
              }}
            />
            <div
              className="rounded-full"
              style={{
                width: `${assetTotal > 0 ? (grouped.investment?.reduce((sum, a) => sum + (a.balances?.current || 0), 0) / assetTotal) * 100 : 0}%`,
                background: 'rgba(255,255,255,0.38)',
              }}
            />
          </div>
          <div className="flex text-[11px] gap-3 mt-1">
            <span className="flex items-center gap-1" style={{ color: 'var(--color-text-white)' }}><span className="inline-block w-2 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.65)' }} />Cash</span>
            <span className="flex items-center gap-1" style={{ color: 'var(--color-text-white)' }}><span className="inline-block w-2 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.38)' }} />Investments</span>
          </div>
        </div>
        {/* Liabilities Breakdown */}
        <div className="flex-1 flex flex-col items-start">
          <div className="flex items-center w-full justify-between mb-1">
            <div className="flex items-center">
              <FaCreditCard size={16} className="mr-1" style={{ color: 'var(--color-text-white)', opacity: 0.85 }} />
              <span className="text-[13px] font-medium opacity-80 tracking-wide" style={{ color: 'var(--color-text-white)' }}>Liabilities</span>
              <div
                ref={liabilitiesInfoRef}
                className="ml-2 cursor-default opacity-80 hover:opacity-100 p-1 rounded-full transition bg-transparent flex items-center"
                onMouseEnter={() => handleShow(setShowLiabilitiesInfo, liabilitiesTimeout)}
                onMouseLeave={() => handleHide(setShowLiabilitiesInfo, liabilitiesTimeout)}
                onFocus={() => handleShow(setShowLiabilitiesInfo, liabilitiesTimeout)}
                onBlur={() => handleHide(setShowLiabilitiesInfo, liabilitiesTimeout)}
                tabIndex={0}
                style={{ minWidth: 24, minHeight: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <FiInfo size={14} style={{ color: 'var(--color-text-white)', opacity: 0.8 }} />
              </div>
              <InfoBubble
                visible={showLiabilitiesInfo}
                anchorRef={liabilitiesInfoRef}
                position="bottom"
                center={true}
              >
                Liabilities are the total amount you owe, such as credit cards and loans.
              </InfoBubble>
            </div>
            <span className="text-[14px] font-medium" style={{ color: 'var(--color-text-white)', opacity: 0.92 }}>{formatCurrency(liabilityTotal)}</span>
          </div>
          <div className="w-full h-2.5 flex gap-1 my-1">
            <div
              className="rounded-full"
              style={{
                width: `${liabilityTotal !== 0 ? (Math.abs(grouped.credit?.reduce((sum, a) => sum + (a.balances?.current || 0), 0)) / Math.abs(liabilityTotal)) * 100 : 0}%`,
                background: 'rgba(255,255,255,0.65)',
              }}
            />
            <div
              className="rounded-full"
              style={{
                width: `${liabilityTotal !== 0 ? (Math.abs(grouped.loan?.reduce((sum, a) => sum + (a.balances?.current || 0), 0)) / Math.abs(liabilityTotal)) * 100 : 0}%`,
                background: 'rgba(255,255,255,0.38)',
              }}
            />
          </div>
          <div className="flex text-[11px] gap-3 mt-1">
            <span className="flex items-center gap-1" style={{ color: 'var(--color-text-white)' }}><span className="inline-block w-2 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.65)' }} />Credit</span>
            <span className="flex items-center gap-1" style={{ color: 'var(--color-text-white)' }}><span className="inline-block w-2 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.38)' }} />Loans</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountsSummaryCard;
