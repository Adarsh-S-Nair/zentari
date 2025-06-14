import Spinner from './Spinner'
import LineChart from './LineChart'
import SummaryStat from './SummaryStat'

function MainPanel({ loading, result }) {
  return (
    <main className="flex-1 px-[24px] overflow-y-auto flex flex-col items-center justify-center">
      {loading ? (
        <div className="flex justify-center items-center h-full w-full">
          <Spinner />
        </div>
      ) : result ? (
        <div className="flex flex-col items-center gap-[20px] pt-[24px]">
          {/* ⬆️ Summary row */}
          <div className="flex justify-around w-full max-w-[700px] px-[20px]">
            <SummaryStat
              label="Starting Value"
              value={result.starting_value || 10000}
            />
            <SummaryStat
              label="Ending Value"
              value={result.final_portfolio_value}
              diff={
                ((result.final_portfolio_value - result.starting_value) /
                  result.starting_value) *
                100
              }
            />
            <SummaryStat
              label={`${result.benchmark} Ending Value`}
              value={result.final_benchmark_value}
              diff={
                ((result.final_benchmark_value - result.starting_value) /
                  result.starting_value) *
                100
              }
            />
          </div>

          {/* ⬇️ Chart */}
          <LineChart result={result} />
        </div>
      ) : (
        <div className="text-gray-500 text-[14px] italic text-center pt-[40px]">
          Run a simulation to see your portfolio performance here.
        </div>
      )}
    </main>
  )
}

export default MainPanel
