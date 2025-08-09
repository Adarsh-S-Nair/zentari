import React from 'react';
import { ResponsiveLine } from '@nivo/line';
import { Card } from '../ui';

const PlaceholderLineChart = () => {
  const data = [
    {
      id: 'Income',
      data: [
        { x: 'Jan', y: 4200 },
        { x: 'Feb', y: 3800 },
        { x: 'Mar', y: 4500 },
        { x: 'Apr', y: 4100 },
        { x: 'May', y: 5200 },
        { x: 'Jun', y: 4800 },
      ]
    },
    {
      id: 'Expenses',
      data: [
        { x: 'Jan', y: 3800 },
        { x: 'Feb', y: 4200 },
        { x: 'Mar', y: 3900 },
        { x: 'Apr', y: 4800 },
        { x: 'May', y: 4400 },
        { x: 'Jun', y: 5100 },
      ]
    }
  ];

  return (
    <Card title="Finances" className="w-full h-full">
      <div style={{ height: 'calc(100% - 60px)', width: '100%' }}>
        <ResponsiveLine
          data={data}
          margin={{ top: 20, right: 20, bottom: 40, left: 50 }}
          xScale={{ type: 'point' }}
          yScale={{ type: 'linear', min: 0, max: 6000 }}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 0,
            tickPadding: 8,
            tickRotation: 0,
            style: { fontSize: 11, fill: 'var(--color-text-muted)' }
          }}
          axisLeft={{
            tickSize: 0,
            tickPadding: 8,
            tickRotation: 0,
            tickValues: [0, 2000, 4000, 6000],
            format: (value) => value === 0 ? '0' : `${(value / 1000).toFixed(0)}k`,
            style: { fontSize: 11, fill: 'var(--color-text-muted)' }
          }}
          pointSize={0}
          pointBorderWidth={0}
          useMesh={true}
          lineWidth={3}
          curve="monotoneX"
          colors={['#3b82f6', '#dc2626']}
          theme={{
            grid: { line: { stroke: 'transparent' } }
          }}
        />
      </div>
    </Card>
  );
};

export default PlaceholderLineChart; 