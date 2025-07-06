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

function AccountsPanel({ isMobile, maxWidth = 700 }) {
  const [plaidModalOpen, setPlaidModalOpen] = useState(false);
  const [plaidLoading, setPlaidLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('cash');
  const { accounts, loading, error, refreshAccounts, fetchTransactions, user, setToast } = useFinancial();
  const hasSetInitialTab = useRef(false);
  const [selectedCircleUser, setSelectedCircleUser] = useState('combined');
  // Mock circle users data
  const circleUsers = [
    { id: 'combined', name: 'Combined' },
    { id: 'user1', name: 'Alice' },
    { id: 'user2', name: 'Bob' },
    { id: 'user3', name: 'Charlie' },
  ];

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
    <main className="flex-1 px-[24px] overflow-y-auto overflow-x-hidden">
      <div
        className={`flex flex-col items-center ${
          allAccountsEmpty ? 'justify-center min-h-[calc(100vh-100px)]' : 'pt-[24px] pb-[24px]'
        }`}
      >
        {/* Circle User Toggle Row */}
        {!allAccountsEmpty && (
          <CircleUserToggle
            users={circleUsers}
            selectedUser={selectedCircleUser}
            onSelectUser={setSelectedCircleUser}
            onAddAccounts={handleAddAccounts}
            addLoading={plaidLoading}
          />
        )}
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)]">
            <Spinner size={28} />
          </div>
        ) : allAccountsEmpty ? (
          <div className="flex flex-col items-center justify-center text-center px-[20px]">
            <img
              src={noAccountsImage}
              alt="No Accounts"
              className="w-[240px] object-contain mb-[4px]"
            />
            <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#1f2937' }}>
              No Accounts Added
            </h2>
            <p
              style={{
                fontSize: '13px',
                color: '#6b7280',
                marginTop: '-4px',
                maxWidth: '260px',
              }}
            >
              Add your financial accounts to see your cash, credit, loans, and investments.
            </p>
            <div>
              <Button
                label="Add Accounts"
                onClick={handleAddAccounts}
                width="auto"
                loading={plaidLoading}
                disabled={plaidLoading}
                color="#7c3aed"
              />
            </div>
          </div>
        ) : (
          <>
            {/* Total Balance Banner */}
            {!allAccountsEmpty && (
              <div
                style={{
                  width: '100%',
                  maxWidth: maxWidth,
                  margin: '0 0 20px 0',
                  padding: '16px 20px',
                  borderRadius: 12,
                  background: 'linear-gradient(90deg, #6366f1 0%, #60a5fa 100%)',
                  color: '#fff',
                  boxShadow: '0 2px 12px 0 rgba(59,130,246,0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 500, opacity: 0.92, letterSpacing: 0.2, marginBottom: 2 }}>Total Balance</span>
                <span style={{ fontSize: 28, fontWeight: 700, marginTop: 0, letterSpacing: -0.5, textShadow: '0 1px 4px rgba(59,130,246,0.10)' }}>
                  {formatCurrency(totalBalance)}
                </span>
              </div>
            )}

            {/* Tabs + Add Button */}
            <div
              style={{
                width: '100%',
                maxWidth: maxWidth,
                padding: '0 20px',
                marginBottom: '8px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: isMobile ? 'nowrap' : 'wrap',
                  gap: 8,
                  marginBottom: '12px',
                }}
              >
                <div style={{ flexGrow: 1, overflowX: 'auto' }}>
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
              <div style={{ minHeight: '200px' }}>
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
