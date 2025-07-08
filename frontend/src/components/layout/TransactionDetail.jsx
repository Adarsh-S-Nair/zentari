import React from 'react';
import { formatCurrency } from '../../utils/formatters';

const TransactionDetail = ({ maxWidth = 700, transaction }) => {
  if (!transaction) {
    return (
      <div className="w-full flex items-center justify-center min-h-[300px] text-gray-500 text-lg">
        Transaction not found.
      </div>
    );
  }

  return (
    <div className="w-full mx-auto max-w-full sm:max-w-[700px] px-4 py-8">
      <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          {transaction.icon_url ? (
            <img src={transaction.icon_url} alt="icon" className="w-14 h-14 rounded-full object-cover border border-gray-200" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-2xl font-bold">
              {transaction.description?.[0] || '?'}
            </div>
          )}
          <div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{transaction.description}</div>
            <div className="text-sm text-gray-500">{new Date(transaction.date).toLocaleDateString()}</div>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-2">
          <div className="text-lg font-semibold text-gray-700">Amount:</div>
          <div className={`text-xl font-bold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(transaction.amount)}</div>
        </div>
        <div className="flex flex-wrap gap-4 mt-2">
          {transaction.category_name && (
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full" style={{ background: transaction.category_color || '#6366f1' }} />
              <span className="text-sm text-slate-600 font-medium">{transaction.category_name}</span>
            </div>
          )}
          {transaction.accounts?.name && (
            <div className="text-sm text-slate-600 font-medium">Account: {transaction.accounts.name}</div>
          )}
          {transaction.subtype && (
            <div className="text-sm text-slate-600 font-medium">Type: {transaction.subtype}</div>
          )}
        </div>
        {transaction.notes && (
          <div className="mt-2 text-sm text-gray-500">{transaction.notes}</div>
        )}
        <div className="mt-4 text-xs text-gray-400">Transaction ID: {transaction.id}</div>
      </div>
    </div>
  );
};

export default TransactionDetail; 