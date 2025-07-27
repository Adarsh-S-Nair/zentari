import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatters';
import CategoryIcon from '../ui/CategoryIcon';
import { FaChevronRight } from 'react-icons/fa';

const DonutChart = ({ data, title }) => {
  const [tooltip, setTooltip] = useState(null);
  const navigate = useNavigate();

  const chartData = useMemo(() => {
    return data.map((item, index) => ({
      id: item.label,
      label: item.label,
      value: item.value,
      color: item.color,
      icon_lib: item.icon_lib,
      icon_name: item.icon_name,
      category_id: item.category_id
    }));
  }, [data]);

  const total = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.value, 0);
  }, [chartData]);

  // Chart dimensions
  const width = 320;
  const height = 280; // Reduced from 320 to make it more square
  const centerX = width / 2;
  const centerY = height / 2;
  const outerRadius = 120; // Reduced from 140 to fit better in smaller height
  const innerRadius = 70; // Adjusted proportionally
  const gap = 2; // Gap between segments

  // Calculate angles for each segment
  const segments = useMemo(() => {
    let currentAngle = -Math.PI / 2; // Start from top
    const totalValue = chartData.reduce((sum, item) => sum + item.value, 0);
    
    return chartData.map((item, index) => {
      const angle = (item.value / totalValue) * (2 * Math.PI - gap * chartData.length / outerRadius);
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      
      // Calculate path for the segment
      const x1 = centerX + outerRadius * Math.cos(startAngle);
      const y1 = centerY + outerRadius * Math.sin(startAngle);
      const x2 = centerX + outerRadius * Math.cos(endAngle);
      const y2 = centerY + outerRadius * Math.sin(endAngle);
      
      // Inner arc points
      const x3 = centerX + innerRadius * Math.cos(endAngle);
      const y3 = centerY + innerRadius * Math.sin(endAngle);
      const x4 = centerX + innerRadius * Math.cos(startAngle);
      const y4 = centerY + innerRadius * Math.sin(startAngle);
      
      // Large arc flag (1 if angle > 180 degrees)
      const largeArcFlag = angle > Math.PI ? 1 : 0;
      
      // Create SVG path
      const path = [
        `M ${x1} ${y1}`,
        `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        `L ${x3} ${y3}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}`,
        'Z'
      ].join(' ');
      
      // Calculate icon position (middle of the segment)
      const midAngle = startAngle + angle / 2;
      const iconRadius = (outerRadius + innerRadius) / 2;
      const iconX = centerX + iconRadius * Math.cos(midAngle);
      const iconY = centerY + iconRadius * Math.sin(midAngle);
      
      currentAngle = endAngle + gap / outerRadius;
      
      return {
        ...item,
        path,
        iconX,
        iconY,
        startAngle,
        endAngle,
        midAngle
      };
    });
  }, [chartData, centerX, centerY, outerRadius, innerRadius, gap]);

  const handleSegmentClick = (segment) => {
    // Navigate to transactions page with category filter in URL
    const searchParams = new URLSearchParams();
    if (segment.category_id) {
      searchParams.set('categories', segment.category_id);
    }
    
    // Navigate to transactions page with filter in URL
    navigate(`/transactions?${searchParams.toString()}`);
  };

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-[15px] font-semibold mb-6" style={{ color: 'var(--color-text-primary)' }}>
          {title}
        </h3>
      )}
      <div className="flex justify-center">
        {/* Chart */}
        <div style={{ position: 'relative' }}>
          <svg width={width} height={height} style={{ overflow: 'visible' }}>
            {/* Segments */}
            {segments.map((segment, index) => (
              <g key={segment.id}>
                <path
                  d={segment.path}
                  fill={segment.color}
                  stroke="none"
                  style={{
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    transformOrigin: `${centerX}px ${centerY}px`
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.05)';
                    e.target.style.filter = 'brightness(1.1)';
                    
                    // Show tooltip
                    const percentage = total > 0 ? ((segment.value / total) * 100).toFixed(1) : '0.0';
                    setTooltip({
                      label: segment.label,
                      value: segment.value,
                      percentage,
                      color: segment.color,
                      x: e.clientX,
                      y: e.clientY
                    });
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.filter = 'brightness(1)';
                    setTooltip(null);
                  }}
                  onClick={() => handleSegmentClick(segment)}
                />
                
                {/* Icon on segment */}
                <g 
                  transform={`translate(${segment.iconX}, ${segment.iconY})`}
                  style={{ 
                    cursor: 'pointer',
                    transformOrigin: `${centerX - segment.iconX}px ${centerY - segment.iconY}px`,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    // Find the corresponding path and apply hover effect
                    const pathElement = e.currentTarget.parentNode.querySelector('path');
                    if (pathElement) {
                      pathElement.style.transform = 'scale(1.05)';
                      pathElement.style.filter = 'brightness(1.1)';
                    }
                    
                    // Apply hover effect to icon
                    e.currentTarget.style.transform = `translate(${segment.iconX}, ${segment.iconY}) scale(1.2)`;
                    
                    // Show tooltip
                    const percentage = total > 0 ? ((segment.value / total) * 100).toFixed(1) : '0.0';
                    setTooltip({
                      label: segment.label,
                      value: segment.value,
                      percentage,
                      color: segment.color,
                      x: e.clientX,
                      y: e.clientY
                    });
                  }}
                  onMouseLeave={(e) => {
                    // Find the corresponding path and remove hover effect
                    const pathElement = e.currentTarget.parentNode.querySelector('path');
                    if (pathElement) {
                      pathElement.style.transform = 'scale(1)';
                      pathElement.style.filter = 'brightness(1)';
                    }
                    
                    // Remove hover effect from icon
                    e.currentTarget.style.transform = `translate(${segment.iconX}, ${segment.iconY}) scale(1)`;
                    
                    setTooltip(null);
                  }}
                  onClick={() => handleSegmentClick(segment)}
                >
                  <foreignObject x="-10" y="-10" width="20" height="20">
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      width: '100%',
                      height: '100%'
                    }}>
                      {segment.icon_lib && segment.icon_name ? (
                        <CategoryIcon 
                          lib={segment.icon_lib} 
                          name={segment.icon_name} 
                          size={12} 
                          color="white"
                        />
                      ) : (
                        <FaChevronRight size={10} style={{ color: 'white' }} />
                      )}
                    </div>
                  </foreignObject>
                </g>
              </g>
            ))}
            
            {/* Center total */}
            <g>
              <text
                x={centerX}
                y={centerY - 10}
                textAnchor="middle"
                dominantBaseline="central"
                style={{
                  fontSize: '24px',
                  fontWeight: '500',
                  fill: 'var(--color-text-primary)'
                }}
              >
                {formatCurrency(total)}
              </text>
              <text
                x={centerX}
                y={centerY + 15}
                textAnchor="middle"
                dominantBaseline="central"
                style={{
                  fontSize: '12px',
                  fontWeight: '400',
                  fill: 'var(--color-text-muted)'
                }}
              >
                Total Spending
              </text>
            </g>
          </svg>
          
          {/* Custom Tooltip */}
          {tooltip && (
            <div
              style={{
                position: 'fixed',
                left: tooltip.x + 10,
                top: tooltip.y - 10,
                background: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border-primary)',
                borderRadius: '12px',
                padding: '12px 16px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                zIndex: 1000,
                pointerEvents: 'none',
                minWidth: '140px'
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div 
                  className="w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: tooltip.color }}
                >
                  {chartData.find(item => item.label === tooltip.label)?.icon_lib && 
                   chartData.find(item => item.label === tooltip.label)?.icon_name && (
                    <CategoryIcon 
                      lib={chartData.find(item => item.label === tooltip.label)?.icon_lib} 
                      name={chartData.find(item => item.label === tooltip.label)?.icon_name} 
                      size={8} 
                      color="white"
                    />
                  )}
                </div>
                <span 
                  className="text-sm truncate"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {tooltip.label}
                </span>
              </div>
              <div className="space-y-1">
                <div 
                  className="text-lg font-medium"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {formatCurrency(tooltip.value)}
                </div>
                <div 
                  className="text-xs"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {tooltip.percentage}% of total
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DonutChart; 