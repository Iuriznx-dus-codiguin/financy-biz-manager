import React, { memo, useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';

interface OptimizedChartProps {
  data: any[];
  type: 'line' | 'pie' | 'bar';
  width?: string | number;
  height?: number;
  colors?: string[];
  dataKey?: string;
  xAxisKey?: string;
  yAxisKey?: string;
  showTooltip?: boolean;
  showGrid?: boolean;
  className?: string;
}

const DEFAULT_COLORS = ['#6366f1', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4'];

export const OptimizedChart = memo<OptimizedChartProps>(({
  data,
  type,
  width = '100%',
  height = 300,
  colors = DEFAULT_COLORS,
  dataKey = 'value',
  xAxisKey = 'name',
  yAxisKey = 'value',
  showTooltip = true,
  showGrid = true,
  className = ''
}) => {
  const processedData = useMemo(() => {
    // Processar dados apenas uma vez
    return data.map((item, index) => ({
      ...item,
      fill: colors[index % colors.length]
    }));
  }, [data, colors]);

  const chartComponent = useMemo(() => {
    const commonProps = {
      width,
      height,
      data: processedData,
      className
    };

    switch (type) {
      case 'line':
        return (
          <ResponsiveContainer {...commonProps}>
            <LineChart>
              {showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey={xAxisKey} />
              <YAxis />
              {showTooltip && <Tooltip />}
              <Line 
                type="monotone" 
                dataKey={dataKey} 
                stroke={colors[0]} 
                strokeWidth={2}
                dot={{ fill: colors[0] }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer {...commonProps}>
            <BarChart>
              {showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey={xAxisKey} />
              <YAxis />
              {showTooltip && <Tooltip />}
              <Bar dataKey={dataKey} fill={colors[0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer {...commonProps}>
            <PieChart>
              <Pie
                data={processedData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey={dataKey}
                nameKey={xAxisKey}
              >
                {processedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              {showTooltip && <Tooltip />}
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  }, [type, processedData, width, height, showGrid, showTooltip, xAxisKey, yAxisKey, dataKey, colors, className]);

  return chartComponent;
});