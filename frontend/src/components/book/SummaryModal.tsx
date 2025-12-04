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

  // 1. Determine Title Text based on state (Consistent with StudyNotesModal)
  const titleText = error
    ? "Summarization Error"
    : isSummarizing
    ? "Generating Summary..."
    : summary
    ? "Generated Summary"
    : "Summary";

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      // 2. Pass Styled Gradient Heading to the Modal Prop
      title={
        <span className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
          {titleText}
        </span> as any
      }
      maxWidth="max-w-4xl"
    >
      
      {/* LOADING STATE */}
      {isSummarizing && (
        <div className="text-center py-12">
          <SpinnerIcon className="w-12 h-12 text-orange-500 mx-auto mb-6" />
          <p className="text-slate-600 dark:text-slate-300 animate-pulse text-lg font-medium">
             Reading content and summarizing...
          </p>
        </div>
      )}

      {/* ERROR STATE */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
            <p className="text-red-500 dark:text-red-400 font-medium">{error}</p>
        </div>
      )}

      {/* SUCCESS STATE */}
      {summary && !isSummarizing && (
        <div>
           {/* Manual header removed here to avoid duplication with the Modal Prop */}
           
            <div className="overflow-y-auto max-h-[60vh] pr-2">
                <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans leading-loose text-lg">
                    {summary}
                </p>
            </div>
        </div>
      )}
    </Modal>
  );
};