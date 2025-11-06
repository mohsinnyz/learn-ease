"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchGlobalProgress,
  GlobalProgressResponse,
} from "@/services/progressService";

// --- Import our new components ---
import ProgressLineChart from "@/components/ProgressLineChart";
import ProgressTopicBarChart from "@/components/ProgressTopicBarChart";
import ProgressGradePieChart from "@/components/ProgressGradePieChart";
import BadgePlaceholder from "@/components/BadgePlaceholder"; // Import the placeholder

// --- Icons (copied from your dashboard) ---
const SpinnerIcon = ({
  className = "h-5 w-5 text-white",
}: {
  className?: string;
}) => (
  <svg
    className={`animate-spin ${className}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);

const GlobalStyles = () => (
  // We include your card styles here to ensure they apply
  <style jsx global>{`
    .learn-ease-card {
      background-color: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(6px);
      border-radius: 0.75rem;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.07),
        0 4px 6px -2px rgba(0, 0, 0, 0.05);
      border-width: 1px;
      border-color: rgba(203, 213, 225, 0.5);
    }
    html.dark .learn-ease-card {
      background-color: rgba(30, 41, 59, 0.85);
      border-color: rgba(51, 65, 85, 0.8);
    }
    /* Define dot patterns from your dashboard */
    :root {
      --dot-pattern-url: url("data:image/svg+xml,%3Csvg width='15' height='15' viewBox='0 0 15 15' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='15' height='15' fill='none'/%3E%3Ccircle cx='7.5' cy='7.5' r='0.8' fill='%23A0AEC0' fill-opacity='0.3'/%3E%3C/svg%3E");
    }
    html.dark {
      --dot-pattern-url: url("data:image/svg+xml,%3Csvg width='15' height='15' viewBox='0 0 15 15' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='15' height='15' fill='none'/%3E%3Ccircle cx='7.5' cy='7.5' r='0.8' fill='%23CBD5E0' fill-opacity='0.15'/%3E%3C/svg%3E");
    }
  `}</style>
);

// --- A Stats Card (styled like your dashboard) ---
interface StatCardProps {
  title: string;
  value: string | number;
}
const StatCard = ({ title, value }: StatCardProps) => (
  <div className="learn-ease-card p-6 bg-white/50 dark:bg-slate-800/50">
    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
      {title}
    </h3>
    <p
      className="mt-1 text-3xl font-semibold text-slate-900 dark:text-slate-100 truncate"
      title={String(value)}
    >
      {value}
    </p>
  </div>
);

// --- The Main Page Component ---
export default function GlobalProgressPage() {
  const [data, setData] = useState<GlobalProgressResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // This fetches all global data in one go
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
  }, []); // Runs once on page load

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center py-20">
          <SpinnerIcon className="h-12 w-12 text-orange-500 mx-auto" />
          <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">
            Loading Progress Report...
          </p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="learn-ease-card p-10 text-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30">
          <h3 className="text-2xl font-semibold mb-2">Error Loading Report</h3>
          <p className="text-sm">{error}</p>
        </div>
      );
    }

    if (!data || data.stats.total_quizzes === 0) {
      return (
        <div className="learn-ease-card p-10 text-center text-slate-500 dark:text-slate-400">
          <h3 className="text-2xl font-semibold mb-2">No Data Yet</h3>
          <p>
            Your progress report is empty. Go take a quiz to see your stats!
          </p>
        </div>
      );
    }

    // Data is loaded, render the dashboard
    const { stats } = data;

    return (
      <div className="space-y-8">
        {/* --- 1. Stats Cards --- */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Total Quizzes Taken" value={stats.total_quizzes} />
          <StatCard
            title="Overall Average Score"
            value={`${stats.average_score}%`}
          />
          <StatCard
            title="Weakest Subject"
            value={stats.weakest_subject || "N/A"}
          />
        </section>

        {/* --- 2. Full-Width Line Chart --- */}
        <section className="learn-ease-card">
          <ProgressLineChart />
        </section>

        {/* --- 3. Charts (Bar & Pie) --- */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* We pass 'null' to bookId to tell this component to fetch global data */}
          <div className="learn-ease-card">
            <ProgressTopicBarChart bookId={null} />
          </div>
          <div className="learn-ease-card">
            <ProgressGradePieChart />
          </div>
        </section>

        {/* --- 4. Badges (Placeholder) --- */}
        <section>
          <BadgePlaceholder />
        </section>
      </div>
    );
  };

  return (
    <div
      className="min-h-screen text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8 bg-slate-100 dark:bg-slate-900 transition-colors duration-500"
      style={{ backgroundImage: "var(--dot-pattern-url)" }}
    >
      <GlobalStyles />
      <main className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-red-500 to-red-600">
              Global
            </span>
            <span className="text-slate-700 dark:text-slate-300"> Progress</span>
          </h1>
          <Link
            href="/dashboard"
            className="flex items-center px-4 py-2.5 bg-slate-600 text-white rounded-lg shadow-md hover:bg-slate-700 focus:outline-none focus:ring-2 ring-offset-2 dark:ring-offset-slate-900 ring-slate-500 transition-all duration-150 ease-in-out text-sm font-medium transform hover:scale-105 active:scale-95"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4 mr-1.5"
            >
              <path
                fillRule="evenodd"
                d="M17 10a.75.75 0 01-.75.75H5.638l3.12 3.96a.75.75 0 11-1.04 1.08l-4.5-5.25a.75.75 0 010-1.08l4.5-5.25a.75.75 0 111.04 1.08L5.638 9.25H16.25A.75.75 0 0117 10z"
                clipRule="evenodd"
              />
            </svg>
            Back to Dashboard
          </Link>
        </div>
        {renderContent()}
      </main>
    </div>
  );
}