import React, { useState } from 'react'
import { LineChart } from '../charts'
import { TradeTable, OrdersTable } from '../tables'
import { SummaryStat, LoadingBar, Spinner, Tabs } from '../ui'
import noSimulationImg from '../../assets/no-simulation.png'

function SimulationPanel({ loading, loadingPhase, result, currentSimDate, isMobile, form, maxWidth = 700 }) {
  const [activeTab, setActiveTab] = useState('trades')
  const [tableLoading, setTableLoading] = useState({ orders: false, trades: false })

  const finalValue = result?.final_portfolio_value || 0
  const benchmarkValue = result?.final_benchmark_value || 0
  const startValue = result?.starting_value || 10000

  const handleTabSwitch = (newTab) => {
    setActiveTab(newTab)
    setTableLoading(prev => ({ ...prev, [newTab]: true }))
    setTimeout(() => {
      setTableLoading(prev => ({ ...prev, [newTab]: false }))
    }, 100)
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

  const showFullResult = !loading && result

  return (
    <main className="px-[24px]">
      <div className={`flex flex-col items-center ${showFullResult ? 'pt-[24px] pb-[24px]' : 'justify-center min-h-[calc(100vh-100px)]'}`}>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center text-center px-[20px] gap-[12px]">
            {currentSimDate ? (
              <LoadingBar 
                currentDate={currentSimDate} 
                startDate={form?.start_date}
                endDate={form?.end_date}
                label="Running simulation"
              />
            ) : (
              <Spinner label={getSpinnerLabel()} />
            )}
          </div>
        ) : result ? (
          <div className="flex flex-col w-full" style={{ maxWidth: maxWidth }}>
            {/* SUMMARY STATS */}
            <div style={{ width: '100%', padding: '0 20px' }}>
              <div className="flex justify-around w-full">
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
            </div>

            {/* CHART */}
            <div className="w-full min-h-[300px]">
              <LineChart result={result} />
            </div>

            {/* TABLE SECTION */}
            <div className="w-full">
              <div className='mb-[12px]'>
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
                      count: Object.values(result.trade_history_by_date || {}).reduce(
                        (total, orders) => total + orders.length,
                        0
                      )
                    }
                  ]}
                  activeId={activeTab}
                  onChange={handleTabSwitch}
                  showCount={true}
                />
              </div>

              <div style={{ height: '350px' }}>
                {renderTableContent()}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center px-[20px] text-gray-600 gap-3">
            <img
              src={noSimulationImg}
              alt="No simulation yet"
              className="w-[240px] object-contain mb-[4px]"
            />
            <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#1f2937' }}>
              Run a Simulation
            </h2>
            <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '-4px', maxWidth: '280px' }}>
              Put a trading strategy to the test by running a simulation against historical data.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}

export default SimulationPanel
