"use client";

import { useEffect, useState } from 'react';
import { fetchBookProgress, TopicStatus } from '@/services/progressService';

interface TopicCompletionListProps {
  bookId: string;
}

// --- Helper Components ---

const LegendItem = ({ color, label }: { color: string, label: string }) => (
  <div className="flex items-center gap-1.5">
    <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
    <span className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
      {label}
    </span>
  </div>
);

// --- Sorting Logic ---
const extractChapterNumbers = (title: string): number[] => {
  const match = title.match(/^(\d+(\.\d+)*)/);
  if (!match) return [99999];
  return match[0].split('.').map(Number);
};

const compareTopics = (a: TopicStatus, b: TopicStatus) => {
  const numsA = extractChapterNumbers(a.topic_title);
  const numsB = extractChapterNumbers(b.topic_title);
  for (let i = 0; i < Math.max(numsA.length, numsB.length); i++) {
    const valA = numsA[i] || 0;
    const valB = numsB[i] || 0;
    if (valA !== valB) return valA - valB;
  }
  return 0;
};

const TopicItem = ({ topic }: { topic: TopicStatus }) => {
  const isCompleted = topic.status === 'completed';
  const isFailed = topic.status === 'failed';
  const scoreVal = topic.score ? Math.round(topic.score * 100) : 0;

  // Default Styles (Not started)
  let rowClass = 'bg-white dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50';
  
  // Color Logic for Completed/Failed items (Matches Legend)
  if (isCompleted || isFailed) {
    if (scoreVal > 75) {
      // Green
      rowClass = 'bg-green-100/60 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100';
    } else if (scoreVal > 60) {
      // Yellow
      rowClass = 'bg-yellow-100/60 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-900 dark:text-yellow-100';
    } else if (scoreVal > 50) {
      // Blue
      rowClass = 'bg-blue-100/60 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100';
    } else {
      // Red (<= 50)
      rowClass = 'bg-red-100/60 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100';
    }
  }

  return (
    <li className={`flex items-center justify-between p-3 mb-2 rounded-lg border transition-all duration-200 ${rowClass}`}>
      <span className="text-sm font-medium truncate pl-1">
        {topic.topic_title}
      </span>
      
      {(isCompleted || isFailed) && (
        <span className="text-xs font-bold px-2 py-1 rounded-md bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/10 shrink-0 ml-2">
          {scoreVal}%
        </span>
      )}
    </li>
  );
};

const TopicCompletionList = ({ bookId }: TopicCompletionListProps) => {
  const [topics, setTopics] = useState<TopicStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookId) return;
    const loadProgress = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchBookProgress(bookId);
        const sortedTopics = [...data.completion_status].sort(compareTopics);
        setTopics(sortedTopics);
      } catch (err: any) {
        setError(err.message || 'Failed to load topic progress.');
      } finally {
        setIsLoading(false);
      }
    };
    loadProgress();
  }, [bookId]);

  // --- Card Structure ---
  return (
    <div className="bg-white dark:bg-slate-800/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col h-full max-h-[600px]">
      
      {/* CSS to hide scrollbar but allow scrolling */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
        }
      `}</style>

      {/* HEADER with Legend */}
      <div className="p-4 sm:p-6 pb-0 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 pb-4 border-b border-slate-300 dark:border-slate-700 gap-4">
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
              Topic Breakdown
            </span>
          </h2>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-700/50">
            <LegendItem color="bg-green-500" label="> 75%" />
            <LegendItem color="bg-yellow-500" label="> 60%" />
            <LegendItem color="bg-blue-500" label="> 50%" />
            <LegendItem color="bg-red-500" label="≤ 50%" />
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="overflow-y-auto px-4 sm:px-6 pb-4 scrollbar-hide flex-grow">
        {isLoading && <div className="p-8 text-center text-slate-400 text-sm animate-pulse">Loading...</div>}
        {error && <div className="p-4 text-center text-red-500 text-sm">{error}</div>}
        {!isLoading && !error && topics.length === 0 && <div className="p-8 text-center text-slate-400 text-sm">No topics found.</div>}
        
        {!isLoading && !error && (
          <ul className="flex flex-col">
            {topics.map((topic) => (
              <TopicItem key={topic.topic_title} topic={topic} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default TopicCompletionList;