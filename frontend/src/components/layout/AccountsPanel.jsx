import React, { useState, useEffect, useRef } from 'react';
import { Button, Spinner } from '../ui';
import { PlaidLinkModal } from '../modals';
import { useFinancial } from '../../contexts/FinancialContext';
import AccountsSummaryCard from './AccountsSummaryCard';
import AccountsList from './AccountsList';
import Tabs from '../ui/Tabs';
import {
  getAccountTypeIcon,
  groupAccountsByType,
  getTotal,
  getActiveTabAccounts,
  getActiveTabLabel,
} from './accountsUtils';
import noAccountsImage from '../../assets/no-accounts.png';
import CircleUserToggle from './CircleUserToggle';
import { formatCurrency } from '../../utils/formatters';
import { FiInfo } from 'react-icons/fi';
import { IoMdCash } from 'react-icons/io';
import { FaCreditCard, FaChartLine } from 'react-icons/fa6';
import InfoBubble from '../ui/InfoBubble';
import PageToolbar from './PageToolbar';

function AccountsPanel({ isMobile, maxWidth = 700, circleUsers }) {
  const [plaidModalOpen, setPlaidModalOpen] = useState(false);
  const [plaidLoading, setPlaidLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('cash');
  const { accounts, loading, error, refreshAccounts, fetchTransactions, user, setToast } = useFinancial();
  const hasSetInitialTab = useRef(false);
  const [selectedCircleUser, setSelectedCircleUser] = useState(user?.id || 'combined');
  // InfoBubble state/refs for each card
  const [showNetWorthInfo, setShowNetWorthInfo] = useState(false);
  const [showAssetsInfo, setShowAssetsInfo] = useState(false);
  const [showLiabilitiesInfo, setShowLiabilitiesInfo] = useState(false);
  const netWorthInfoRef = useRef(null);
  const assetsInfoRef = useRef(null);
  const liabilitiesInfoRef = useRef(null);
  // Timeout refs for delayed hide
  const netWorthTimeout = useRef();
  const assetsTimeout = useRef();
  const liabilitiesTimeout = useRef();

  const grouped = groupAccountsByType(accounts || []) || {
    cash: [],
    credit: [],
    investment: [],
    loan: [],
  };

  useEffect(() => {
    if (accounts && accounts.length > 0 && grouped && !hasSetInitialTab.current) {
      if (grouped.cash?.length > 0) {
        setActiveTab('cash');
      } else if (grouped.credit?.length > 0) {
        setActiveTab('credit');
      } else if (grouped.investment?.length > 0) {
        setActiveTab('investment');
      } else if (grouped.loan?.length > 0) {
        setActiveTab('loan');
      }
      hasSetInitialTab.current = true;
    }
  }, [accounts, grouped]);

  useEffect(() => {
    if (user?.id) {
      setSelectedCircleUser(user.id);
    }
  }, [user]);

  const handlePlaidSuccess = () => {
    refreshAccounts();
    // Also refresh transactions since new accounts will have new transactions
    if (user) {
      fetchTransactions(user.id);
    }
    setPlaidModalOpen(false);
    setPlaidLoading(false);
    setToast({ message: 'Accounts added successfully!', type: 'success' });
  };

  const handlePlaidClose = () => {
    setPlaidModalOpen(false);
    setPlaidLoading(false);
  };

  const handleAddAccounts = () => {
    setPlaidLoading(true);
    setPlaidModalOpen(true);
  };

  const allAccountsEmpty =
    !grouped?.cash?.length &&
    !grouped?.credit?.length &&
    !grouped?.investment?.length &&
    !grouped?.loan?.length;

  // Calculate total balance (same as AccountsSummaryCard)
  const assets = [...(grouped.cash || []), ...(grouped.investment || [])];
  const liabilities = [...(grouped.credit || []), ...(grouped.loan || [])];
  const assetTotal = getTotal(assets);
  const liabilityTotal = getTotal(liabilities);
  const totalBalance = assetTotal + liabilityTotal;

  // Helper functions for hover with delay
  const handleShow = (setShow, timeoutRef) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShow(true);
  };
  const handleHide = (setShow, timeoutRef) => {
    timeoutRef.current = setTimeout(() => setShow(false), 120);
  };

  return (
    <main className="w-full px-3">
      <div className={`flex flex-col items-center ${allAccountsEmpty ? 'justify-center min-h-[calc(100vh-100px)]' : ''} w-full box-border ${allAccountsEmpty ? 'px-3' : ''}`}>
        {/* Circle User Toggle Row */}
        {!allAccountsEmpty && (
          <PageToolbar>
            <div className="max-w-[700px] mx-auto flex items-center justify-between gap-3 px-3">
              <CircleUserToggle
                users={circleUsers}
                selectedUser={selectedCircleUser}
                onSelectUser={setSelectedCircleUser}
              />
              <Button
                label="Add Accounts"
                onClick={handleAddAccounts}
                width="w-32"
                loading={plaidLoading}
                disabled={plaidLoading}
                className="h-8"
                color="networth"
              />
            </div>
          </PageToolbar>
        )}
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)]">
            <Spinner size={28} />
          </div>
        ) : allAccountsEmpty ? (
          <div className="flex flex-col items-center justify-center text-center px-5">
            <img src={noAccountsImage} alt="No Accounts" className="w-[240px] object-contain mb-1" />
            <h2 className="text-[15px] font-medium text-gray-800">No Accounts Added</h2>
            <p className="text-[13px] text-gray-500 mt-[-4px] max-w-[260px]">Add your financial accounts to see your cash, credit, loans, and investments.</p>
            <Button
              label="Add Accounts"
              onClick={handleAddAccounts}
              width="w-32"
              loading={plaidLoading}
              disabled={plaidLoading}
              className="h-8"
              color="networth"
            />
          </div>
        ) : (
          <>
            {/* Unified Net Worth Card with Breakdown Bars */}
            <div className="w-full max-w-[700px] mx-auto rounded-xl bg-gradient-to-r from-indigo-500 to-blue-400 text-white border-none px-5 py-6 flex flex-col items-start justify-center box-border overflow-hidden shadow-lg transition-transform duration-200 hover:scale-102 hover:shadow-xl mb-6 mt-2">
              <div className="flex items-center w-full mb-1 justify-between">
                <div className="flex items-center">
                  <FaChartLine size={20} className="mr-2" style={{ color: 'white', opacity: 0.92 }} />
                  <span className="text-[15px] font-medium opacity-90 tracking-wide text-white">Net Worth</span>
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
                    <FiInfo size={16} style={{ color: 'white', opacity: 0.85 }} />
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
                <span className="text-[20px] font-medium -tracking-[0.5px] text-white text-right" style={{ opacity: 0.92 }}>{formatCurrency(totalBalance)}</span>
              </div>
              {/* Responsive breakdown bars */}
              <div className="flex flex-col sm:flex-row w-full gap-4 mt-2">
                {/* Assets Breakdown */}
                <div className="flex-1 flex flex-col items-start">
                  <div className="flex items-center w-full justify-between mb-1">
                    <div className="flex items-center">
                      <IoMdCash size={16} className="mr-1" style={{ color: 'white', opacity: 0.85 }} />
                      <span className="text-[13px] font-medium opacity-80 tracking-wide text-white">Assets</span>
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
                        <FiInfo size={14} style={{ color: 'white', opacity: 0.8 }} />
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
                    <span className="text-[14px] font-medium text-white" style={{ opacity: 0.92 }}>{formatCurrency(assetTotal)}</span>
                  </div>
                  <div className="w-full h-2.5 flex gap-1 my-1">
                    <div
                      className="rounded-full"
                      style={{
                        width: `${assetTotal > 0 ? (getTotal(grouped.cash) / assetTotal) * 100 : 0}%`,
                        background: 'rgba(255,255,255,0.65)',
                      }}
                    />
                    <div
                      className="rounded-full"
                      style={{
                        width: `${assetTotal > 0 ? (getTotal(grouped.investment) / assetTotal) * 100 : 0}%`,
                        background: 'rgba(255,255,255,0.38)',
                      }}
                    />
                  </div>
                  <div className="flex text-[11px] gap-3 mt-1">
                    <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.65)' }} />Cash</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.38)' }} />Investments</span>
                  </div>
                </div>
                {/* Liabilities Breakdown */}
                <div className="flex-1 flex flex-col items-start">
                  <div className="flex items-center w-full justify-between mb-1">
                    <div className="flex items-center">
                      <FaCreditCard size={16} className="mr-1" style={{ color: 'white', opacity: 0.85 }} />
                      <span className="text-[13px] font-medium opacity-80 tracking-wide text-white">Liabilities</span>
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
                        <FiInfo size={14} style={{ color: 'white', opacity: 0.8 }} />
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
                    <span className="text-[14px] font-medium text-white" style={{ opacity: 0.92 }}>{formatCurrency(liabilityTotal)}</span>
                  </div>
                  <div className="w-full h-2.5 flex gap-1 my-1">
                    <div
                      className="rounded-full"
                      style={{
                        width: `${liabilityTotal !== 0 ? (Math.abs(getTotal(grouped.credit)) / Math.abs(liabilityTotal)) * 100 : 0}%`,
                        background: 'rgba(255,255,255,0.65)',
                      }}
                    />
                    <div
                      className="rounded-full"
                      style={{
                        width: `${liabilityTotal !== 0 ? (Math.abs(getTotal(grouped.loan)) / Math.abs(liabilityTotal)) * 100 : 0}%`,
                        background: 'rgba(255,255,255,0.38)',
                      }}
                    />
                  </div>
                  <div className="flex text-[11px] gap-3 mt-1">
                    <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.65)' }} />Credit</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.38)' }} />Loans</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Tabs + Add Button */}
            <div className="w-full max-w-[700px] mx-auto box-border px-1 mb-4">
              <div className="flex justify-between items-center flex-wrap gap-2 mb-3">
                <div className="flex-grow overflow-x-auto">
                  <Tabs
                    tabs={[
                      grouped.cash?.length > 0 && {
                        id: 'cash',
                        label: 'Cash',
                        count: grouped.cash.length,
                      },
                      grouped.credit?.length > 0 && {
                        id: 'credit',
                        label: 'Credit',
                        count: grouped.credit.length,
                      },
                      grouped.investment?.length > 0 && {
                        id: 'investment',
                        label: 'Investments',
                        count: grouped.investment.length,
                      },
                      grouped.loan?.length > 0 && {
                        id: 'loan',
                        label: 'Loans',
                        count: grouped.loan.length,
                      },
                    ].filter(Boolean)}
                    activeId={activeTab}
                    onChange={setActiveTab}
                  />
                </div>
              </div>
              {/* Account Content */}
              <div className="min-h-[200px]">
                <AccountsList
                  accounts={getActiveTabAccounts(grouped, activeTab)}
                  activeTab={activeTab}
                  getAccountTypeIcon={getAccountTypeIcon}
                  getTotal={getTotal}
                />
              </div>
            </div>
          </>
        )}
      </div>
      <PlaidLinkModal
        isOpen={plaidModalOpen}
        onClose={handlePlaidClose}
        onSuccess={handlePlaidSuccess}
        onError={(error) => {
          setToast({ message: error, type: 'error' });
          setPlaidLoading(false);
        }}
      />
    </main>
  );
}

export default AccountsPanel;
