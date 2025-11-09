//C:\Users\mohsi\Projects\learn-ease-fyp\frontend\src\components\RecommendationPanel.tsx
"use client";

import React, { useEffect, useState } from "react";
import {
  getAIRecommendations,
  AIRecommendationResponse,
} from "@/services/aiService"; // Adjust path if needed
import RecommendationCard from "./RecommendationCard";

// (Copy the SpinnerIcon from your page.tsx or import it)
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

// Icon for the praise message
const PraiseIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9a2.25 2.25 0 00-2.25 2.25v.015c0 .138.112.25.25.25h13.5a.25.25 0 00.25-.25v-.015a2.25 2.25 0 00-2.25-2.25zM12.75 9.75v3.75m0 0l-3.75-3.75M12.75 13.5l3.75-3.75M12 21v-3.75c0-.621.504-1.125 1.125-1.125h1.5c.621 0 1.125.504 1.125 1.125V21M3 3v.01M3.828 3.828A9.75 9.75 0 0112 3c2.628 0 5.115.86 7.172 2.373M3.828 20.172A9.75 9.75 0 013 12c0-2.628.86-5.115 2.373-7.172M20.172 20.172A9.75 9.75 0 0112 21c-2.628 0-5.115-.86-7.172-2.373M20.172 3.828A9.75 9.75 0 0121 12c0 2.628-.86 5.115-2.373 7.172" />
  </svg>
);


interface RecommendationPanelProps {
  bookId: string;
}

const RecommendationPanel: React.FC<RecommendationPanelProps> = ({ bookId }) => {
  const [data, setData] = useState<AIRecommendationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRecommendations = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getAIRecommendations(bookId);
        setData(result);
      } catch (err: any) {
        setError(err.message || "Failed to load AI recommendations.");
      } finally {
        setIsLoading(false);
      }
    };

    loadRecommendations();
  }, [bookId]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-10">
          <SpinnerIcon className="w-8 h-8 text-orange-500" />
          <p className="ml-3 text-slate-600 dark:text-slate-300">
            Generating your study plan...
          </p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-4 text-center text-red-600 dark:text-red-400">
          <p>Error: {error}</p>
        </div>
      );
    }

    if (!data || (!data.recommendations.length && !data.strength_message)) {
      return (
        <div className="p-4 text-center text-slate-600 dark:text-slate-400">
          <p>
            No recommendations to show right now. Keep taking quizzes to get
            personalized feedback!
          </p>
        </div>
      );
    }

    return (
      <>
        {/* Praise for the strong topic */}
        {data.strength_message && (
          <div className="mb-4 rounded-lg border-l-4 border-green-500 bg-green-50 dark:bg-green-900/20 p-4 shadow-md">
            <p className="flex items-center font-semibold text-green-700 dark:text-green-400">
              <PraiseIcon className="w-5 h-5 mr-2 flex-shrink-0" />
              {data.strength_message}
            </p>
          </div>
        )}
        {/* List of recommendations */}
        {data.recommendations.map((rec, index) => (
          <RecommendationCard key={index} rec={rec} />
        ))}
      </>
    );
  };

  return (
    <section className="learn-ease-card p-4 sm:p-6">
      <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 mb-5 pb-4 border-b border-slate-300 dark:border-slate-700">
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
          Your Personalized Study Plan
        </span>
      </h2>
      <div className="max-h-[500px] overflow-y-auto pr-2">
        {renderContent()}
      </div>
    </section>
  );
};

export default RecommendationPanel;