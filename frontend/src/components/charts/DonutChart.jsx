import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js'
import { Doughnut } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend)

const DonutChart = ({ data, title }) => {
  // Category colors from the app's color system
  const colors = [
    '#3b82f6', // primary
    '#16a34a', // success
    '#dc2626', // danger
    '#f59e0b', // warning
    '#8b5cf6', // purple
    '#06b6d4', // cyan
    '#f97316', // orange
    '#ec4899', // pink
    '#84cc16', // lime
    '#6366f1', // indigo
  ]

  const chartData = {
    labels: data.map(item => item.label),
    datasets: [
      {
        data: data.map(item => item.value),
        backgroundColor: colors.slice(0, data.length),
        borderColor: 'transparent',
        borderWidth: 0,
        hoverBorderWidth: 0,
      }
    ]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: {
        position: 'right',
        align: 'start',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: { 
            size: 13, 
            weight: '500' 
          },
          color: 'var(--color-text-primary)',
          generateLabels: (chart) => {
            const data = chart.data
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label, i) => {
                const dataset = data.datasets[0]
                const value = dataset.data[i]
                const total = dataset.data.reduce((a, b) => a + b, 0)
                const percentage = ((value / total) * 100).toFixed(1)
                
                return {
                  text: `${label} (${percentage}%)`,
                  fillStyle: dataset.backgroundColor[i],
                  strokeStyle: dataset.backgroundColor[i],
                  pointStyle: 'circle',
                  pointRadius: 8,
                  pointHoverRadius: 10,
                  hidden: false,
                  index: i
                }
              })
            }
            return []
          }
        }
      },
      tooltip: {
        backgroundColor: 'var(--color-bg-secondary)',
        titleColor: 'var(--color-text-primary)',
        bodyColor: 'var(--color-text-secondary)',
        borderColor: 'var(--color-border-primary)',
        borderWidth: 1,
        titleFont: { weight: '600' },
        bodyFont: { weight: '500' },
        cornerRadius: 8,
        padding: 12,
        callbacks: {
          label: (context) => {
            const label = context.label || ''
            const value = context.parsed
            const total = context.dataset.data.reduce((a, b) => a + b, 0)
            const percentage = ((value / total) * 100).toFixed(1)
            return `${label}: $${value.toLocaleString()} (${percentage}%)`
          }
        }
      }
    },
    cutout: '65%',
    radius: '85%'
  }

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-[15px] font-medium mb-6" style={{ color: 'var(--color-text-primary)' }}>
          {title}
        </h3>
      )}
      <div className="relative" style={{ height: 350 }}>
        <Doughnut data={chartData} options={options} />
      </div>
    </div>
  )
}

export default DonutChart 