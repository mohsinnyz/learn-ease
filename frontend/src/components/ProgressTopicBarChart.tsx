"use client";

import { useEffect, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  fetchBookProgress, 
  fetchGlobalProgress, 
  ChartDataPoint 
} from '@/services/progressService';

// Define props:
// - If bookId is provided, it fetches "Per-Book" data
// - If bookId is null, it fetches "Global" data
interface ProgressTopicBarChartProps {
  bookId: string | null;
}

const ProgressTopicBarChart = ({ bookId }: ProgressTopicBarChartProps) => {
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
        if (bookId) {
          // Fetch data for a single book (Performance by Topic)
          const progressData = await fetchBookProgress(bookId);
          setData(progressData.performance_by_topic);
        } else {
          // Fetch global data (Performance by Subject)
          const progressData = await fetchGlobalProgress();
          setData(progressData.performance_by_subject);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load chart data.');
      } finally {
        setIsLoading(false);
      }
    };

    loadChartData();
  }, [bookId]); // Re-fetch if bookId changes

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
        No quiz data available to display.
      </div>
    );
  }

  // Determine chart title based on context
  const title = bookId ? 'Performance by Topic' : 'Performance by Subject';

  return (
    <div className="p-4 bg-white rounded-lg shadow h-80"> {/* Set a fixed height */}
      <h3 className="text-lg font-semibold mb-3 text-gray-800">{title}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 5,
            right: 20, // Make space for Y-axis labels if long
            left: 0,
            bottom: 20, // Make space for X-axis labels
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="label" 
            angle={-15} // Angle labels if they overlap
            textAnchor="end"
            interval={0} // Show all labels
            tick={{ fontSize: 10 }} // Make labels smaller
          />
          <YAxis 
            domain={[0, 100]} // Scores are 0-100
            label={{ value: 'Avg Score %', angle: -90, position: 'insideLeft', offset: 10 }}
          />
          <Tooltip 
            formatter={(value: number) => [`${value.toFixed(1)}%`, "Avg Score"]}
          />
          <Legend wrapperStyle={{ paddingTop: 20 }} />
          <Bar 
            dataKey="value" 
            name={bookId ? "Avg. Topic Score" : "Avg. Subject Score"} 
            fill="#8884d8" 
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProgressTopicBarChart;