import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { FinancialContext } from '../../contexts/FinancialContext';
import { AccountsSummaryCard, AccountsList, CircleUserToggle } from './';
import { Button, Spinner } from '../ui';
import { PlaidLinkModal } from '../modals';
import { groupAccountsByType, getRawBalance } from './accountsUtils';
import noAccountsImage from '../../assets/no-accounts.png';
import { FaCreditCard, FaChartLine } from 'react-icons/fa6';
import InfoBubble from '../ui/InfoBubble';

function AccountsPanel({ isMobile, maxWidth = 700, circleUsers }) {
  const navigate = useNavigate();
  const [plaidModalOpen, setPlaidModalOpen] = useState(false);
  const [plaidLoading, setPlaidLoading] = useState(false);
  const { accounts, loading, error, refreshAccounts, fetchTransactions, user, setToast } = useContext(FinancialContext);
  const [selectedCircleUser, setSelectedCircleUser] = useState(user?.id || 'combined');

  const grouped = groupAccountsByType(accounts || []) || {
    cash: [],
    credit: [],
    investment: [],
    loan: [],
  };

  useEffect(() => {
    if (user?.id) {
      setSelectedCircleUser(user.id);
    }
  }, [user]);

  const handlePlaidSuccess = () => {
    refreshAccounts();
    // Also refresh transactions since new accounts will have new transactions
    // Add a small delay to ensure the backend sync completes
    if (user) {
      setTimeout(() => {
        fetchTransactions(user.id);
      }, 2000); // 2 second delay
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
  const assetTotal = assets.reduce((sum, a) => sum + getRawBalance(a), 0);
  const liabilityTotal = liabilities.reduce((sum, a) => sum + getRawBalance(a), 0);
  const totalBalance = assetTotal + liabilityTotal;

  return (
    <>
      <main className="w-full max-w-full sm:max-w-[700px] mx-auto px-3 pt-4 box-border mb-4" style={{ background: 'var(--color-bg-primary)' }}>
        <div className={`flex flex-col items-center ${allAccountsEmpty ? 'justify-center min-h-[calc(100vh-100px)]' : ''} w-full box-border ${allAccountsEmpty ? 'px-3' : ''}`}>
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)]">
            <Spinner size={28} />
          </div>
        ) : allAccountsEmpty ? (
          <div className="flex flex-col items-center justify-center text-center px-5">
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
            <AccountsSummaryCard grouped={grouped} />
            {/* Grouped Accounts List */}
            <div className="w-full max-w-[700px] mx-auto box-border mb-4">
              <AccountsList grouped={grouped} />
            </div>
          </>
        )}
        </div>
      </main>
      <PlaidLinkModal
        isOpen={plaidModalOpen}
        onClose={handlePlaidClose}
        onSuccess={handlePlaidSuccess}
        onError={(error) => {
          setToast({ message: error, type: 'error' });
          setPlaidLoading(false);
        }}
      />
    </>
  );
}

export default AccountsPanel;
