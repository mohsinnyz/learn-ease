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
  error 
}: SummaryModalProps) => {
  
  const title = error 
    ? "Summarization Error" 
    : isSummarizing 
      ? "Generating Summary..." 
      : summary 
        ? "Generated Summary" 
        : "Summary";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {isSummarizing && (
        <div className="text-center py-4">
          <SpinnerIcon className="w-8 h-8 text-orange-500 mx-auto mb-2" />
          <p className="text-slate-600 dark:text-slate-300">Please wait, AI is processing...</p>
        </div>
      )}
      
      {error && (
        <p className="text-red-500 dark:text-red-400 p-2 text-sm">{error}</p>
      )}
      
      {summary && !isSummarizing && (
        <div className="max-h-[60vh] overflow-y-auto p-1 text-sm">
          <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap font-sans">
            {summary}
          </p>
        </div>
      )}
      
      {!isSummarizing && !summary && !error && (
        <p className="text-slate-500 dark:text-slate-400">No summary details to display.</p>
      )}
    </Modal>
  );
};