"use client";

import { useEffect, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { 
  fetchBookProgress, 
  fetchGlobalProgress, 
  ChartDataPoint 
} from '@/services/progressService';

interface ProgressTopicBarChartProps {
  bookId: string | null;
}

// Helper to get color class based on value (for Tooltip)
const getStatusColorClass = (value: number) => {
  if (value > 75) return 'bg-green-500';
  if (value > 60) return 'bg-yellow-500';
  if (value > 50) return 'bg-blue-500';
  return 'bg-red-500';
};

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    const dotColor = getStatusColorClass(value);

    return (
      <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg backdrop-blur-sm bg-opacity-95 z-50">
        <p className="font-bold text-slate-800 dark:text-slate-200 text-xs mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${dotColor}`} />
          <p className="text-slate-600 dark:text-slate-300 font-medium text-sm">
            Score: <span className="font-bold text-slate-900 dark:text-white">{value.toFixed(0)}%</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const ProgressTopicBarChart = ({ bookId }: ProgressTopicBarChartProps) => {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadChartData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        let rawData: ChartDataPoint[] = [];
        if (bookId) {
          const progressData = await fetchBookProgress(bookId);
          rawData = progressData.performance_by_topic;
        } else {
          const progressData = await fetchGlobalProgress();
          rawData = progressData.performance_by_subject;
        }
        setData(rawData);
      } catch (err: any) {
        setError(err.message || 'Failed to load chart data.');
      } finally {
        setIsLoading(false);
      }
    };

    loadChartData();
  }, [bookId]);

  // Helper to select Gradient ID based on value
  const getGradientId = (value: number) => {
    if (value > 75) return 'url(#colorSuccess)'; // Green
    if (value > 60) return 'url(#colorGood)';    // Yellow
    if (value > 50) return 'url(#colorAverage)'; // Blue
    return 'url(#colorPoor)';                    // Red
  };

  if (isLoading) {
    return <div className="flex h-full items-center justify-center text-slate-400 text-xs animate-pulse p-10">Loading Chart...</div>;
  }

  if (error) {
    return <div className="flex h-full items-center justify-center text-red-500 text-xs p-10">{error}</div>;
  }

  if (data.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-slate-400 text-center p-4 min-h-[200px]">
        <p className="text-xl mb-2">📊</p>
        <p className="text-sm">No quiz data available yet.</p>
      </div>
    );
  }

  const title = bookId ? 'Performance by Topic' : 'Performance by Subject';
  const minWidth = Math.max(100, data.length * 60);

  return (
    <div className="learn-ease-card p-4 sm:p-6 flex flex-col h-full bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
       {/* CSS to hide scrollbar but allow scrolling */}
       <style>{`
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
        }
      `}</style>

      {/* Gradient Title */}
      <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 mb-5 pb-4 border-b border-slate-300 dark:border-slate-700">
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
          {title}
        </span>
      </h2>
      
      {/* Horizontal Scroll Wrapper */}
      <div className="flex-grow overflow-x-auto scrollbar-hide pb-2">
        <div style={{ width: `${minWidth}px`, minWidth: '100%', height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              {/* Gradients Definitions */}
              <defs>
                {/* > 75: Green */}
                <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.9}/>
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0.3}/>
                </linearGradient>
                
                {/* > 60: Yellow */}
                <linearGradient id="colorGood" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#eab308" stopOpacity={0.9}/>
                  <stop offset="100%" stopColor="#eab308" stopOpacity={0.3}/>
                </linearGradient>

                {/* > 50: Blue */}
                <linearGradient id="colorAverage" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9}/>
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.3}/>
                </linearGradient>

                {/* <= 50: Red */}
                <linearGradient id="colorPoor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9}/>
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.3}/>
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.1} />
              
              <XAxis 
                dataKey="label" 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} 
                interval={0}
                dy={10}
                tickFormatter={(value) => value.length > 12 ? `${value.substring(0, 10)}..` : value}
              />
              
              <YAxis 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 11 }} 
                domain={[0, 100]} 
                dx={-5}
              />
              
              <Tooltip 
                content={<CustomTooltip />} 
                cursor={{ fill: 'rgba(148, 163, 184, 0.1)', radius: 4 }}
              />
              
              <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40} animationDuration={1000}>
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getGradientId(entry.value)} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ProgressTopicBarChart;