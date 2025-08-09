import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { FinancialContext } from '../../contexts/FinancialContext';
import { AccountsList, CircleUserToggle } from './';
import { Button, Spinner, Container } from '../ui';
import { groupAccountsByType, getRawBalance } from './accountsUtils';
import noAccountsImage from '../../assets/no-accounts.png';
import { FaCreditCard, FaChartLine } from 'react-icons/fa6';
import InfoBubble from '../ui/InfoBubble';
import { useDrawer } from '../../App';
import AccountDetail from './AccountDetail';

function AccountsPanel({ 
  isMobile, 
  maxWidth = 700, 
  circleUsers,
  plaidModalOpen,
  setPlaidModalOpen,
  plaidLoading,
  setPlaidLoading,
  onPlaidSuccess,
  onPlaidClose
}) {
  const navigate = useNavigate();
  const { openDrawer } = useDrawer();
  const { accounts, loading, accountsUpdating, error, refreshAccounts, fetchTransactions, user, setToast } = useContext(FinancialContext);
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
    if (user) {
      fetchTransactions(user.id);
    }
    onPlaidSuccess();
  };

  const handlePlaidClose = () => {
    onPlaidClose();
  };

  const handleAddAccounts = () => {
    setPlaidLoading(true);
    setPlaidModalOpen(true);
  };

  const handleAccountClick = React.useCallback((account) => {
    const lastFour = account.mask ? String(account.mask).slice(-4) : '';
    const title = `${account.name}${lastFour ? ' ••••' + lastFour : ''}`;
    const AccountDetailWrapper = () => {
      const [isLoading, setIsLoading] = useState(true);
      React.useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 50);
        return () => clearTimeout(timer);
      }, []);
      if (isLoading) {
        return <Spinner label="Loading..." />;
      }
      return <AccountDetail account={account} />;
    };
    openDrawer({
      title,
      content: <AccountDetailWrapper />,
      onClose: () => {}
    });
  }, [openDrawer]);

  const allAccountsEmpty =
    !grouped?.cash?.length &&
    !grouped?.credit?.length &&
    !grouped?.investment?.length &&
    !grouped?.loan?.length;

  return (
    <>
      <main className="w-full mx-auto box-border mb-4" style={{ background: 'var(--color-bg-primary)' }}>
        {accountsUpdating && (
          <div className="fixed top-4 right-4 z-50">
            <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs flex items-center gap-2">
              <Spinner size={12} />
              <span>Updating...</span>
            </div>
          </div>
        )}
        
        <Container size="xl" className={`flex flex-col items-center ${allAccountsEmpty ? 'justify-center min-h-[calc(100vh-100px)]' : ''} w-full box-border ${allAccountsEmpty ? 'px-3' : ''} pt-4 md:pt-6`}>
        {loading && accounts.length === 0 ? (
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
            {/* Removed AccountsSummaryCard for a cleaner accounts page */}
            <div className="w-full mx-auto box-border mb-4">
              <AccountsList grouped={grouped} onAccountClick={handleAccountClick} />
            </div>
          </>
        )}
        </Container>
      </main>
    </>
  );
}

export default AccountsPanel;
