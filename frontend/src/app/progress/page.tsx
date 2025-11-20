//C:\Users\mohsi\Projects\learn-ease-fyp\frontend\src\app\progress\page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchGlobalProgress,
  GlobalProgressResponse,
} from "@/services/progressService";

// --- Import our components ---
import ProgressLineChart from "@/components/ProgressLineChart";
import ProgressTopicBarChart from "@/components/ProgressTopicBarChart";
import ProgressGradePieChart from "@/components/ProgressGradePieChart";
import BadgeSystem from "@/components/BadgeSystem"; 

// --- Icons ---
const SpinnerIcon = ({ className = "h-5 w-5 text-white" }: { className?: string }) => (
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const GlobalStyles = () => (
  <style jsx global>{`
    /* Unified Card Style: Opaque White */
    .learn-ease-card {
      background-color: #ffffff; 
      border-radius: 1rem;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      border: 1px solid rgba(226, 232, 240, 1);
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden; 
    }
    html.dark .learn-ease-card {
      background-color: rgba(30, 41, 59, 0.95);
      border-color: rgba(51, 65, 85, 0.8);
    }
    
    /* Darker Polka Dots */
    :root {
      --dot-pattern-url: url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1.5' cy='1.5' r='1.5' fill='%2394a3b8' fill-opacity='0.4'/%3E%3C/svg%3E");
    }
    html.dark {
      --dot-pattern-url: url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1' cy='1' r='1' fill='%23cbd5e1' fill-opacity='0.1'/%3E%3C/svg%3E");
    }
  `}</style>
);

// --- UPDATED STAT CARD (Matches Other Components) ---
interface StatCardProps {
  title: string;
  value: string | number;
}

const StatCard = ({ title, value }: StatCardProps) => (
  <div className="learn-ease-card p-5">
    
    {/* Header: Gradient Text + Bottom Border */}
    <h3 className="text-lg font-bold tracking-tight mb-3 pb-2 border-b border-slate-300 dark:border-slate-700">
      <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
        {title}
      </span>
    </h3>

    {/* Value: Solid Dark Slate (for contrast against the gradient header) */}
    <div className="flex-grow flex items-center">
      <p
        className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-slate-100 truncate"
        title={String(value)}
      >
        {value}
      </p>
    </div>
  </div>
);

export default function GlobalProgressPage() {
  const [data, setData] = useState<GlobalProgressResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadGlobalProgress = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const progressData = await fetchGlobalProgress();
        setData(progressData);
      } catch (err: any) {
        setError(err.message || "Failed to load global progress.");
      } finally {
        setIsLoading(false);
      }
    };
    loadGlobalProgress();
  }, []);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="h-full flex flex-col items-center justify-center">
          <SpinnerIcon className="h-12 w-12 text-orange-500 mx-auto" />
          <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">
            Loading Global Report...
          </p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="h-full flex items-center justify-center p-10">
          <div className="text-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-8 rounded-xl border border-red-200 dark:border-red-800 shadow-lg">
            <h3 className="text-2xl font-semibold mb-2">Error Loading Report</h3>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      );
    }

    if (!data || data.stats.total_quizzes === 0) {
      return (
        <div className="h-full flex items-center justify-center p-10">
             <div className="learn-ease-card p-10 text-center text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                <h3 className="text-2xl font-semibold mb-2">No Data Yet</h3>
                <p>Your progress report is empty. Go take a quiz to see your stats!</p>
            </div>
        </div>
      );
    }

    const { stats } = data;

    return (
      <div className="flex-grow w-full p-6 pt-0 min-h-0">
        <div className="grid grid-cols-12 grid-rows-[auto_1fr_1fr] gap-6 h-full w-full">
            
            {/* --- ROW 1: STAT CARDS --- */}
            <div className="col-span-4">
                 <StatCard title="Total Quizzes" value={stats.total_quizzes} />
            </div>
            <div className="col-span-4">
                 <StatCard title="Average Score" value={`${stats.average_score}%`} />
            </div>
            <div className="col-span-4">
                 <StatCard title="Improvement Needed" value={stats.weakest_subject || "None"} />
            </div>

            {/* --- ROW 2: LINE CHART + PIE CHART --- */}
            <div className="col-span-8 row-span-1 min-h-0">
                <div className="learn-ease-card">
                    <ProgressLineChart />
                </div>
            </div>
            <div className="col-span-4 row-span-1 min-h-0">
                <div className="learn-ease-card">
                    <ProgressGradePieChart />
                </div>
            </div>

            {/* --- ROW 3: BAR CHART + BADGES --- */}
             <div className="col-span-8 row-span-1 min-h-0">
                {/* This component handles its own card styling internally now */}
                <ProgressTopicBarChart bookId={null} />
            </div>
            <div className="col-span-4 row-span-1 min-h-0">
                 <div className="learn-ease-card">
                    <BadgeSystem />
                 </div>
            </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="h-screen w-full overflow-hidden flex flex-col text-slate-900 dark:text-slate-100 bg-slate-200 dark:bg-slate-950 transition-colors duration-500"
      style={{ backgroundImage: "var(--dot-pattern-url)" }}
    >
      <GlobalStyles />
      
      {/* HEADER */}
      <header className="flex-shrink-0 w-full px-6 py-4 z-20">
          <div>
            <Link
              href="/dashboard"
              className="group inline-flex items-center text-sm text-orange-500 hover:text-orange-600 transition-colors mb-1"
            >
              <span className="mr-1 transform group-hover:-translate-x-1 transition-transform">←</span> 
              Back to Dashboard
            </Link>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight truncate">
              {/* Global in Orange Gradient */}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-red-500 to-red-600">
                Global
              </span>
              {/* Progress in Black/Slate */}
              <span className="text-slate-900 dark:text-slate-100 ml-2">
                 Progress
              </span>
            </h1>
          </div>
      </header>

      {/* MAIN CONTENT */}
      {renderContent()}
      
    </div>
  );
}