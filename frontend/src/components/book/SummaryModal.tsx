"use client";

import { Modal } from "./Modal";
import { SpinnerIcon } from "./Icons";

interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSummarizing: boolean;
  summary: string | null;
  error: string | null;
}

export const SummaryModal = ({ 
  isOpen, 
  onClose, 
  isSummarizing, 
  summary, 
  error,
}: SummaryModalProps) => {
  
  const modalTitle = error 
    ? "Error" 
    : isSummarizing 
      ? "Generating..." 
      : "Summary";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} maxWidth="max-w-4xl">
       {/* CSS to hide scrollbar but allow scrolling */}
       <style>{`
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>

      {isSummarizing && (
        <div className="text-center py-12">
          <SpinnerIcon className="w-12 h-12 text-orange-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Reading Content...</h2>
          <p className="text-slate-600 dark:text-slate-300 animate-pulse">
             AI is condensing the text into a concise summary.
          </p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
            <p className="text-red-500 dark:text-red-400 text-lg font-medium mb-2">Summarization Failed</p>
            <p className="text-slate-600 dark:text-slate-300 text-sm">{error}</p>
        </div>
      )}
      
      {summary && !isSummarizing && (
        <div className="max-h-[65vh] overflow-y-auto p-4 scrollbar-hide">
            <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
                <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap font-sans leading-loose text-lg">
                    {summary}
                </p>
            </div>
        </div>
      )}
      
      {!isSummarizing && !summary && !error && (
        <div className="py-12 text-center">
            <p className="text-slate-500 dark:text-slate-400 italic text-lg">No summary generated yet.</p>
        </div>
      )}
    </Modal>
  );
};