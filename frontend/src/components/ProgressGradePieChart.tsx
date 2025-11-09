"use client";

import { useEffect, useState } from 'react';
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

// Define colors for the pie slices
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const ProgressGradePieChart = () => {
  const [data, setData] = useState<PieChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  // This ensures recharts only renders on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const loadChartData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch global data
        const progressData = await fetchGlobalProgress();
        setData(progressData.grade_distribution);
      } catch (err: any) {
        setError(err.message || 'Failed to load chart data.');
      } finally {
        setIsLoading(false);
      }
    };

    loadChartData();
  }, []); // Only runs once on component mount

  if (isLoading) {
    return <div className="text-center p-4">Loading Chart...</div>;
  }

  if (error) {
    return <div className="text-center p-4 text-red-500">{error}</div>;
  }

  if (!isClient) {
    // Render nothing on the server to prevent hydration mismatch
    return null;
  }

  if (data.length === 0) {
    return (
      <div className="text-center p-4 text-gray-500">
        No grades to display. Take a quiz to see your results!
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow h-80"> {/* Set a fixed height */}
      <h3 className="text-lg font-semibold mb-3 text-gray-800">Grade Distribution</h3>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data as any} // <-- FIX 1: Cast data to 'any' for recharts
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
            label={(entry) => {
                if (typeof entry.percent === 'number') {
                    const percentValue = entry.percent * 100;
                    return `${percentValue.toFixed(0)}%`;
                }
                // If it's not a number (e.g., null/undefined), just return 0%
                return '0%';
            }}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number, name: string) => [value, name]}
          />
          <Legend
            layout="vertical"  // Stack items vertically
            align="right"       // Align the vertical list to the right
            verticalAlign="middle" // Center it vertically
           />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProgressGradePieChart;