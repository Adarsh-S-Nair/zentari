import React, { useState } from 'react'
import { LineChart } from '../charts'
import { TradeTable, OrdersTable } from '../tables'
import { SummaryStat, LoadingBar, Spinner, Tabs } from '../ui'

function SimulationPanel({ loading, loadingPhase, result, currentSimDate, isMobile, form }) {
  const [activeTab, setActiveTab] = useState('trades') // 'trades' or 'orders'
  const [tableLoading, setTableLoading] = useState({ orders: false, trades: false })

  const finalValue = result?.final_portfolio_value || 0
  const benchmarkValue = result?.final_benchmark_value || 0
  const startValue = result?.starting_value || 10000

  // Handle tab switching
  const handleTabSwitch = (newTab) => {
    setActiveTab(newTab)
    setTableLoading(prev => ({ ...prev, [newTab]: true }))

    setTimeout(() => {
      setTableLoading(prev => ({ ...prev, [newTab]: false }))
    }, 100) // Simulate loading transition
  }

  const getSpinnerLabel = () => {
    if (loadingPhase === 'init') return 'Loading price data...'
    if (currentSimDate) {
      const date = new Date(currentSimDate + 'T00:00:00Z')
      return `Running simulation – ${date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })}`
    }
    return 'Running simulation...'
  }

  const renderTableContent = () => {
    if (tableLoading[activeTab]) {
      return <Spinner label="Loading table..." />
    }

    if (activeTab === 'orders') {
      return (
        <OrdersTable
          tradeHistoryByDate={result.trade_history_by_date || {}}
          isMobile={isMobile}
        />
      )
    } else {
      return (
        <TradeTable 
          trades={result.all_trades || []} 
          isMobile={isMobile} 
        />
      )
    }
  }

  return (
    <main className="flex-1 px-[24px] overflow-y-auto overflow-x-hidden">
      <div className="flex flex-col pt-[24px] items-center">
        {loading ? (
          currentSimDate ? (
            <LoadingBar 
              currentDate={currentSimDate} 
              startDate={form?.start_date}
              endDate={form?.end_date}
              label="Running simulation"
            />
          ) : (
            <Spinner label={getSpinnerLabel()} />
          )
        ) : result ? (
          <div className="flex flex-col w-full max-w-[700px] items-center gap-[20px]">

            {/* SUMMARY STATS */}
            <div className="flex justify-around w-full px-[20px]">
              <SummaryStat label="Starting Value" value={startValue} isCurrency />
              <SummaryStat
                label="Ending Value"
                value={finalValue}
                diff={((finalValue - startValue) / startValue) * 100}
                isCurrency
              />
              {!isMobile && (
                <SummaryStat
                  label={`${result.benchmark.toUpperCase() || 'Benchmark'} Ending Value`}
                  value={benchmarkValue}
                  diff={((benchmarkValue - startValue) / startValue) * 100}
                  isCurrency
                />
              )}
              <SummaryStat
                label="Duration"
                value={
                  result.duration_sec
                    ? `${result.duration_sec.toFixed(2)} sec`
                    : loading
                    ? 'Running...'
                    : '-'
                }
              />
            </div>

            {/* CHART */}
            <div className="w-full min-h-[300px]">
              <LineChart result={result} />
            </div>

            {/* TABLE SECTION */}
            <div className="w-full">
              <Tabs
                tabs={[
                  {
                    id: 'trades',
                    label: 'Trades',
                    count: result.all_trades?.length || 0
                  },
                  {
                    id: 'orders',
                    label: 'Orders',
                    count: Object.values(result.trade_history_by_date || {}).reduce((total, orders) => total + orders.length, 0)
                  }
                ]}
                activeId={activeTab}
                onChange={handleTabSwitch}
                showCount={true}
              />

              <div style={{ height: '350px' }}>
                {renderTableContent()}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-gray-500 text-[14px] italic text-center">
            Run a simulation to see your portfolio performance here.
          </div>
        )}
      </div>
    </main>
  )
}

export default SimulationPanel
