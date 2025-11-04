// frontend/src/components/StudyNotesPanel.tsx
"use client";

import useSWR from 'swr';
import { fetchBookTopics, BookTopic } from '@/services/bookService'; 

// --- Icons ---
const SpinnerIcon = ({className = "h-5 w-5 text-white"} : {className?: string}) => ( <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>);
const LightBulbIcon = (props: React.SVGProps<SVGSVGElement>) => ( 
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.354a15.054 15.054 0 01-4.5 0M12 3v2.25m0 0c-1.406 0-2.731.46-3.75 1.244S6.75 8.219 6.75 9.75V12m10.5-2.25V9.75c0-1.531-.75-2.756-1.75-3.506S13.406 5.25 12 5.25M12 3c2.975 0 5.625 1.244 7.5 3.219" />
    </svg>
);

interface StudyNotesPanelProps {
  bookId: string;
  generatingTopicId: string | null;
  onGenerate: (topicId: string) => void;
}

export const StudyNotesPanel: React.FC<StudyNotesPanelProps> = ({ bookId, generatingTopicId, onGenerate }) => {
  
  const {
    data: bookTopics,
    error: bookTopicsError,
    isLoading: isTopicsLoading
  } = useSWR<BookTopic[]>(
    [bookId, 'topics'], // Unique key for SWR
    async ([id]) => {
      const fetchedTopics = await fetchBookTopics(id);
      
      // --- (THIS IS THE FIX) ---
      // This regex checks if the trimmed title starts with a digit.
      const mainTopicRegex = /^\d/; 

      return fetchedTopics.filter(topic => {
        const trimmedTitle = topic.topic_title.trim();
        // Only keep topics that start with a number.
        return mainTopicRegex.test(trimmedTitle);
      });
      // --- END OF FIX ---
    },
    { 
      revalidateOnFocus: false, 
      revalidateOnReconnect: false 
    }
  );

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 rounded-xl shadow-md p-4 border border-slate-200 dark:border-slate-700">
      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-3 pb-3 border-b border-slate-300 dark:border-slate-700 flex items-center gap-2">
          <LightBulbIcon className="w-6 h-6 text-orange-500" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">Get Study Notes</span>
      </h3>
      
      {isTopicsLoading && (
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-sm"><SpinnerIcon className="w-5 h-5 text-orange-500" /> Loading Topics...</div>
      )}
      {bookTopicsError && (
          <p className="text-red-500 dark:text-red-400 text-sm">Error: Failed to load topics.</p>
      )}
      {!isTopicsLoading && bookTopics && bookTopics.length > 0 && (
          <>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Select a topic from the book's Table of Contents to generate notes.
          </p>
          <div className="max-h-[30vh] overflow-y-auto space-y-2 pr-2">
              {bookTopics.map((topic) => (
                  <button
                      key={topic.id}
                      onClick={() => onGenerate(topic.id)}
                      disabled={!!generatingTopicId} // Disable all buttons if one is loading
                      className="w-full text-left text-sm p-2.5 rounded-md text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600/70 transition-colors flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      <span className="truncate pr-2">{topic.topic_title}</span>
                      {generatingTopicId === topic.id && (
                          <SpinnerIcon className="w-4 h-4 text-orange-500 flex-shrink-0" />
                      )}
                  </button>
              ))}
          </div>
          </>
      )}
        {!isTopicsLoading && !bookTopicsError && (!bookTopics || bookTopics.length === 0) && (
          <p className="text-slate-500 dark:text-slate-400 text-sm">
              No numbered topics were found in this book's Table of Contents.
          </p>
        )}
    </div>
  );
};