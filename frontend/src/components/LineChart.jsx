import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend)

const LineChart = ({ result }) => {
  // Extract and format dates from daily_values
  const labels = result.daily_values.map(entry =>
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(entry.date + 'T00:00:00Z'))
  )

  // Extract corresponding portfolio and benchmark values
  const portfolioData = result.daily_values.map(entry => entry.portfolio_value)
  const benchmarkData = result.daily_benchmark_values.map(entry => entry.benchmark_value)

  // Normalize to percent change (relative to day 1)
  const basePortfolio = portfolioData[0]
  const baseBenchmark = benchmarkData[0]

  const portfolioPctChange = portfolioData.map(val => ((val - basePortfolio) / basePortfolio) * 100)
  const benchmarkPctChange = benchmarkData.map(val => ((val - baseBenchmark) / baseBenchmark) * 100)

  const data = {
    labels,
    datasets: [
      {
        label: 'Simulation',
        data: portfolioPctChange,
        borderColor: '#509cf4',
        backgroundColor: '#509cf4',
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHitRadius: 20,
        pointHoverBackgroundColor: '#509cf4',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2
      },
      {
        label: result.benchmark || 'Benchmark',
        data: benchmarkPctChange,
        borderColor: '#c5c5c5',
        backgroundColor: '#c5c5c5',
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHitRadius: 20,
        pointHoverBackgroundColor: '#c5c5c5',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2
      }
    ]
  }

  const options = {
    animation: false,
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: 0 },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          autoSkip: true,
          autoSkipPadding: 60,
          maxRotation: 0,
          minRotation: 0,
          padding: 8,
          font: { size: 11, weight: '500' },
          color: '#6b7280'
        },
        border: { display: false }
      },
      y: {
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.06)',
          drawTicks: false
        },
        ticks: {
          autoSkip: true,
          maxTicksLimit: 6, // optional fallback
          stepSize: 5,      // optional: show ticks every 5%
          callback: val => `${val.toFixed(1)}%`,
          display: true,
          padding: 8,
          font: { size: 11, weight: '500' },
          color: '#6b7280'
        },
        border: { display: false }
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: {
          usePointStyle: false,
          boxWidth: 24,
          boxHeight: 3,
          padding: 16,
          font: { size: 11, weight: '500' },
          color: '#6b7280'
        }
      },
      tooltip: {
        animation: false,
        enabled: true,
        backgroundColor: '#f9fafb',
        titleColor: '#111827',
        bodyColor: '#374151',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        titleFont: { weight: '600' },
        cornerRadius: 8,
        padding: 8,
        callbacks: {
          label: context => `${context.dataset.label}: ${context.raw.toFixed(2)}%`
        }
      }
    }
  }

  return (
    <div
      className="w-full max-w-[700px] h-[300px] bg-white rounded-[8px] pt-0 pr-[20px] pb-[20px] pl-[20px] flex flex-col"
      style={{
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        border: '1px solid #e5e7eb'
      }}
    >
      <div className="flex-1">
        <Line data={data} options={options} />
      </div>
    </div>
  )
}

export default LineChart
