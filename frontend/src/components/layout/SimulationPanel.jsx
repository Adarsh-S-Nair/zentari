import React, { useState, useEffect } from 'react'
import { Spinner, LineChart, SummaryStat, OrdersTable, TradeTable } from '../index'

function SimulationPanel({ loading, loadingPhase, result, currentSimDate, isMobile }) {
  const [activeTab, setActiveTab] = useState('trades') // 'trades' or 'portfolio'
  const [tabWidths, setTabWidths] = useState({ portfolio: 0, trades: 0 })
  const [tabPositions, setTabPositions] = useState({ portfolio: 0, trades: 0 })
  const [tableLoading, setTableLoading] = useState({ portfolio: false, trades: false })
  
  const finalValue = result?.final_portfolio_value || 0
  const benchmarkValue = result?.final_benchmark_value || 0
  const startValue = result?.starting_value || 10000

  // Handle tab switching with instant response and loading state
  const handleTabSwitch = (newTab) => {
    setActiveTab(newTab)
    setTableLoading(prev => ({ ...prev, [newTab]: true }))
    
    // Immediately update tab positions for instant blue bar animation
    requestAnimationFrame(() => {
      const portfolioTab = document.getElementById('portfolio-tab')
      const tradesTab = document.getElementById('trades-tab')
      
      if (portfolioTab && tradesTab) {
        setTabPositions({
          portfolio: portfolioTab.offsetLeft,
          trades: tradesTab.offsetLeft
        })
        setTabWidths({
          portfolio: portfolioTab.offsetWidth,
          trades: tradesTab.offsetWidth
        })
      }
      
      // Then remove loading state
      setTableLoading(prev => ({ ...prev, [newTab]: false }))
    })
  }

  // Measure tab widths and positions when component mounts or result changes
  useEffect(() => {
    if (result) {
      // Log the result data for debugging
      console.log('Simulation Result:', result)
      console.log('All Trades:', result.all_trades)
      console.log('Trade History by Date:', result.trade_history_by_date)
      
      // Use requestAnimationFrame for immediate measurement without delay
      requestAnimationFrame(() => {
        const portfolioTab = document.getElementById('portfolio-tab')
        const tradesTab = document.getElementById('trades-tab')
        
        if (portfolioTab && tradesTab) {
          setTabWidths({
            portfolio: portfolioTab.offsetWidth,
            trades: tradesTab.offsetWidth
          })
          setTabPositions({
            portfolio: portfolioTab.offsetLeft,
            trades: tradesTab.offsetLeft
          })
        }
      })
    }
  }, [result])

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
    // Show spinner if the current tab is loading
    if (tableLoading[activeTab]) {
      return <Spinner label="Loading table..." />
    }

    if (activeTab === 'portfolio') {
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
    <main className={`flex-1 px-[24px] overflow-y-auto overflow-x-hidden ${isMobile ? 'pt-[50px] pb-[60px]' : ''}`}>
      <div className={`${isMobile ? 'min-h-[calc(100vh-100px)] flex flex-col items-center justify-center w-full' : 'min-h-[100vh] flex flex-col items-center justify-center'}`}>
        {loading ? (
          <Spinner label={getSpinnerLabel()} />
        ) : result ? (
          <div className="flex flex-col w-full max-w-[700px] items-center gap-[20px] pt-[24px] pb-[40px]">

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
              ) 
              }
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

            {/* CHART - Always Visible */}
            <div className="w-full min-h-[300px]">
              <LineChart result={result} />
            </div>

            {/* TABLE SECTION WITH TABS */}
            <div className="w-full">
              {/* Tabs Container */}
              <div style={{
                display: 'flex',
                position: 'relative',
                marginBottom: '16px',
                gap: '8px'
              }}>
                <button
                  id="trades-tab"
                  onClick={() => handleTabSwitch('trades')}
                  style={{
                    padding: '10px 16px',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                    borderBottom: activeTab === 'trades' ? '2px solid var(--color-primary)' : '2px solid transparent',
                    borderTop: 'none',
                    borderLeft: 'none',
                    borderRight: 'none',
                    color: activeTab === 'trades' ? 'var(--color-primary)' : 'var(--color-text-light)',
                    backgroundColor: 'transparent',
                    borderRadius: '8px 8px 0 0',
                    cursor: 'pointer',
                    position: 'relative',
                    zIndex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'trades') {
                      e.target.style.backgroundColor = 'var(--color-bg-hover)'
                      e.target.style.color = 'var(--color-text-secondary)'
                      // Darken the pill badge
                      const pill = e.target.querySelector('div')
                      if (pill) {
                        pill.style.backgroundColor = 'var(--color-gray-300)'
                        pill.style.color = 'var(--color-text-secondary)'
                      }
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'trades') {
                      e.target.style.backgroundColor = 'transparent'
                      e.target.style.color = 'var(--color-text-light)'
                      // Reset the pill badge
                      const pill = e.target.querySelector('div')
                      if (pill) {
                        pill.style.backgroundColor = 'var(--color-gray-200)'
                        pill.style.color = 'var(--color-text-muted)'
                      }
                    }
                  }}
                >
                  <span>Trades</span>
                  <div style={{
                    backgroundColor: activeTab === 'trades' ? 'var(--color-primary)' : 'var(--color-gray-200)',
                    color: activeTab === 'trades' ? 'white' : 'var(--color-text-muted)',
                    fontSize: '11px',
                    fontWeight: '600',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    minWidth: '16px',
                    textAlign: 'center',
                    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}>
                    {result.all_trades?.length || 0}
                  </div>
                </button>
                <button
                  id="portfolio-tab"
                  onClick={() => handleTabSwitch('portfolio')}
                  style={{
                    padding: '10px 16px',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                    borderBottom: activeTab === 'portfolio' ? '2px solid var(--color-primary)' : '2px solid transparent',
                    borderTop: 'none',
                    borderLeft: 'none',
                    borderRight: 'none',
                    color: activeTab === 'portfolio' ? 'var(--color-primary)' : 'var(--color-text-light)',
                    backgroundColor: 'transparent',
                    borderRadius: '8px 8px 0 0',
                    cursor: 'pointer',
                    position: 'relative',
                    zIndex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'portfolio') {
                      e.target.style.backgroundColor = 'var(--color-bg-hover)'
                      e.target.style.color = 'var(--color-text-secondary)'
                      // Darken the pill badge
                      const pill = e.target.querySelector('div')
                      if (pill) {
                        pill.style.backgroundColor = 'var(--color-gray-300)'
                        pill.style.color = 'var(--color-text-secondary)'
                      }
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'portfolio') {
                      e.target.style.backgroundColor = 'transparent'
                      e.target.style.color = 'var(--color-text-light)'
                      // Reset the pill badge
                      const pill = e.target.querySelector('div')
                      if (pill) {
                        pill.style.backgroundColor = 'var(--color-gray-200)'
                        pill.style.color = 'var(--color-text-muted)'
                      }
                    }
                  }}
                >
                  <span>Orders</span>
                  <div style={{
                    backgroundColor: activeTab === 'portfolio' ? 'var(--color-primary)' : 'var(--color-gray-200)',
                    color: activeTab === 'portfolio' ? 'white' : 'var(--color-text-muted)',
                    fontSize: '11px',
                    fontWeight: '600',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    minWidth: '16px',
                    textAlign: 'center',
                    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}>
                    {Object.values(result.trade_history_by_date || {}).reduce((total, orders) => total + orders.length, 0)}
                  </div>
                </button>
                
                {/* Sliding Blue Bar */}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: tabPositions[activeTab],
                  width: tabWidths[activeTab],
                  height: '2px',
                  backgroundColor: 'var(--color-primary)',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  zIndex: 0,
                  borderRadius: '1px'
                }} />
              </div>

              {/* Table Content */}
              <div style={{ height: '350px' }}>
                {renderTableContent()}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-gray-500 text-[14px] italic text-center pt-[40px]">
            Run a simulation to see your portfolio performance here.
          </div>
        )}
      </div>
    </main>
  )
}

export default SimulationPanel
