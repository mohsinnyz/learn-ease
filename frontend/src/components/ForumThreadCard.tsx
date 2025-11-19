"use client";

import { useState } from 'react';
import Link from 'next/link';
import { ForumThreadPublic, voteOn, VoteType } from '@/services/forumService';

// --- Icons ---
const UpArrowIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" /></svg> );
const DownArrowIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" /></svg> );
const ChatBubbleIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 mr-2"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443h2.88a1.875 1.875 0 001.875-1.875V12.76c0-1.6-1.123-2.994-2.707-3.227-1.087-.16-2.185-.283-3.293-.369V6.75A2.25 2.25 0 019 4.5h11.25a2.25 2.25 0 012.25 2.25v.093c0 1.6-1.123 2.994-2.707 3.227-1.087.16-2.185-.283-3.293-.369v-2.155m-6.223-2.155A3.375 3.375 0 009 6.75v2.155" /></svg> );
const UserIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white"><path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" /></svg> );

// --- Simple Avatar ---
const SimpleAvatar = () => (
  <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center shadow-sm flex-shrink-0 mr-2.5">
    <UserIcon />
  </div>
);

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m ago";
  return "just now";
}

interface ForumThreadCardProps {
  thread: ForumThreadPublic;
  hideContent?: boolean; // (NEW) Optional prop to hide the preview text
}

const ForumThreadCard = ({ thread, hideContent = false }: ForumThreadCardProps) => {
  const [voteScore, setVoteScore] = useState(thread.upvote_count - thread.downvote_count);
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async (voteType: VoteType) => {
    if (isVoting) return;
    setIsVoting(true);
    try {
      const newVotes = await voteOn('thread', thread.id, voteType);
      setVoteScore(newVotes.upvote_count - newVotes.downvote_count);
    } catch (error: any) {
      console.error("Vote failed:", error.message);
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="flex bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:border-orange-300 dark:hover:border-orange-700 transition-all duration-200 hover:shadow-lg group h-full">
      
      {/* --- 1. Vote Sidebar --- */}
      <div className="flex flex-col items-center pt-3 pb-3 bg-slate-50 dark:bg-slate-900/40 w-14 sm:w-16 border-r border-slate-100 dark:border-slate-700/50">
        <button onClick={() => handleVote('upvote')} disabled={isVoting} className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-100 dark:hover:bg-slate-700 rounded-lg transition-all">
          <UpArrowIcon />
        </button>
        <span className={`text-xl font-extrabold my-1 ${voteScore > 0 ? 'text-orange-600 dark:text-orange-500' : 'text-slate-700 dark:text-slate-300'}`}>
          {voteScore}
        </span>
        <button onClick={() => handleVote('downvote')} disabled={isVoting} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-slate-800 rounded-lg transition-all">
          <DownArrowIcon />
        </button>
      </div>

      {/* --- 2. Content Area --- */}
      <div className="flex-grow p-4 sm:p-5 min-w-0 flex flex-col justify-between">
        <div>
          {/* Header Metadata */}
          <div className="flex items-center text-sm font-medium text-slate-500 dark:text-slate-400 mb-1.5">
            {thread.book_id && (
              <span className="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300 px-2.5 py-0.5 rounded-full font-semibold text-xs mr-3 border border-indigo-100 dark:border-indigo-800 tracking-wide uppercase">
                Book Related
              </span>
            )}
            <div className="flex items-center">
              <SimpleAvatar />
              <span className="font-bold text-slate-700 dark:text-slate-200 mr-2">
                {thread.author.firstname} {thread.author.lastname}
              </span>
              <span className="opacity-60 text-xs">&bull; {timeAgo(thread.created_at)}</span>
            </div>
          </div>

          {/* Title */}
          <Link href={`/forum/${thread.id}`} className="block group-hover:opacity-90 transition-opacity">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mb-1.5 leading-tight tracking-tight">
              {thread.title}
            </h2>
            {/* (MODIFIED) Only show preview if hideContent is false */}
            {!hideContent && (
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 line-clamp-2 mb-2 leading-relaxed font-normal">
                {thread.content}
              </p>
            )}
          </Link>
        </div>

        {/* Footer: Tags & Comments */}
        <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-100 dark:border-slate-700/50">
           <div className="flex flex-wrap gap-2">
            {thread.tags?.map((tag) => (
              <span key={tag} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-slate-700 transition-colors cursor-default">
                #{tag}
              </span>
            ))}
          </div>
          <Link href={`/forum/${thread.id}`} className="flex items-center px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg transition-colors ml-4">
            <ChatBubbleIcon />
            {thread.reply_count} <span className="hidden sm:inline ml-1">{thread.reply_count === 1 ? 'Comment' : 'Comments'}</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForumThreadCard;