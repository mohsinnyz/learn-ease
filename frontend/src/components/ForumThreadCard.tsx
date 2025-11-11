"use client";

import { useState } from 'react';
import Link from 'next/link';
import { 
  ForumThreadPublic, 
  voteOn,
  VoteType 
} from '@/services/forumService';

// --- Icons (from your dashboard file) ---
const UpArrowIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19.5v-15m0 0l-6.75 6.75M12 4.5l6.75 6.75" />
  </svg>
);

const DownArrowIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m0 0l6.75-6.75M12 19.5l-6.75-6.75" />
  </svg>
);

const ChatBubbleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443h2.88a1.875 1.875 0 001.875-1.875V12.76M2.25 12.76A2.25 2.25 0 014.5 10.5h15a2.25 2.25 0 012.25 2.25v.093c0 1.6-1.123 2.994-2.707 3.227-1.087.16-2.185.283-3.293.369V17.25m-6.223 2.155a3.375 3.375 0 01-3.375-3.375V12.761c0-1.6 1.123-2.994 2.707-3.227 1.087-.16 2.185-.283 3.293-.369V6.75A2.25 2.25 0 019 4.5h11.25a2.25 2.25 0 012.25 2.25v.093c0 1.6-1.123 2.994-2.707 3.227-1.087.16-2.185.283-3.293.369v-2.155m-6.223-2.155A3.375 3.375 0 009 6.75v2.155" />
  </svg>
);
// --- End Icons ---

// Helper to format dates
function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
}

interface ForumThreadCardProps {
  thread: ForumThreadPublic;
}

const ForumThreadCard = ({ thread }: ForumThreadCardProps) => {
  // We use local state to provide immediate UI feedback on vote
  const [voteScore, setVoteScore] = useState(thread.upvote_count - thread.downvote_count);
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async (voteType: VoteType) => {
    if (isVoting) return;
    setIsVoting(true);
    
    // Note: We don't update the UI optimistically here,
    // we wait for the *true* count back from the server.
    try {
      const newVotes = await voteOn('thread', thread.id, voteType);
      setVoteScore(newVotes.upvote_count - newVotes.downvote_count);
    } catch (error: any) {
      console.error("Vote failed:", error.message);
      // We could add a toast notification here
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="learn-ease-card flex flex-row overflow-hidden group transition-all duration-300">
      {/* --- 1. Stats Gutter (Left Side) --- */}
      <div className="flex flex-col items-center justify-start flex-shrink-0 w-16 p-2 bg-slate-100/70 dark:bg-slate-700/50">
        <button
          onClick={() => handleVote('upvote')}
          disabled={isVoting}
          title="Upvote"
          className="p-1 rounded-md text-slate-500 hover:text-orange-500 hover:bg-orange-100 dark:hover:bg-slate-600 disabled:opacity-50"
        >
          <UpArrowIcon />
        </button>
        
        <span className="text-xl font-bold text-slate-800 dark:text-slate-100 my-1 select-none">
          {voteScore}
        </span>
        
        <button
          onClick={() => handleVote('downvote')}
          disabled={isVoting}
          title="Downvote"
          className="p-1 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-slate-600 disabled:opacity-50"
        >
          <DownArrowIcon />
        </button>
      </div>

      {/* --- 2. Main Content (Right Side) --- */}
      <div className="flex-grow p-4 min-w-0">
        {/* Thread Title (links to the thread page) */}
        <Link href={`/forum/${thread.id}`}>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors cursor-pointer">
            {thread.title}
          </h2>
        </Link>
        
        {/* Author & Time */}
        <div className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400 mt-1">
          <span>
            Posted by <strong>{thread.author.firstname} {thread.author.lastname}</strong>
          </span>
          <span className="hidden sm:inline">&middot;</span>
          <span className="hidden sm:inline">{timeAgo(thread.created_at)}</span>
        </div>

        {/* Tags & Reply Count */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4">
          <div className="flex flex-wrap gap-2">
            {thread.tags?.map((tag) => (
              <span 
                key={tag} 
                className="px-2.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-xs font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
          
          <div className="flex-shrink-0 text-sm font-medium text-slate-600 dark:text-slate-300 mt-3 sm:mt-0">
            <Link 
              href={`/forum/${thread.id}`} 
              className="flex items-center p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <ChatBubbleIcon />
              {thread.reply_count} {thread.reply_count === 1 ? 'Reply' : 'Replies'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForumThreadCard;