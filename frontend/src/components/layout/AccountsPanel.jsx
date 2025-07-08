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

function AccountsPanel({ isMobile, maxWidth = 700, circleUsers }) {
  const [plaidModalOpen, setPlaidModalOpen] = useState(false);
  const [plaidLoading, setPlaidLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('cash');
  const { accounts, loading, error, refreshAccounts, fetchTransactions, user, setToast } = useFinancial();
  const hasSetInitialTab = useRef(false);
  const [selectedCircleUser, setSelectedCircleUser] = useState(user?.id || 'combined');

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

  return (
    <main className="w-full px-3 pt-8">
      <div className={`flex flex-col items-center ${allAccountsEmpty ? 'justify-center min-h-[calc(100vh-100px)]' : ''} w-full box-border ${allAccountsEmpty ? 'px-3' : ''}`}>
        {/* Circle User Toggle Row */}
        {!allAccountsEmpty && (
          <div className="w-full max-w-[700px] mb-4 flex items-center justify-between gap-3">
            <CircleUserToggle
              users={circleUsers}
              selectedUser={selectedCircleUser}
              onSelectUser={setSelectedCircleUser}
            />
            <Button
              label="Add Accounts"
              onClick={handleAddAccounts}
              width="auto"
              loading={plaidLoading}
              disabled={plaidLoading}
              color="#3b82f6"
            />
          </div>
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
            <div>
              <Button
                label="Add Accounts"
                onClick={handleAddAccounts}
                width="auto"
                loading={plaidLoading}
                disabled={plaidLoading}
                color="#3b82f6"
              />
            </div>
          </div>
        ) : (
          <>
            {/* Net Worth Banner */}
            {!allAccountsEmpty && (
              <div className="w-full max-w-[700px] mx-auto flex flex-row flex-wrap gap-4 mb-6 box-border px-1">
                {/* Net Worth Card */}
                <div className="flex-1 min-w-[220px] max-w-[400px] rounded-xl bg-gradient-to-tr from-blue-500 to-blue-300 text-white border-none px-5 py-4 flex flex-col items-start justify-center box-border overflow-hidden shadow-lg transition-transform duration-200 hover:scale-102 hover:shadow-xl">
                  <span className="text-[13px] font-medium opacity-90 tracking-wide mb-1">Net Worth</span>
                  <span className="text-[22px] font-bold mt-0 -tracking-[0.5px] drop-shadow">{formatCurrency(totalBalance)}</span>
                </div>
                {/* Total Assets Card */}
                <div className="flex-1 min-w-[220px] max-w-[400px] rounded-xl bg-gradient-to-tr from-green-700 to-green-500 text-white border border-gray-200 px-5 py-4 flex flex-col items-start justify-center box-border overflow-hidden shadow-lg transition-transform duration-200 hover:scale-102 hover:shadow-xl">
                  <span className="text-[13px] font-medium opacity-90 tracking-wide mb-1">Total Assets</span>
                  <span className="text-[22px] font-bold mt-0 -tracking-[0.5px]">{formatCurrency(assetTotal)}</span>
                </div>
                {/* Total Liabilities Card */}
                <div className="flex-1 min-w-[220px] max-w-[400px] rounded-xl bg-gradient-to-tr from-red-700 to-red-500 text-white border border-gray-200 px-5 py-4 flex flex-col items-start justify-center box-border overflow-hidden shadow-lg transition-transform duration-200 hover:scale-102 hover:shadow-xl">
                  <span className="text-[13px] font-medium opacity-90 tracking-wide mb-1">Total Liabilities</span>
                  <span className="text-[22px] font-bold mt-0 -tracking-[0.5px]">{formatCurrency(liabilityTotal)}</span>
                </div>
              </div>
            )}
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
