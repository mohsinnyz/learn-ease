"use client";

import React, { useEffect, useState } from "react";
// import Link from "next/link"; // <-- Removed Link import
import {
  getAIGlobalRecommendations,
  AIGlobalRecommendationResponse,
  AIGlobalStudyRecommendation,
  GlobalRecommendationAction,
} from "@/services/aiService";

// --- Icons ---
const SpinnerIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
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


// --- [REMOVED] ---
// The getActionLink function is no longer needed.
// --- [END REMOVED] ---

const GlobalRecommendationCard: React.FC<{ rec: AIGlobalStudyRecommendation }> = ({ rec }) => {
  const styles =
    rec.priority === "High"
      ? {
          borderColor: "border-red-500",
          textColor: "text-red-700 dark:text-red-400",
        }
      : {
          borderColor: "border-yellow-500",
          textColor: "text-yellow-700 dark:text-yellow-400",
        };

  return (
    <div
      className={`relative w-full rounded-lg border-l-4 p-4 ${styles.borderColor} bg-slate-50 dark:bg-slate-800/50 mb-4 shadow-sm`}
    >
      <span
        className={`absolute top-4 right-4 text-xs font-semibold ${styles.textColor}`}
      >
        {rec.priority} Priority
      </span>
      <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
        {rec.title}
      </h4>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        {rec.recommendation_text}
      </p>

      {/* --- [REMOVED] --- */}
      {/* The entire Link/button block has been removed. */}
      {/* --- [END REMOVED] --- */}
    </div>
  );
};


export const GlobalRecommendationPanel: React.FC = () => {
  const [data, setData] = useState<AIGlobalRecommendationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getAIGlobalRecommendations();
        setData(result);
      } catch (err: any) {
        setError(err.message || "Failed to load AI recommendations.");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full min-h-[150px]">
          <SpinnerIcon className="w-8 h-8 text-orange-500" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full min-h-[150px] text-red-600 dark:text-red-400">
          <p>Error: {error}</p>
        </div>
      );
    }

    if (!data || data.recommendations.length === 0) {
      return (
        <div className="flex items-center justify-center h-full min-h-[150px] text-slate-600 dark:text-slate-400">
          <p>No recommendations available right now.</p>
        </div>
      );
    }

    return (
      <div className="overflow-y-auto max-h-[280px] pr-2">
        {data.recommendations.map((rec, index) => (
          <GlobalRecommendationCard key={index} rec={rec} />
        ))}
      </div>
    );
  };

  return (
    <section className="learn-ease-card p-6 h-full flex flex-col">
      <h2 className="text-3xl font-semibold text-slate-800 dark:text-slate-100 mb-4 pb-4 border-b border-slate-300 dark:border-slate-700 flex items-center">
        Recommendations
      </h2>
      {renderContent()}
    </section>
  );
};

export default GlobalRecommendationPanel;