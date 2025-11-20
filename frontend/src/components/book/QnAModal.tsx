"use client";

import { Modal } from "./Modal";
import { SpinnerIcon } from "./Icons";
import { QuestionAnswerPair } from "@/services/bookService"; // Matches your existing service path

interface QnAModalProps {
  isOpen: boolean;
  onClose: () => void;
  isGenerating: boolean;
  qnaPairs: QuestionAnswerPair[] | null;
  error: string | null;
}

export const QnAModal = ({
  isOpen,
  onClose,
  isGenerating,
  qnaPairs,
  error,
}: QnAModalProps) => {
  
  const title = error
    ? "Q&A Generation Error"
    : isGenerating
    ? "Generating Q&A..."
    : qnaPairs && qnaPairs.length > 0
    ? "Generated Questions & Answers"
    : "Questions & Answers";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {isGenerating && (
        <div className="text-center py-4">
          <SpinnerIcon className="w-8 h-8 text-orange-500 mx-auto mb-2" />
          <p className="text-slate-600 dark:text-slate-300">
            Please wait, AI is generating questions and answers...
          </p>
        </div>
      )}
      
      {error && (
        <p className="text-red-500 dark:text-red-400 p-2 text-sm">{error}</p>
      )}
      
      {!isGenerating && qnaPairs && qnaPairs.length > 0 && (
        <div className="max-h-[70vh] overflow-y-auto p-1 space-y-4 text-sm">
          {qnaPairs.map((pair, index) => (
            <div
              key={index}
              className="p-3 bg-slate-100/50 dark:bg-slate-700/50 rounded-md shadow-sm"
            >
              <p className="font-semibold text-orange-600 dark:text-orange-400 mb-1">
                Question {index + 1}:
              </p>
              <p className="text-slate-800 dark:text-slate-200 mb-2">
                {pair.question}
              </p>
              <p className="font-semibold text-sky-600 dark:text-sky-400 mb-1">
                Answer:
              </p>
              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans">
                {pair.answer}
              </p>
            </div>
          ))}
        </div>
      )}
      
      {!isGenerating && !error && (!qnaPairs || qnaPairs.length === 0) && (
        <p className="text-slate-500 dark:text-slate-400 p-2">
          No questions and answers to display.
        </p>
      )}
    </Modal>
  );
};