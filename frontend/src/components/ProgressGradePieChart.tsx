"use client";

import { useEffect, useState, useMemo } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  fetchGlobalProgress, 
  PieChartDataPoint 
} from '@/services/progressService';

// Semantic Colors for Grades (A=Green, B=Blue, C=Yellow, D=Orange, F=Red)
const COLORS = ['#22c55e', '#3b82f6', '#eab308', '#f97316', '#ef4444'];

// Custom Tooltip
// We now accept 'total' as a prop to calculate percentage manually
const CustomTooltip = ({ active, payload, total }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const value = data.value;
    
    // Manual percentage calculation (Safe & Reliable)
    const percent = total > 0 ? ((value / total) * 100).toFixed(0) : 0;

    return (
      <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg backdrop-blur-sm bg-opacity-95 z-50">
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="w-3 h-3 rounded-full shadow-sm" 
            style={{ backgroundColor: data.payload.fill }} 
          />
          <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
            {data.name}
          </p>
        </div>
        
        <div className="pl-5 space-y-1">
            <p className="text-slate-600 dark:text-slate-300 font-medium text-xs flex justify-between gap-4">
            <span>Count:</span>
            <span className="font-bold text-slate-900 dark:text-white">{value}</span>
            </p>
            <p className="text-slate-600 dark:text-slate-300 font-medium text-xs flex justify-between gap-4">
            <span>Share:</span>
            <span className="font-bold text-slate-900 dark:text-white">{percent}%</span>
            </p>
        </div>
      </div>
    );
  }
  return null;
};

const ProgressGradePieChart = () => {
  const [data, setData] = useState<PieChartDataPoint[]>([]);
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
        setData(progressData.grade_distribution);
      } catch (err: any) {
        setError(err.message || 'Failed to load chart data.');
      } finally {
        setIsLoading(false);
      }
    };

    loadChartData();
  }, []);

  // Calculate total count to pass to tooltip
  const totalCount = useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.value, 0);
  }, [data]);

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
        <p className="text-xl mb-2">🍰</p>
        <p className="text-sm">No grades recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 sm:p-6">
      
      {/* Standardized Gradient Header */}
      <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 mb-5 pb-4 border-b border-slate-300 dark:border-slate-700 shrink-0">
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
          Grade Distribution
        </span>
      </h2>

      <div className="flex-grow min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data as any}
              cx="50%"
              cy="50%"
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
              labelLine={false}
              label={false}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]} 
                  stroke="rgba(255,255,255,0.5)"
                />
              ))}
            </Pie>
            {/* Pass the totalCount explicitly to the CustomTooltip */}
            <Tooltip content={<CustomTooltip total={totalCount} />} />
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '12px', color: '#64748b' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ProgressGradePieChart;