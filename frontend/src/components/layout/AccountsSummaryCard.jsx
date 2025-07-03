import React from 'react';
import { FiBarChart2 } from 'react-icons/fi';
import { Card } from '../ui';
import { formatCurrency } from '../../utils/formatters';
import { getTotal } from './accountsUtils';

const AccountsSummaryCard = ({ grouped, isMobile }) => {
  if (!grouped) return null;

  const assets = [...(grouped.cash || []), ...(grouped.investment || [])];
  const liabilities = [...(grouped.credit || []), ...(grouped.loan || [])];
  const assetTotal = getTotal(assets);
  const liabilityTotal = getTotal(liabilities);
  const netWorth = assetTotal + liabilityTotal;

  return (
    <Card className="w-full p-0 overflow-hidden shadow-sm rounded-xl border border-gray-100">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: isMobile ? '10px 16px' : '12px 20px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3b82f6',
            }}
          >
            <FiBarChart2 size={16} />
          </div>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#1f2937' }}>Net Worth</h2>
        </div>
        <div
          style={{
            fontSize: isMobile ? 14 : 16,
            fontWeight: 600,
            color: '#1f2937',
          }}
        >
          {formatCurrency(netWorth)}
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          padding: isMobile ? 16 : 20,
          gap: isMobile ? 24 : 0,
        }}
      >
        {/* Assets */}
        <div style={{ flex: 1, marginRight: isMobile ? 0 : 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: '#6b7280' }}>Assets</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#1f2937' }}>
              {formatCurrency(assetTotal)}
            </span>
          </div>

          {/* Breakdown Bar */}
          <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', marginBottom: 12, gap: 2 }}>
            {getTotal(grouped?.cash || []) > 0 && (
              <div
                style={{
                  flex: getTotal(grouped?.cash || []) / assetTotal,
                  backgroundColor: 'var(--color-breakdown-cash)',
                  borderRadius: 4,
                }}
              />
            )}
            {getTotal(grouped?.investment || []) > 0 && (
              <div
                style={{
                  flex: getTotal(grouped?.investment || []) / assetTotal,
                  backgroundColor: 'var(--color-breakdown-investment)',
                  borderRadius: 4,
                }}
              />
            )}
          </div>

          {/* Breakdown Legend */}
          <div style={{ fontSize: 12, color: '#374151', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <BreakdownRow label="Cash" color="var(--color-breakdown-cash)" amount={getTotal(grouped?.cash || [])} />
            <BreakdownRow label="Investments" color="var(--color-breakdown-investment)" amount={getTotal(grouped?.investment || [])} />
          </div>
        </div>

        {/* Liabilities */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: '#6b7280' }}>Liabilities</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#1f2937' }}>
              {formatCurrency(liabilityTotal)}
            </span>
          </div>

          {/* Breakdown Bar */}
          <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', marginBottom: 12, gap: 2 }}>
            {Math.abs(getTotal(grouped?.credit || [])) > 0 && (
              <div
                style={{
                  flex: Math.abs(getTotal(grouped?.credit || [])) / Math.abs(liabilityTotal),
                  backgroundColor: 'var(--color-breakdown-credit)',
                  borderRadius: 4,
                }}
              />
            )}
            {Math.abs(getTotal(grouped?.loan || [])) > 0 && (
              <div
                style={{
                  flex: Math.abs(getTotal(grouped?.loan || [])) / Math.abs(liabilityTotal),
                  backgroundColor: 'var(--color-breakdown-loan)',
                  borderRadius: 4,
                }}
              />
            )}
          </div>

          {/* Breakdown Legend */}
          <div style={{ fontSize: 12, color: '#374151', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <BreakdownRow label="Credit Cards" color="var(--color-breakdown-credit)" amount={getTotal(grouped?.credit || [])} />
            <BreakdownRow label="Loans" color="var(--color-breakdown-loan)" amount={getTotal(grouped?.loan || [])} />
          </div>
        </div>
      </div>
    </Card>
  );
};

const BreakdownRow = ({ label, color, amount }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: color,
        display: 'inline-block'
      }} />
      <span>{label}</span>
    </div>
    <span>{formatCurrency(amount)}</span>
  </div>
);

export default AccountsSummaryCard;
