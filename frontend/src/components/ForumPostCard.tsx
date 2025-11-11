"use client";

import { useState } from 'react';
import { 
  ForumPostPublic, 
  voteOn,
  VoteType,
  AuthorPublic
} from '@/services/forumService';
// We'll add edit/delete functionality later if needed

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

interface ForumPostCardProps {
  post: ForumPostPublic;
  // We can add the current user later for edit/delete buttons
  // currentUser: UserPublic | null; 
}

const ForumPostCard = ({ post }: ForumPostCardProps) => {
  const [voteScore, setVoteScore] = useState(post.upvote_count - post.downvote_count);
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async (voteType: VoteType) => {
    if (isVoting) return;
    setIsVoting(true);
    try {
      const newVotes = await voteOn('post', post.id, voteType);
      setVoteScore(newVotes.upvote_count - newVotes.downvote_count);
    } catch (error: any) {
      console.error("Vote failed:", error.message);
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="flex flex-row space-x-4">
      {/* --- 1. Stats Gutter (Left Side) --- */}
      <div className="flex flex-col items-center justify-start flex-shrink-0 w-16 p-2">
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
      <div className="flex-grow min-w-0 border-b border-slate-200 dark:border-slate-700 pb-4">
        {/* Author & Time */}
        <div className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400">
          <span>
            <strong>{post.author.firstname} {post.author.lastname}</strong>
          </span>
          <span>&middot;</span>
          <span>{timeAgo(post.created_at)}</span>
        </div>
        
        {/* Post Content */}
        <div className="prose prose-slate dark:prose-invert max-w-none mt-2 text-slate-800 dark:text-slate-200">
          {/* We'll use a simple <p> for now. We can add Markdown rendering later! */}
          <p>{post.content}</p>
        </div>
      </div>
    </div>
  );
};

export default ForumPostCard;