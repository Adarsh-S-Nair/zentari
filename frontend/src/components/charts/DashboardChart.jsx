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

const DashboardChart = ({ data, xKey, yKey, color = '#509cf4', showGrid = true }) => {
  const labels = data.map(entry => {
    const date = new Date(entry[xKey]);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric'
    }).format(date);
  });

  const values = data.map(entry => entry[yKey]);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Portfolio Value',
        data: values,
        borderColor: color,
        backgroundColor: color,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHitRadius: 20,
        pointHoverBackgroundColor: color,
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
    interaction: {
      mode: 'index',
      intersect: false,
    },
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
          display: showGrid,
          color: 'rgba(0, 0, 0, 0.06)',
          drawTicks: false
        },
        ticks: {
          autoSkip: true,
          maxTicksLimit: 6,
          callback: val => `$${val.toLocaleString()}`,
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
        display: false
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
          label: context => `Value: $${context.raw.toLocaleString()}`
        }
      }
    }
  }

  return (
    <div className="w-full h-full">
      <Line data={chartData} options={options} />
    </div>
  )
}

export default DashboardChart 