import React, { useContext, useMemo } from 'react';
import { FinancialContext } from '../../contexts/FinancialContext';
import { Card, Spinner, Pill } from '../ui';
import { DonutChart } from '../charts';
import { FaChartLine, FaWallet, FaExchangeAlt } from 'react-icons/fa';
import { formatCurrency, formatPercentage } from '../../utils/formatters';

export default function DashboardPanel({ isMobile, maxWidth, circleUsers }) {
  const { accounts, transactions, loading } = useContext(FinancialContext);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    // Calculate assets (positive balances from deposit accounts, investment accounts, etc.)
    const assets = accounts.reduce((sum, account) => {
      const balance = account.balances?.current || 0;
      const assetTypes = ['depository', 'investment', 'loan'];
      if (assetTypes.includes(account.type?.toLowerCase()) && balance > 0) {
        return sum + balance;
      }
      return sum;
    }, 0);

    // Calculate liabilities (negative balances and credit accounts)
    const liabilities = accounts.reduce((sum, account) => {
      const balance = account.balances?.current || 0;
      if (account.type?.toLowerCase() === 'credit' || balance < 0) {
        return sum + Math.abs(balance);
      }
      return sum;
    }, 0);

    // Net worth = assets - liabilities
    const netWorth = assets - liabilities;

    // Mock percentage changes for now (replace with real data if available)
    const netWorthChange = 2.4;
    const assetsChange = 3.1;
    const liabilitiesChange = -0.8;

    return {
      netWorth,
      assets,
      liabilities,
      netWorthChange,
      assetsChange,
      liabilitiesChange,
    };
  }, [accounts]);

  // Calculate spending by category
  const spendingByCategory = useMemo(() => {
    // Group transactions by category and sum amounts
    const categorySpending = {};
    
    transactions.forEach(transaction => {
      if (transaction.amount < 0) { // Only spending transactions
        const categoryName = transaction.category_name || 'Uncategorized';
        categorySpending[categoryName] = (categorySpending[categoryName] || 0) + Math.abs(transaction.amount);
      }
    });

    // Convert to array and sort by amount
    const sortedCategories = Object.entries(categorySpending)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 categories

    // If no spending data, show mock data
    if (sortedCategories.length === 0) {
      return [
        { label: 'Food & Dining', value: 850 },
        { label: 'Transportation', value: 650 },
        { label: 'Shopping', value: 520 },
        { label: 'Entertainment', value: 380 },
        { label: 'Utilities', value: 320 },
        { label: 'Healthcare', value: 280 },
      ];
    }

    return sortedCategories;
  }, [transactions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-full mx-auto px-4 py-6" style={{ maxWidth: maxWidth }}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Net Worth Card */}
        <div
          className="rounded-xl flex flex-col items-start justify-center p-5 shadow-sm"
          style={{ background: 'var(--color-bg-secondary)', minHeight: 110 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <FaWallet size={18} style={{ color: 'var(--color-text-muted)' }} />
            <span className="text-[13px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
              Net Worth
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-[22px]" style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
              {formatCurrency(summaryStats.netWorth)}
            </div>
            <Pill
              value={summaryStats.netWorthChange}
              isPositive={summaryStats.netWorthChange > 0}
              isZero={summaryStats.netWorthChange === 0}
              type="percentage"
            />
          </div>
        </div>

        {/* Assets Card */}
        <div
          className="rounded-xl flex flex-col items-start justify-center p-5 shadow-sm"
          style={{ background: 'var(--color-bg-secondary)', minHeight: 110 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <FaChartLine size={18} style={{ color: 'var(--color-text-muted)' }} />
            <span className="text-[13px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
              Assets
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-[22px]" style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
              {formatCurrency(summaryStats.assets)}
            </div>
            <Pill
              value={summaryStats.assetsChange}
              isPositive={summaryStats.assetsChange > 0}
              isZero={summaryStats.assetsChange === 0}
              type="percentage"
            />
          </div>
        </div>

        {/* Liabilities Card */}
        <div
          className="rounded-xl flex flex-col items-start justify-center p-5 shadow-sm"
          style={{ background: 'var(--color-bg-secondary)', minHeight: 110 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <FaExchangeAlt size={18} style={{ color: 'var(--color-text-muted)' }} />
            <span className="text-[13px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
              Liabilities
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-[22px]" style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
              {formatCurrency(summaryStats.liabilities)}
            </div>
            <Pill
              value={summaryStats.liabilitiesChange}
              isPositive={summaryStats.liabilitiesChange > 0}
              isZero={summaryStats.liabilitiesChange === 0}
              type="percentage"
            />
          </div>
        </div>
      </div>

      {/* Spending by Category Chart */}
      <div className="mt-12">
        <div
          className="rounded-xl p-6 shadow-sm"
          style={{ background: 'var(--color-bg-secondary)' }}
        >
          <DonutChart 
            data={spendingByCategory}
            title="Spending by Category"
          />
        </div>
      </div>
    </div>
  );
} 