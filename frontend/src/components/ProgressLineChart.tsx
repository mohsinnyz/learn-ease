"use client";

import { useEffect, useState } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  fetchGlobalProgress, 
  ChartDataPoint 
} from '@/services/progressService';

// Custom Tooltip for a unified look
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg backdrop-blur-sm bg-opacity-95 z-50">
        <p className="font-bold text-slate-800 dark:text-slate-200 text-xs mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-500" />
          <p className="text-slate-600 dark:text-slate-300 font-medium text-sm">
            Score: <span className="font-bold text-slate-900 dark:text-white">{payload[0].value.toFixed(1)}%</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const ProgressLineChart = () => {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const loadChartData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const progressData = await fetchGlobalProgress();
        setData(progressData.score_over_time);
      } catch (err: any) {
        setError(err.message || 'Failed to load chart data.');
      } finally {
        setIsLoading(false);
      }
    };

    loadChartData();
  }, []);

  if (isLoading) {
    return <div className="flex h-full items-center justify-center text-slate-400 text-xs animate-pulse">Loading Chart...</div>;
  }

  if (error) {
    return <div className="flex h-full items-center justify-center text-red-500 text-xs">{error}</div>;
  }

  if (!isClient) return null;

  if (data.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-slate-400 text-center p-4">
        <p className="text-xl mb-2">📈</p>
        <p className="text-sm">No quiz history found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 sm:p-6">
      
      {/* Standardized Gradient Header */}
      <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 mb-5 pb-4 border-b border-slate-300 dark:border-slate-700 shrink-0">
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
          Progress Over Time
        </span>
      </h2>

      <div className="flex-grow min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.1} />
            
            <XAxis 
              dataKey="label" 
              axisLine={false} 
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
              dy={10}
              minTickGap={30}
            />
            
            <YAxis 
              axisLine={false} 
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 11 }}
              domain={[0, 100]} 
              dx={-5}
            />
            
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '3 3' }} />
            
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="url(#lineGradient)" 
              strokeWidth={3}
              dot={{ fill: '#fff', stroke: '#f97316', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }}
              animationDuration={1500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ProgressLineChart;