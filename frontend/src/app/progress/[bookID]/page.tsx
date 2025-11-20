//C:\Users\mohsi\Projects\learn-ease-fyp\frontend\src\app\progress\[bookID]\page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { fetchBookDetails } from "@/services/bookService"; 

// --- Import our components ---
import TopicCompletionList from "@/components/TopicCompletionList";
import ProgressTopicBarChart from "@/components/ProgressTopicBarChart";
import RecommendationPanel from "@/components/RecommendationPanel";

// --- Icons ---
const SpinnerIcon = ({ className = "h-5 w-5 text-white" }: { className?: string }) => (
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const GlobalStyles = () => (
  <style jsx global>{`
    /* Update Card Style: Full Opaque White for better separation */
    .learn-ease-card {
      background-color: #ffffff; 
      border-radius: 1rem; /* More rounded */
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      border: 1px solid rgba(226, 232, 240, 1);
      height: 100%; /* Force card to fill grid cell */
      display: flex;
      flex-direction: column;
    }
    html.dark .learn-ease-card {
      background-color: rgba(30, 41, 59, 0.95);
      border-color: rgba(51, 65, 85, 0.8);
    }
    
    /* Darker Polka Dots */
    :root {
      /* Darker grey dots (94a3b8) with higher opacity for the slate-200 background */
      --dot-pattern-url: url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1.5' cy='1.5' r='1.5' fill='%2394a3b8' fill-opacity='0.4'/%3E%3C/svg%3E");
    }
    html.dark {
      --dot-pattern-url: url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1' cy='1' r='1' fill='%23cbd5e1' fill-opacity='0.1'/%3E%3C/svg%3E");
    }
  `}</style>
);

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
        const bookDetails = await fetchBookDetails(bookId);
        setBookTitle(bookDetails.title);
      } catch (err: any) {
        console.error("Failed to fetch book title:", err);
        setError(err.message || "Failed to load book details.");
      } finally {
        setIsLoading(false);
      }
    };
    loadBookTitle();
  }, [bookId]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="h-full flex flex-col items-center justify-center">
          <SpinnerIcon className="h-12 w-12 text-orange-500 mx-auto" />
          <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">Loading Book Details...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="h-full flex items-center justify-center p-10">
          <div className="text-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-8 rounded-xl border border-red-200 dark:border-red-800 shadow-lg">
            <h3 className="text-2xl font-semibold mb-2">Error Loading Page</h3>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      );
    }

    // --- GRID LAYOUT ---
    return (
      <div className="flex-grow w-full p-6 pt-0 min-h-0">
        {/* gap-6: Increases space between cards 
           z-0: establishes stacking context
        */}
        <div className="grid grid-cols-12 grid-rows-2 gap-6 h-full w-full">
            
            {/* TOP ROW (Height 50%) */}
            {/* We add z-10 to the top row so if shadows overlap, they go OVER the bottom chart */}
            
            {/* TOP LEFT: Personalized Study Plan */}
            <div className="col-span-6 row-span-1 min-h-0 z-10">
                 {/* RecommendationPanel has .learn-ease-card internally */}
                 <RecommendationPanel bookId={bookId} />
            </div>

            {/* TOP RIGHT: Topic Breakdown */}
            <div className="col-span-6 row-span-1 min-h-0 z-10">
                {/* TopicCompletionList uses internal bg-white classes. 
                   We wrap it in 'learn-ease-card' here to enforce consistency 
                   if the component itself doesn't have the shadow/height styles perfect.
                   (Assuming you removed the outer wrapper in the component file as requested previously, 
                    or we can just let it live inside this wrapper for safety).
                */}
                 <div className="learn-ease-card">
                    <TopicCompletionList bookId={bookId} />
                 </div>
            </div>

            {/* BOTTOM: Performance by Topic */}
            <div className="col-span-12 row-span-1 min-h-0 z-0">
                {/* Chart component also has .learn-ease-card internally usually, but we can wrap to be safe or let it be */}
                <ProgressTopicBarChart bookId={bookId} />
            </div>

        </div>
      </div>
    );
  };

  return (
    // Updated background to slate-200 for darker look
    <div
      className="h-screen w-full overflow-hidden flex flex-col text-slate-900 dark:text-slate-100 bg-slate-200 dark:bg-slate-950 transition-colors duration-500"
      style={{ backgroundImage: "var(--dot-pattern-url)" }}
    >
      <GlobalStyles />
      
      {/* HEADER */}
      <header className="flex-shrink-0 w-full px-6 py-5 z-20">
          <div>
            <Link
              href="/dashboard"
              className="group inline-flex items-center text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors mb-1"
            >
              <span className="mr-1 transform group-hover:-translate-x-1 transition-transform">←</span> 
              Back to Dashboard
            </Link>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight truncate drop-shadow-sm">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 via-red-500 to-red-600">
                Progress: 
              </span>
              <span className="text-slate-800 dark:text-slate-100 ml-2">
                {bookTitle || "Loading..."}
              </span>
            </h1>
          </div>
      </header>

      {/* MAIN CONTENT */}
      {renderContent()}
      
    </div>
  );
}