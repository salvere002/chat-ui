import React, { useRef, useMemo, useCallback } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { ChartData } from '../types/chat';

interface ChartRendererProps {
  chartData: ChartData;
  className?: string;
}

type TickTextAnchor = 'inherit' | 'end' | 'start' | 'middle';

interface AdaptiveTickProps {
  fontSize: number;
  angle?: number;
  height?: number;
  textAnchor?: TickTextAnchor;
}

const ChartRenderer: React.FC<ChartRendererProps> = ({ chartData, className }) => {
  
  const { type, data, config = {} } = chartData;
  
  
  // Use completely static width - no more ResizeObserver or dynamic calculations
  const chartWidth = 580; // Fixed width that works well for the chat interface
  const containerRef = useRef<HTMLDivElement>(null);

  // Memoize expensive calculations
  const defaultConfig = useMemo(() => ({
    width: '100%',
    height: 320,
    xKey: 'name',
    yKey: 'value',
    colors: [
      '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff7f',
      '#dc143c', '#00bfff', '#ff1493', '#32cd32', '#ff6347'
    ],
    ...config
  }), [config]);

  // Use CSS variables so theme flips don't trigger React re-renders
  const themeColors = useMemo(() => ({
    textColor: 'var(--chart-text)',
    gridColor: 'var(--chart-grid)',
    backgroundColor: 'var(--chart-bg)'
  }), []);

  // Adaptive font size and rotation based on number of data points
  const adaptiveTickProps = useMemo<AdaptiveTickProps>(() => {
    if (!data || !Array.isArray(data)) return { fontSize: 10 };
    
    const dataPointCount = data.length;
    
    if (dataPointCount <= 5) {
      return { fontSize: 11 };
    } else if (dataPointCount <= 8) {
      return { fontSize: 10 };
    } else if (dataPointCount <= 12) {
      return { fontSize: 9 };
    } else {
      // For many points, use rotation to save space
      // Rotate when we have 13+ data points to prevent overlap
      return {
        fontSize: 8,
        angle: -45,
        height: 45, // Increased height to push text further down
        textAnchor: 'end', // Anchor at end for better rotated text positioning
      };
    }
  }, [data]);

  const commonProps = useMemo(() => ({
    data,
    margin: { 
      top: 30, 
      right: 5, 
      left: 5, 
      bottom: 5  // Much more space when rotated
    },
  }), [data, adaptiveTickProps.angle]);

  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="p-4 bg-bg-secondary border border-border-secondary rounded-lg text-center">
        <p className="text-text-secondary">No chart data available</p>
        <p className="text-xs text-text-tertiary mt-1">Expected array of data points</p>
      </div>
    );
  }



  const renderChart = useCallback(() => {
    const { textColor, gridColor, backgroundColor } = themeColors;
    
    try {
      switch (type) {
        case 'bar':
          return (
            <BarChart {...commonProps} width={chartWidth - 4} height={defaultConfig.height - 4}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              {defaultConfig.title && (
                <text x="50%" y="15" textAnchor="middle" style={{ fill: textColor, fontSize: '16px', fontWeight: 'bold' }}>
                  {defaultConfig.title}
                </text>
              )}
              <XAxis 
                dataKey={defaultConfig.xKey} 
                type="category"
                tick={{ 
                  fill: textColor, 
                  fontSize: adaptiveTickProps.fontSize, 
                  textAnchor: adaptiveTickProps.textAnchor || 'middle'
                }}
                tickFormatter={(value) => String(value)}
                axisLine={{ stroke: gridColor }}
                tickLine={{ stroke: gridColor }}
                label={{ 
                  value: defaultConfig.xLabel, 
                  position: 'insideBottom', 
                  offset: -5,
                  style: { textAnchor: 'middle', fill: textColor, fontSize: '12px' }
                }}
                {...(adaptiveTickProps.angle && { angle: adaptiveTickProps.angle })}
                {...(adaptiveTickProps.height && { height: adaptiveTickProps.height })}
              />
              <YAxis 
                tick={{ fill: textColor, fontSize: 11 }}
                axisLine={{ stroke: gridColor }}
                tickLine={{ stroke: gridColor }}
                label={{ 
                  value: defaultConfig.yLabel, 
                  angle: -90, 
                  position: 'insideLeft',
                  offset: 10,
                  style: { textAnchor: 'middle', fill: textColor, fontSize: '12px' }
                }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: backgroundColor,
                  border: `1px solid ${gridColor}`,
                  borderRadius: '6px',
                  color: textColor,
                  fontSize: '12px'
                }}
                cursor={{ stroke: gridColor, strokeWidth: 1 }}
                allowEscapeViewBox={{ x: false, y: false }}
                wrapperStyle={{ outline: 'none' }}
              />
              <Legend 
                wrapperStyle={{ color: textColor, fontSize: '12px', paddingTop: '15px' }}
                iconType="rect"
                verticalAlign="bottom"
                align="center"
                layout="horizontal"
              />
              {Array.isArray(defaultConfig.yKey) ? (
                defaultConfig.yKey.map((key: string, index: number) => (
                    <Bar
                      key={key}
                      dataKey={key}
                      fill={defaultConfig.colors[index % defaultConfig.colors.length]}
                      name={key.charAt(0).toUpperCase() + key.slice(1)}
                      radius={[2, 2, 0, 0]}
                      maxBarSize={60}
                      isAnimationActive={false}
                    />
                ))
              ) : (
                <Bar
                  dataKey={defaultConfig.yKey}
                  fill={defaultConfig.colors[0]}
                  name={typeof defaultConfig.yKey === 'string' ? defaultConfig.yKey.charAt(0).toUpperCase() + defaultConfig.yKey.slice(1) : 'Value'}
                  radius={[2, 2, 0, 0]}
                  maxBarSize={60}
                  isAnimationActive={false}
                />
              )}
            </BarChart>
          );

        case 'line':
          return (
            <LineChart {...commonProps} width={chartWidth - 4} height={defaultConfig.height - 4}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              {defaultConfig.title && (
                <text x="50%" y="15" textAnchor="middle" style={{ fill: textColor, fontSize: '16px', fontWeight: 'bold' }}>
                  {defaultConfig.title}
                </text>
              )}
              <XAxis 
                dataKey={defaultConfig.xKey} 
                type="category"
                tick={{ 
                  fill: textColor, 
                  fontSize: adaptiveTickProps.fontSize, 
                  textAnchor: adaptiveTickProps.textAnchor || 'middle'
                }}
                tickFormatter={(value) => String(value)}
                axisLine={{ stroke: gridColor }}
                tickLine={{ stroke: gridColor }}
                label={{ 
                  value: defaultConfig.xLabel, 
                  position: 'insideBottom', 
                  offset: -5,
                  style: { textAnchor: 'middle', fill: textColor, fontSize: '12px' }
                }}
                {...(adaptiveTickProps.angle && { angle: adaptiveTickProps.angle })}
                {...(adaptiveTickProps.height && { height: adaptiveTickProps.height })}
              />
              <YAxis 
                tick={{ fill: textColor, fontSize: 11 }}
                axisLine={{ stroke: gridColor }}
                tickLine={{ stroke: gridColor }}
                label={{ 
                  value: defaultConfig.yLabel, 
                  angle: -90, 
                  position: 'insideLeft',
                  offset: 10,
                  style: { textAnchor: 'middle', fill: textColor, fontSize: '12px' }
                }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: backgroundColor,
                  border: `1px solid ${gridColor}`,
                  borderRadius: '6px',
                  color: textColor,
                  fontSize: '12px'
                }}
                cursor={{ stroke: gridColor, strokeWidth: 1 }}
                allowEscapeViewBox={{ x: false, y: false }}
                wrapperStyle={{ outline: 'none' }}
              />
              <Legend 
                wrapperStyle={{ color: textColor, fontSize: '12px', paddingTop: '15px' }}
                iconType="rect"
                verticalAlign="bottom"
                align="center"
                layout="horizontal"
              />
              {Array.isArray(defaultConfig.yKey) ? (
                defaultConfig.yKey.map((key, index) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={defaultConfig.colors[index % defaultConfig.colors.length]}
                    strokeWidth={2}
                    name={key.charAt(0).toUpperCase() + key.slice(1)}
                    isAnimationActive={false}
                  />
                ))
              ) : (
                <Line
                  type="monotone"
                  dataKey={defaultConfig.yKey}
                  stroke={defaultConfig.colors[0]}
                  strokeWidth={2}
                  name={typeof defaultConfig.yKey === 'string' ? defaultConfig.yKey.charAt(0).toUpperCase() + defaultConfig.yKey.slice(1) : 'Value'}
                  isAnimationActive={false}
                />
              )}
            </LineChart>
          );

        case 'area':
          return (
            <AreaChart {...commonProps} width={chartWidth - 4} height={defaultConfig.height - 4}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              {defaultConfig.title && (
                <text x="50%" y="15" textAnchor="middle" style={{ fill: textColor, fontSize: '16px', fontWeight: 'bold' }}>
                  {defaultConfig.title}
                </text>
              )}
              <XAxis 
                dataKey={defaultConfig.xKey} 
                type="category"
                tick={{ 
                  fill: textColor, 
                  fontSize: adaptiveTickProps.fontSize, 
                  textAnchor: adaptiveTickProps.textAnchor || 'middle'
                }}
                tickFormatter={(value) => String(value)}
                axisLine={{ stroke: gridColor }}
                tickLine={{ stroke: gridColor }}
                label={{ 
                  value: defaultConfig.xLabel, 
                  position: 'insideBottom', 
                  offset: -5,
                  style: { textAnchor: 'middle', fill: textColor, fontSize: '12px' }
                }}
                {...(adaptiveTickProps.angle && { angle: adaptiveTickProps.angle })}
                {...(adaptiveTickProps.height && { height: adaptiveTickProps.height })}
              />
              <YAxis 
                tick={{ fill: textColor, fontSize: 11 }}
                axisLine={{ stroke: gridColor }}
                tickLine={{ stroke: gridColor }}
                label={{ 
                  value: defaultConfig.yLabel, 
                  angle: -90, 
                  position: 'insideLeft',
                  offset: 10,
                  style: { textAnchor: 'middle', fill: textColor, fontSize: '12px' }
                }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: backgroundColor,
                  border: `1px solid ${gridColor}`,
                  borderRadius: '6px',
                  color: textColor,
                  fontSize: '12px'
                }}
                cursor={{ stroke: gridColor, strokeWidth: 1 }}
                allowEscapeViewBox={{ x: false, y: false }}
                wrapperStyle={{ outline: 'none' }}
              />
              <Legend 
                wrapperStyle={{ color: textColor, fontSize: '12px', paddingTop: '15px' }}
                iconType="rect"
                verticalAlign="bottom"
                align="center"
                layout="horizontal"
              />
              {Array.isArray(defaultConfig.yKey) ? (
                defaultConfig.yKey.map((key, index) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stackId="1"
                    stroke={defaultConfig.colors[index % defaultConfig.colors.length]}
                    fill={defaultConfig.colors[index % defaultConfig.colors.length]}
                    fillOpacity={0.6}
                    name={key.charAt(0).toUpperCase() + key.slice(1)}
                    isAnimationActive={false}
                  />
                ))
              ) : (
                <Area
                  type="monotone"
                  dataKey={defaultConfig.yKey}
                  stroke={defaultConfig.colors[0]}
                  fill={defaultConfig.colors[0]}
                  fillOpacity={0.6}
                  name={typeof defaultConfig.yKey === 'string' ? defaultConfig.yKey.charAt(0).toUpperCase() + defaultConfig.yKey.slice(1) : 'Value'}
                  isAnimationActive={false}
                />
              )}
            </AreaChart>
          );

        case 'pie':
          // Convert string values to numbers for pie chart
          const yKey = typeof defaultConfig.yKey === 'string' ? defaultConfig.yKey : 'value';
          const pieData = data.map(item => ({
            ...item,
            [yKey]: parseFloat(String(item[yKey])) || 0
          }));
          
          return (
            <PieChart {...commonProps} width={chartWidth - 4} height={defaultConfig.height - 4}>
              {defaultConfig.title && (
                <text x="50%" y="15" textAnchor="middle" style={{ fill: textColor, fontSize: '16px', fontWeight: 'bold' }}>
                  {defaultConfig.title}
                </text>
              )}
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={0}
                outerRadius={100} // Fixed larger radius for better visibility
                fill="#8884d8"
                dataKey={typeof defaultConfig.yKey === 'string' ? defaultConfig.yKey : 'value'}
                nameKey={defaultConfig.xKey}
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                labelLine={false}
                isAnimationActive={false}
              >
                {pieData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={defaultConfig.colors[index % defaultConfig.colors.length]}
                  />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: backgroundColor,
                  border: `1px solid ${gridColor}`,
                  borderRadius: '6px',
                  color: textColor,
                  fontSize: '12px'
                }}
                labelStyle={{ color: textColor }}
                itemStyle={{ color: textColor }}
                cursor={{ stroke: gridColor, strokeWidth: 1 }}
                allowEscapeViewBox={{ x: false, y: false }}
                wrapperStyle={{ outline: 'none' }}
              />
              <Legend 
                wrapperStyle={{ color: textColor, fontSize: '12px', paddingTop: '15px' }}
                iconType="rect"
                verticalAlign="bottom"
                align="center"
                layout="horizontal"
              />
            </PieChart>
          );

        case 'scatter':
          return (
            <ScatterChart {...commonProps} width={chartWidth - 4} height={defaultConfig.height - 4}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              {defaultConfig.title && (
                <text x="50%" y="15" textAnchor="middle" style={{ fill: textColor, fontSize: '16px', fontWeight: 'bold' }}>
                  {defaultConfig.title}
                </text>
              )}
              <XAxis 
                dataKey={defaultConfig.xKey} 
                type="category"
                tick={{ 
                  fill: textColor, 
                  fontSize: adaptiveTickProps.fontSize, 
                  textAnchor: adaptiveTickProps.textAnchor || 'middle'
                }}
                tickFormatter={(value) => String(value)}
                axisLine={{ stroke: gridColor }}
                tickLine={{ stroke: gridColor }}
                label={{ 
                  value: defaultConfig.xLabel, 
                  position: 'insideBottom', 
                  offset: -5,
                  style: { textAnchor: 'middle', fill: textColor, fontSize: '12px' }
                }}
                {...(adaptiveTickProps.angle && { angle: adaptiveTickProps.angle })}
                {...(adaptiveTickProps.height && { height: adaptiveTickProps.height })}
              />
              <YAxis 
                tick={{ fill: textColor, fontSize: 11 }}
                axisLine={{ stroke: gridColor }}
                tickLine={{ stroke: gridColor }}
                label={{ 
                  value: defaultConfig.yLabel, 
                  angle: -90, 
                  position: 'insideLeft',
                  offset: 10,
                  style: { textAnchor: 'middle', fill: textColor, fontSize: '12px' }
                }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: backgroundColor,
                  border: `1px solid ${gridColor}`,
                  borderRadius: '6px',
                  color: textColor,
                  fontSize: '12px'
                }}
                labelStyle={{ color: textColor }}
                itemStyle={{ color: textColor }}
                cursor={{ stroke: gridColor, strokeWidth: 1 }}
                allowEscapeViewBox={{ x: false, y: false }}
                wrapperStyle={{ outline: 'none' }}
              />
              <Legend 
                wrapperStyle={{ color: textColor, fontSize: '12px', paddingTop: '15px' }}
                iconType="rect"
                verticalAlign="bottom"
                align="center"
                layout="horizontal"
              />
              <Scatter
                dataKey={typeof defaultConfig.yKey === 'string' ? defaultConfig.yKey : 'y'}
                fill={defaultConfig.colors[0]}
                name={typeof defaultConfig.yKey === 'string' ? 
                  defaultConfig.yKey.charAt(0).toUpperCase() + defaultConfig.yKey.slice(1) : 
                  'Y Values'
                }
                isAnimationActive={false}
              />
            </ScatterChart>
          );

        default:
          return (
            <BarChart 
              data={[{name: 'Unsupported', value: 100}]} 
              margin={{ top: 30, right: 5, left: 5, bottom: 5 }} 
              width={chartWidth - 4} 
              height={defaultConfig.height - 4}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <text x="50%" y="15" textAnchor="middle" style={{ fill: textColor, fontSize: '16px', fontWeight: 'bold' }}>
                Unsupported Chart Type: {type}
              </text>
              <XAxis 
                dataKey="name" 
                tick={{ fill: textColor, fontSize: 11 }}
                axisLine={{ stroke: gridColor }}
                tickLine={{ stroke: gridColor }}
              />
              <YAxis 
                tick={{ fill: textColor, fontSize: 11 }}
                axisLine={{ stroke: gridColor }}
                tickLine={{ stroke: gridColor }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: backgroundColor,
                  border: `1px solid ${gridColor}`,
                  borderRadius: '6px',
                  color: textColor,
                  fontSize: '12px'
                }}
                cursor={{ stroke: gridColor, strokeWidth: 1 }}
                allowEscapeViewBox={{ x: false, y: false }}
                wrapperStyle={{ outline: 'none' }}
              />
              <Bar 
                dataKey="value" 
                fill={defaultConfig.colors[0]}
                radius={[2, 2, 0, 0]}
                maxBarSize={60}
                isAnimationActive={false}
              />
            </BarChart>
          );
      }
    } catch (error) {
      console.error('Chart rendering error:', error);
      return (
        <div className="p-4 bg-bg-secondary border border-border-secondary rounded-lg text-center">
          <p className="text-text-secondary">Error rendering chart</p>
        </div>
      );
    }
  }, [type, defaultConfig, themeColors, commonProps]);

  return (
    <div className={`chart-container my-4 w-full ${className || ''}`} style={{ maxWidth: '100%' }}>
      <div 
        ref={containerRef}
        className="w-full bg-bg-secondary rounded-lg border border-border-secondary" 
        style={{ 
          height: `${defaultConfig.height}px`,
          minHeight: `${defaultConfig.height}px`,
          maxWidth: '760px',
          margin: '0 auto',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          height: '100%'
        }}>
          {renderChart()}
        </div>
      </div>
    </div>
  );
};

export default React.memo(ChartRenderer);
