import React, { useState } from 'react'
import { Button } from '../ui'
import { PlaidLinkModal } from '../modals'
import { useFinancial } from '../../contexts/FinancialContext'
import AccountsSummaryCard from './AccountsSummaryCard'
import AccountsList from './AccountsList'
import Tabs from '../ui/Tabs'
import AccountsTabs from './AccountsTabs'
import {
  getAccountTypeIcon,
  groupAccountsByType,
  getTotal,
  getActiveTabAccounts,
  getActiveTabLabel
} from './accountsUtils'

function AccountsPanel() {
  const [plaidModalOpen, setPlaidModalOpen] = useState(false)
  const [plaidLoading, setPlaidLoading] = useState(false)
  const [plaidError, setPlaidError] = useState(null)
  const [activeTab, setActiveTab] = useState('cash')
  const { accounts, loading, error, refreshAccounts } = useFinancial()
  const hasSetInitialTab = React.useRef(false)

  const grouped = groupAccountsByType(accounts || []) || {
    cash: [],
    credit: [],
    investment: [],
    loan: []
  }

  React.useEffect(() => {
    if (accounts && accounts.length > 0 && grouped && !hasSetInitialTab.current) {
      if (grouped.cash?.length > 0) {
        setActiveTab('cash')
      } else if (grouped.credit?.length > 0) {
        setActiveTab('credit')
      } else if (grouped.investment?.length > 0) {
        setActiveTab('investment')
      } else if (grouped.loan?.length > 0) {
        setActiveTab('loan')
      }
      hasSetInitialTab.current = true
    }
  }, [accounts, grouped])

  const handlePlaidSuccess = () => {
    refreshAccounts()
    setPlaidModalOpen(false)
    setPlaidError(null)
    setPlaidLoading(false)
  }

  const handlePlaidClose = () => {
    setPlaidModalOpen(false)
    setPlaidError(null)
    setPlaidLoading(false)
  }

  const handleAddAccounts = () => {
    setPlaidError(null)
    setPlaidLoading(true)
    setPlaidModalOpen(true)
  }

  const renderActiveTabContent = () => {
    if (!grouped) {
      return (
        <div style={{
          textAlign: 'center',
          color: '#6b7280',
          fontSize: '14px',
          fontStyle: 'italic',
          padding: '40px 20px'
        }}>
          Loading accounts...
        </div>
      )
    }

    const accounts = getActiveTabAccounts(grouped, activeTab)
    const label = getActiveTabLabel(activeTab)

    if (accounts.length === 0) {
      return (
        <div style={{
          textAlign: 'center',
          color: '#6b7280',
          fontSize: '14px',
          fontStyle: 'italic',
          padding: '40px 20px'
        }}>
          No {label.toLowerCase()} accounts found.
        </div>
      )
    }

    return (
      <AccountsList
        accounts={accounts}
        activeTab={activeTab}
        getAccountTypeIcon={getAccountTypeIcon}
        getTotal={getTotal}
      />
    )
  }

  const renderSummaryCard = () => {
    return <AccountsSummaryCard grouped={grouped} />
  }

  return (
    <main className="flex-1 px-[24px] overflow-y-auto overflow-x-hidden">
      <div className="flex flex-col pt-[24px] items-center">

        {/* Summary Card */}
        {(grouped?.cash?.length > 0 || grouped?.credit?.length > 0 || grouped?.investment?.length > 0 || grouped?.loan?.length > 0) && (
          <div style={{
            width: '100%',
            maxWidth: '700px',
            padding: '0 20px',
            marginBottom: '20px'
          }}>
            {renderSummaryCard()}
          </div>
        )}

        {/* Tabs + Add Button */}
        {(grouped?.cash?.length > 0 || grouped?.credit?.length > 0 || grouped?.investment?.length > 0 || grouped?.loan?.length > 0) && (
          <div style={{
            width: '100%',
            maxWidth: '700px',
            padding: '0 20px',
            marginBottom: '8px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <Tabs
                tabs={[
                  grouped.cash?.length > 0 && { id: 'cash', label: 'Cash', count: grouped.cash.length },
                  grouped.credit?.length > 0 && { id: 'credit', label: 'Credit', count: grouped.credit.length },
                  grouped.investment?.length > 0 && { id: 'investment', label: 'Investments', count: grouped.investment.length },
                  grouped.loan?.length > 0 && { id: 'loan', label: 'Loans', count: grouped.loan.length }
                ].filter(Boolean)}
                activeId={activeTab}
                onChange={setActiveTab}
              />
              <Button
                label="Add Accounts"
                onClick={handleAddAccounts}
                width="auto"
                loading={plaidLoading}
                disabled={plaidLoading}
                color="var(--color-primary)"
              />
            </div>

            {/* Account Content */}
            <div style={{ minHeight: '200px' }}>
              {renderActiveTabContent()}
            </div>
          </div>
        )}

        {plaidError && (
          <div className="w-full px-[20px] max-w-[700px] mt-[20px]">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">{plaidError}</p>
              <Button
                label="Try Again"
                onClick={handleAddAccounts}
                width="auto"
                style={{ marginTop: '8px' }}
              />
            </div>
          </div>
        )}
      </div>

      <PlaidLinkModal
        isOpen={plaidModalOpen}
        onClose={handlePlaidClose}
        onSuccess={handlePlaidSuccess}
        onError={(error) => {
          setPlaidError(error)
          setPlaidLoading(false)
        }}
      />
    </main>
  )
}

export default AccountsPanel
