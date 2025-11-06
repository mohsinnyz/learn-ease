"use client";

import { useEffect, useState } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  fetchGlobalProgress, 
  ChartDataPoint 
} from '@/services/progressService';

const ProgressLineChart = () => {
  const [data, setData] = useState<ChartDataPoint[]>([]);
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
        setData(progressData.score_over_time);
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
        No quiz data available. Take a quiz to see your progress!
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow h-80"> {/* Set a fixed height */}
      <h3 className="text-lg font-semibold mb-3 text-gray-800">Progress Over Time</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 20,
            left: 0,
            bottom: 20,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="label" 
            name="Date"
            tick={{ fontSize: 10 }}
          />
          <YAxis 
            domain={[0, 100]} // Scores are 0-100
            label={{ value: 'Score %', angle: -90, position: 'insideLeft', offset: 10 }}
          />
          <Tooltip 
            formatter={(value: number) => [`${value.toFixed(1)}%`, "Score"]}
          />
          <Legend wrapperStyle={{ paddingTop: 20 }} />
          <Line 
            type="monotone" 
            dataKey="value" 
            name="Score" 
            stroke="#8884d8" 
            activeDot={{ r: 8 }} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProgressLineChart;