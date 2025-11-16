"use client";

import Link from 'next/link';

// Icon from your dashboard file
const ChatBubbleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-32 h-32 text-slate-300 dark:text-slate-600">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-3.86 8.25-8.625 8.25a8.625 8.625 0 01-8.625-8.25m17.25 0c0-4.556-3.86-8.25-8.625-8.25S3.375 7.444 3.375 12m17.25 0v-.213C20.962 10.74 20.284 10 19.5 10c-.784 0-1.462.74-1.538 1.787v.426m-1.538 0A10.491 10.491 0 0112 8.625c-2.226 0-4.22.753-5.838 2.003m11.675 0A10.49 10.49 0 0012 8.625c-2.226 0-4.22.753-5.838 2.003m11.675 0a10.485 10.485 0 01-1.638 1.32c-.067.054-.136.106-.206.158m-9.83 0a10.485 10.485 0 00-1.638-1.32c-.067-.054-.136-.106-.206-.158m9.83 0A10.487 10.487 0 0012 13.375a10.487 10.487 0 00-1.838-.992" />
  </svg>
);

const ChatWindowEmptyState = () => {
  return (
    <div className="hidden sm:flex flex-col items-center justify-center h-full p-4">
      {/* We use your learn-ease-card style here for consistency */}
      <div className="learn-ease-card p-12 flex flex-col items-center">
        <ChatBubbleIcon />
        <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mt-4">
          Select a Conversation
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Choose a group or private message to start collaborating.
        </p>
      </div>
    </div>
  );
};

export default ChatWindowEmptyState;