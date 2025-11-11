"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { UserPublic, fetchUserProfile } from '@/services/authService';
import { ForumThreadPublic, fetchForumThreads } from '@/services/forumService';
import ForumThreadCard from '@/components/ForumThreadCard';
import CreateThreadModal from '@/components/CreateThreadModal';

// --- Icons (from your dashboard) ---
const SpinnerIcon = ({className = "h-5 w-5 text-white"} : {className?: string}) => ( <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>);
const PlusIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1.5"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" /></svg> );

// --- Standardized Dot Patterns (from your dashboard) ---
const lightModeDotPatternUrl = "url(\"data:image/svg+xml,%3Csvg width='15' height='15' viewBox='0 0 15 15' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='15' height='15' fill='none'/%3E%3Ccircle cx='7.5' cy='7.5' r='0.8' fill='%23A0AEC0' fill-opacity='0.5'/%3E%3C/svg%3E\")";
const darkModeDotPatternUrl = "url(\"data:image/svg+xml,%3Csvg width='15' height='15' viewBox='0 0 15 15' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='15' height='15' fill='none'/%3E%3Ccircle cx='7.5' cy='7.5' r='0.8' fill='%23CBD5E0' fill-opacity='0.15'/%3E%3C/svg%3E\")";

const GlobalStyles = () => (
  <style jsx global>{`
    :root { 
      --dot-pattern-url: ${lightModeDotPatternUrl}; 
    }
    html.dark { --dot-pattern-url: ${darkModeDotPatternUrl}; }

    .learn-ease-card {
      background-color: rgba(255, 255, 255, 0.85); 
      backdrop-filter: blur(6px); 
      border-radius: 0.75rem; 
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.07), 0 4px 6px -2px rgba(0,0,0,0.05);
      border-width: 1px;
      border-color: rgba(203, 213, 225, 0.5); 
    }
    html.dark .learn-ease-card {
      background-color: rgba(30, 41, 59, 0.85); 
      border-color: rgba(51, 65, 85, 0.8); 
    }
  `}</style>
);
// --- End Style Imports ---


export default function ForumPage() {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [threads, setThreads] = useState<ForumThreadPublic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // We'll load the user's name and all the threads in parallel
    const loadPageData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Run fetches in parallel
        const [userData, threadsData] = await Promise.all([
          fetchUserProfile(),
          fetchForumThreads()
        ]);
        
        setUser(userData);
        setThreads(threadsData);
      } catch (err: any) {
        setError(err.message || "Failed to load forum. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPageData();
  }, []);

  const handleThreadCreated = (newThread: ForumThreadPublic) => {
    // Add the new thread to the top of the list for instant UI update
    setThreads(prevThreads => [newThread, ...prevThreads]);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center py-20">
          <SpinnerIcon className="h-12 w-12 text-orange-500 mx-auto" />
          <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">
            Loading Forum...
          </p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="learn-ease-card p-10 text-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30">
          <h3 className="text-2xl font-semibold mb-2">Error Loading Forum</h3>
          <p className="text-sm">{error}</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {threads.length === 0 ? (
          <div className="learn-ease-card p-10 text-center text-slate-500 dark:text-slate-400">
            <h3 className="text-2xl font-semibold mb-2">It's quiet in here...</h3>
            <p>Be the first to ask a question!</p>
          </div>
        ) : (
          threads.map(thread => (
            <ForumThreadCard key={thread.id} thread={thread} />
          ))
        )}
      </div>
    );
  };

  return (
    <>
      <div 
        className="min-h-screen text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8 bg-slate-100 dark:bg-slate-900 transition-colors duration-500"
        style={{ backgroundImage: "var(--dot-pattern-url)" }}
      >
        <GlobalStyles />
        <main className="max-w-4xl mx-auto"> {/* Max-width for a focused forum feed */}
          
          {/* --- Page Header --- */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b border-slate-300/70 dark:border-slate-700/70">
            <div>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-red-500 to-red-600">
                  Study
                </span>
                <span className="text-slate-700 dark:text-slate-300"> Forum</span>
              </h1>
              {user && (
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
                  Welcome, {user.firstname}!
                </p>
              )}
            </div>
            <div className="flex-shrink-0 mt-4 sm:mt-0 space-x-3">
               <Link href="/dashboard" className="px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-600 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 focus:outline-none focus:ring-2 ring-slate-400 transition-colors">
                Back to Dashboard
              </Link>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg shadow-lg hover:shadow-xl hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-2 ring-offset-2 dark:ring-offset-slate-900 ring-red-500 transition-all duration-150 ease-in-out text-sm font-medium transform hover:scale-105 active:scale-95"
              >
                <PlusIcon /> Ask a Question
              </button>
            </div>
          </div>

          {/* --- Main Content Feed --- */}
          {renderContent()}

        </main>
      </div>

      {/* --- Modal --- */}
      <CreateThreadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onThreadCreated={handleThreadCreated}
      />
    </>
  );
}