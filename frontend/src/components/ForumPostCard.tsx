"use client";

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ForumPostPublic, voteOn, VoteType } from '@/services/forumService';
import { timeAgo } from '@/lib/dateUtils'; // <--- Imported central date utility

// --- Icons ---
const UpArrowIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" /></svg> );
const DownArrowIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" /></svg> );
const ReplyIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg> );
const UserIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white"><path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" /></svg> );

// --- LOCAL timeAgo REMOVED ---

// --- Simple Avatar ---
const SimpleAvatar = () => (
  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-sm flex-shrink-0 ring-2 ring-white dark:ring-slate-800">
    <UserIcon />
  </div>
);

interface ForumPostCardProps {
  post: ForumPostPublic;
  onReplyClick: (post: ForumPostPublic) => void;
  replies?: ForumPostPublic[];
  allPostsMap?: Map<string, ForumPostPublic[]>;
}

const ForumPostCard = ({ post, onReplyClick, replies, allPostsMap }: ForumPostCardProps) => {
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
    <div className="flex flex-col animate-fadeIn relative group/post">
      {/* --- The Post Itself --- */}
      <div className="flex flex-row">
        
        {/* 1. Stats Column (Reddit Style) */}
        <div className="flex flex-col items-center justify-start flex-shrink-0 w-8 pt-1 mr-2">
          <button 
            onClick={() => handleVote('upvote')} 
            disabled={isVoting} 
            className="p-1 text-slate-400 hover:text-orange-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-all"
            title="Upvote"
          >
            <UpArrowIcon />
          </button>
          
          <span className={`text-xs font-bold my-1 ${voteScore > 0 ? 'text-orange-600 dark:text-orange-500' : 'text-slate-500'}`}>
            {voteScore}
          </span>
          
          <button 
            onClick={() => handleVote('downvote')} 
            disabled={isVoting} 
            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-all"
            title="Downvote"
          >
            <DownArrowIcon />
          </button>
        </div>

        {/* 2. Content Body */}
        <div className="flex-grow min-w-0 pb-3">
          {/* Header */}
          <div className="flex items-center space-x-2 mb-1.5">
            <SimpleAvatar />
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {post.author.firstname} {post.author.lastname}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              &bull; {timeAgo(post.created_at)}
            </span>
          </div>

          {/* Content (Markdown) */}
          <div className="prose prose-sm prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-300 leading-relaxed">
             <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {post.content}
             </ReactMarkdown>
          </div>

          {/* Footer: Actions */}
          <div className="mt-2 flex items-center space-x-4">
              <button 
                onClick={() => onReplyClick(post)}
                className="flex items-center px-2 py-1 -ml-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                <ReplyIcon /> Reply
              </button>
          </div>
        </div>
      </div>

      {/* --- 3. Nested Replies with Thread Rail --- */}
      {replies && replies.length > 0 && (
        <div className="flex flex-col relative">
           {/* The Thread Line (Visual Guide) */}
           <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700 group-hover/post:bg-slate-300 dark:group-hover/post:bg-slate-600 transition-colors"></div>
           
           {/* Container for Children */}
           <div className="ml-8 sm:ml-10 mt-2">
             {replies.map(childPost => {
                const grandChildren = allPostsMap?.get(childPost.id);
                return (
                  <ForumPostCard 
                    key={childPost.id} 
                    post={childPost} 
                    onReplyClick={onReplyClick}
                    replies={grandChildren} 
                    allPostsMap={allPostsMap}
                  />
                );
             })}
           </div>
        </div>
      )}
    </div>
  );
};

export default ForumPostCard;