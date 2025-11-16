"use client";

import { useState, FormEvent } from 'react';

// --- Icons (from your dashboard file) ---
const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path d="M3.105 3.105a.75.75 0 011.06 0l11.25 11.25a.75.75 0 01-1.06 1.06L3.105 4.165a.75.75 0 010-1.06z" />
    <path d="M12.243 3.105a.75.75 0 011.06 0l4.5 4.5a.75.75 0 010 1.06l-4.5 4.5a.75.75 0 01-1.06-1.06L15.682 8l-3.44-3.435a.75.75 0 010-1.061z" />
  </svg>
);
// --- End Icons ---

interface MessageInputProps {
  // Callback to send the message
  onSubmit: (content: string) => Promise<void>; // Simplified: only sends content
}

const MessageInput = ({ onSubmit }: MessageInputProps) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content); // Only pass content
      setContent('');    // Clear input on success
    } catch (error) {
      console.error("Failed to send message:", error);
      // Let the parent component show the error
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-700/80">
      {/* --- Reply Context Box (REMOVED) --- */}

      {/* --- Text Input Form --- */}
      <form onSubmit={handleSubmit} className="flex items-start space-x-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleSubmit(e as any);
            }
          }}
          placeholder="Type your message... (Ctrl+Enter to send)"
          className="flex-1 p-3 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white/70 dark:bg-slate-700/80 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 resize-none"
          rows={3}
          disabled={isSubmitting}
        />
        <button
          type="submit"
          disabled={isSubmitting || !content.trim()}
          className="flex-shrink-0 p-3 h-[74px] bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg shadow-md hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-2 ring-offset-2 dark:ring-offset-slate-900 ring-red-500 transition-all duration-150 ease-in-out transform hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <SendIcon />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;