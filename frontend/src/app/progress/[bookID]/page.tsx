"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  fetchBookProgress,
  BookProgressResponse,
} from "@/services/progressService";
import { fetchBookDetails, Book } from "@/services/bookService"; // Assuming this is in bookService

// --- Import our new components ---
import TopicCompletionList from "@/components/TopicCompletionList";
import ProgressTopicBarChart from "@/components/ProgressTopicBarChart";
import RecommendationPanel from "@/components/RecommendationPanel"; // <-- 1. IMPORT THE NEW PANEL

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
  // ... (Your GlobalStyles component)
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

// --- The Main Page Component ---
export default function PerBookProgressPage() {
  const params = useParams();
  const bookId = params.bookID as string;

  const [bookTitle, setBookTitle] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookId) return;

    const loadBookTitle = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch book details to get the title
        const bookDetails = await fetchBookDetails(bookId);
        setBookTitle(bookDetails.title);
      } catch (err: any) {
        console.error("Failed to fetch book title:", err);
        setError(err.message || "Failed to load book details.");
      } finally {
        // We set loading to false *inside* this function,
        // but the components will manage their own loading state.
        setIsLoading(false);
      }
    };

    loadBookTitle();
  }, [bookId]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center py-20">
          <SpinnerIcon className="h-12 w-12 text-orange-500 mx-auto" />
          <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">
            Loading Book Details...
          </p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="learn-ease-card p-10 text-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30">
          <h3 className="text-2xl font-semibold mb-2">Error Loading Page</h3>
          <p className="text-sm">{error}</p>
        </div>
      );
    }

    // Data is loaded, render the dashboard
    return (
      <div className="space-y-8">
        
        {/* --- 2. ADD THE PANEL COMPONENT HERE --- */}
        <RecommendationPanel bookId={bookId} />

        {/*
          The components themselves will handle their own data fetching,
          loading, and error states using the bookId.
        */}
        <section className="learn-ease-card">
          <TopicCompletionList bookId={bookId} />
        </section>

        <section className="learn-ease-card">
          <ProgressTopicBarChart bookId={bookId} />
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
          <div>
            <Link
              href="/dashboard"
              className="text-sm text-blue-500 hover:underline"
            >
              &larr; Back to Dashboard
            </Link>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-red-500 to-red-600">
                Progress: 
              </span>
              <span className="text-slate-700 dark:text-slate-300 ml-3">
                {bookTitle || "Loading..."}
              </span>
            </h1>
          </div>
        </div>
        {renderContent()}
      </main>
    </div>
  );
}