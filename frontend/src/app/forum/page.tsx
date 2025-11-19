// frontend/src/app/forum/page.tsx
"use client";

import { useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import { UserPublic, fetchUserProfile } from '@/services/authService';
import { ForumThreadPublic, fetchForumThreads } from '@/services/forumService';
import ForumThreadCard from '@/components/ForumThreadCard';
import CreateThreadModal from '@/components/CreateThreadModal';

// --- Icons ---
const SpinnerIcon = ({className = "h-8 w-8 text-orange-500"} : {className?: string}) => ( <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>);
const PlusIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" /></svg> );
const SearchIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 text-slate-400"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg> );
const ArrowLeftIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 mr-1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg> );

// --- Styles ---
// I slightly darkened the dot color to make it visible on the darker background
const lightModeDotPatternUrl = "url(\"data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1.5' fill='%2394a3b8' fill-opacity='0.2'/%3E%3C/svg%3E\")";
const darkModeDotPatternUrl = "url(\"data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1.5' fill='%23334155' fill-opacity='0.6'/%3E%3C/svg%3E\")";

const GlobalStyles = () => (
  <style jsx global>{`
    :root { --dot-pattern-url: ${lightModeDotPatternUrl}; }
    html.dark { --dot-pattern-url: ${darkModeDotPatternUrl}; }
    html { scroll-behavior: smooth; }
    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }
  `}</style>
);

export default function ForumPage() {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [threads, setThreads] = useState<ForumThreadPublic[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadThreads = async (query?: string) => {
    setIsSearching(true); 
    try {
      const data = await fetchForumThreads(query);
      setThreads(data);
    } catch (err: any) {
      console.error("Search failed", err);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const initPage = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [userData, threadsData] = await Promise.all([
          fetchUserProfile(),
          fetchForumThreads() 
        ]);
        setUser(userData);
        setThreads(threadsData);
      } catch (err: any) {
        setError(err.message || "Failed to load forum.");
      } finally {
        setIsLoading(false);
      }
    };
    initPage();
  }, []);

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    loadThreads(searchQuery);
  };

  const handleThreadCreated = (newThread: ForumThreadPublic) => {
    setThreads(prevThreads => [newThread, ...prevThreads]);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-32 animate-fadeIn">
          <SpinnerIcon />
          <p className="mt-4 text-lg font-medium text-slate-500 dark:text-slate-400">Gathering discussions...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 text-center max-w-2xl mx-auto shadow-sm">
          <h3 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">Unable to Load Forum</h3>
          <p className="text-slate-600 dark:text-slate-300">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 text-sm font-semibold text-red-600 hover:underline">Try Again</button>
        </div>
      );
    }

    return (
      <div className="space-y-6 pb-20">
        {/* Search Result Status */}
        {searchQuery && !isSearching && (
            <div className="flex items-center justify-between px-1 animate-fadeIn">
                <p className="text-slate-600 dark:text-slate-400 font-medium">
                    Found {threads.length} result{threads.length !== 1 && 's'} for <span className="text-orange-600 dark:text-orange-400 font-bold">"{searchQuery}"</span>
                </p>
                <button 
                    onClick={() => { setSearchQuery(''); loadThreads(''); }}
                    className="text-sm font-semibold text-slate-500 hover:text-orange-600 transition-colors"
                >
                    Clear Search
                </button>
            </div>
        )}

        {isSearching ? (
             <div className="py-24 text-center animate-pulse">
                 <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mx-auto mb-4"></div>
                 <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mx-auto"></div>
                 <p className="mt-6 text-slate-500 font-medium">Searching topics...</p>
             </div>
        ) : threads.length === 0 ? (
          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-16 text-center shadow-sm">
            <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                <SearchIcon />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
                {searchQuery ? "No matches found" : "Start the conversation"}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {searchQuery ? "Try adjusting your keywords or tags." : "There are no questions yet. Be the first to ask!"}
            </p>
            {!searchQuery && (
               <button onClick={() => setIsModalOpen(true)} className="mt-6 text-orange-600 font-bold hover:underline">Ask a Question Now</button>
            )}
          </div>
        ) : (
          threads.map((thread, index) => (
            <div key={thread.id} className="animate-slideUp" style={{ animationDelay: `${index * 50}ms` }}>
               <ForumThreadCard thread={thread} />
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <>
      <div 
        // --- CHANGED: Darkened backgrounds for higher contrast ---
        className="min-h-screen text-slate-900 dark:text-slate-100 p-6 sm:p-10 bg-slate-100 dark:bg-slate-950 transition-colors duration-500"
        style={{ backgroundImage: "var(--dot-pattern-url)" }}
      >
        <GlobalStyles />
        <main className="max-w-7xl mx-auto">
          
          {/* --- Breadcrumb --- */}
          <div className="mb-6">
            <Link href="/dashboard" className="inline-flex items-center text-orange-600 hover:text-orange-700 dark:text-orange-500 dark:hover:text-orange-400 transition-colors font-bold text-sm tracking-wide ">
              <ArrowLeftIcon />
              Back to Dashboard
            </Link>
          </div>

          {/* --- Hero Header --- */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
            <div>
              <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4 drop-shadow-sm">
                 {/* --- CHANGED: 'Study' is Orange, 'Forum' is Black --- */}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">Study</span> Forum
              </h1>
              <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl font-medium leading-relaxed">
                Collaborate, ask questions, and share knowledge with your peers.
              </p>
            </div>
            
            {/* --- Gradient Button --- */}
            <button 
              onClick={() => setIsModalOpen(true)}
              className="group relative inline-flex items-center justify-center px-8 py-4 text-base font-bold text-white transition-all duration-200 bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 rounded-2xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 overflow-hidden whitespace-nowrap ring-1 ring-white/20"
            >
              {/* Shine Effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-in-out" />
              
              <PlusIcon />
              <span className="ml-2">Ask a Question</span>
            </button>

          </div>

          {/* --- Glass Search Bar --- */}
          <div className="mb-12 sticky top-4 z-30">
            <form onSubmit={handleSearchSubmit} className="relative group shadow-xl shadow-slate-200/50 dark:shadow-black/50 rounded-2xl">
                <div className="absolute inset-0 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl" />
                
                <div className="relative flex items-center">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-orange-500 transition-colors">
                        <SearchIcon />
                    </div>
                    <input 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search topics, questions, or tags..."
                        className="block w-full pl-14 pr-32 py-5 text-lg bg-transparent border-2 border-transparent focus:border-orange-500/50 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-0 transition-all"
                    />
                    <div className="absolute right-2.5">
                        <button 
                            type="submit"
                            className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:from-orange-600 hover:to-red-700 transition-all transform active:scale-95"
                        >
                            Search
                        </button>
                    </div>
                </div>
            </form>
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

      {/* --- Animation Styles --- */}
      <style jsx global>{`
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideUp {
            animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            opacity: 0;
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .animate-fadeIn {
            animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </>
  );
}