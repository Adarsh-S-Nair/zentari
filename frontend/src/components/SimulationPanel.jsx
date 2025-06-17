import Spinner from './Spinner'
import LineChart from './LineChart'
import SummaryStat from './SummaryStat'
import CollapsibleMonthlyTable from './CollapsibleMonthlyTable'

function SimulationPanel({ loading, loadingPhase, result, currentSimDate }) {
  const finalValue = result?.final_portfolio_value || 0
  const benchmarkValue = result?.final_benchmark_value || 0
  const startValue = result?.starting_value || 10000

  const getSpinnerLabel = () => {
    if (loadingPhase === 'init') return 'Loading price data...'
    if (currentSimDate) {
      const date = new Date(currentSimDate + 'T00:00:00Z')
      return `Running simulation – ${date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })}`
    }
    return 'Running simulation...'
  }

  return (
    <main className="flex-1 px-[24px] overflow-y-auto flex flex-col items-center justify-center">
      {loading ? (
        <Spinner label={getSpinnerLabel()} />
      ) : result ? (
        <div className="flex flex-col w-full max-w-[700px] items-center gap-[20px] pt-[24px] pb-[40px]">
          <div className="flex justify-around w-full px-[20px]">
            <SummaryStat label="Starting Value" value={startValue} isCurrency />
            <SummaryStat
              label="Ending Value"
              value={finalValue}
              diff={((finalValue - startValue) / startValue) * 100}
              isCurrency
            />
            <SummaryStat
              label={`${result.benchmark || 'Benchmark'} Ending Value`}
              value={benchmarkValue}
              diff={((benchmarkValue - startValue) / startValue) * 100}
              isCurrency
            />
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

          <div className="w-full min-h-[300px]">
            <LineChart result={result} />
          </div>

          <div className="w-full h-[350px]">
            <CollapsibleMonthlyTable monthlyReturns={result.monthly_returns || []} />
          </div>
        </div>
      ) : (
        <div className="text-gray-500 text-[14px] italic text-center pt-[40px]">
          Run a simulation to see your portfolio performance here.
        </div>
      )}
    </main>
  )
}

export default SimulationPanel
