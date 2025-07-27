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
        const categoryId = transaction.category_id;
        
        if (!categorySpending[categoryName]) {
          categorySpending[categoryName] = {
            value: 0,
            icon_lib: transaction.category_icon_lib,
            icon_name: transaction.category_icon_name,
            color: transaction.category_color,
            category_id: categoryId
          };
        }
        
        categorySpending[categoryName].value += Math.abs(transaction.amount);
      }
    });

    // Convert to array and sort by amount
    const sortedCategories = Object.entries(categorySpending)
      .map(([label, data]) => ({ 
        label, 
        value: data.value,
        icon_lib: data.icon_lib,
        icon_name: data.icon_name,
        color: data.color,
        category_id: data.category_id
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 categories

    // If no spending data, show mock data
    if (sortedCategories.length === 0) {
      return [
        { label: 'Food & Dining', value: 850, icon_lib: 'fa', icon_name: 'utensils', color: '#16a34a', category_id: 'mock-food' },
        { label: 'Transportation', value: 650, icon_lib: 'fa', icon_name: 'car', color: '#3b82f6', category_id: 'mock-transport' },
        { label: 'Shopping', value: 520, icon_lib: 'fa', icon_name: 'shopping-bag', color: '#8b5cf6', category_id: 'mock-shopping' },
        { label: 'Entertainment', value: 380, icon_lib: 'fa', icon_name: 'film', color: '#f59e0b', category_id: 'mock-entertainment' },
        { label: 'Utilities', value: 320, icon_lib: 'fa', icon_name: 'bolt', color: '#dc2626', category_id: 'mock-utilities' },
        { label: 'Healthcare', value: 280, icon_lib: 'fa', icon_name: 'heartbeat', color: '#ec4899', category_id: 'mock-healthcare' },
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
      <div className="flex items-center justify-center">
        <DonutChart 
          data={spendingByCategory}
        />
      </div>
    </div>
  );
} 