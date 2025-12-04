"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ForumThreadPublic, voteOn, VoteType, deleteForumThread } from '@/services/forumService';
import { timeAgo } from '@/lib/dateUtils'; 

// --- Icons ---
const UpArrowIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" /></svg> );
const DownArrowIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" /></svg> );
const ChatBubbleIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 mr-2"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443h2.88a1.875 1.875 0 001.875-1.875V12.76c0-1.6-1.123-2.994-2.707-3.227-1.087-.16-2.185-.283-3.293-.369V6.75A2.25 2.25 0 019 4.5h11.25a2.25 2.25 0 012.25 2.25v.093c0 1.6-1.123 2.994-2.707 3.227-1.087.16-2.185-.283-3.293-.369v-2.155m-6.223-2.155A3.375 3.375 0 009 6.75v2.155" /></svg> );
const UserIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white"><path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" /></svg> );
const TrashIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg> );

// (New Icons extracted from Dashboard)
const XMarkIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
    </svg>
);
const SpinnerIcon = ({className = "h-5 w-5 text-white"} : {className?: string}) => ( <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>);


// --- Simple Avatar ---
const SimpleAvatar = () => (
  <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center shadow-sm flex-shrink-0 mr-2.5">
    <UserIcon />
  </div>
);

// --- Polished Modal Component (Extracted from Dashboard) ---
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title: string;
}
  
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all duration-300">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all duration-300 scale-100 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] animate-fadeIn">
          {/* Header */}
          <div className="flex justify-between items-center px-8 py-6 border-b-2 border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-900 rounded-t-2xl">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-red-600">
                 {title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Close modal"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          
          {/* Body */}
          <div className="p-8 overflow-y-auto custom-scrollbar">
             {children}
          </div>
        </div>
      </div>
    );
};

interface ForumThreadCardProps {
  thread: ForumThreadPublic;
  hideContent?: boolean; 
  isDetailView?: boolean; 
  currentUserId?: string; 
}

const ForumThreadCard = ({ thread, hideContent = false, isDetailView = false, currentUserId }: ForumThreadCardProps) => {
  const router = useRouter();
  const [voteScore, setVoteScore] = useState(thread.upvote_count - thread.downvote_count);
  const [isVoting, setIsVoting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Custom Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const openDeleteModal = (e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation();
    setDeleteError(null);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteForumThread(thread.id);
      router.push('/forum'); 
    } catch (error: any) {
      setDeleteError(error.message || "Failed to delete thread");
      setIsDeleting(false);
    }
  };

  const Wrapper = isDetailView ? 'div' : Link;
  const wrapperProps = isDetailView ? {} : { href: `/forum/${thread.id}`, className: "block group-hover:opacity-90 transition-opacity" };
  const isAuthor = currentUserId === thread.author.id;

  return (
    <>
      <div className={`flex bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden ${!isDetailView ? 'hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-lg group cursor-pointer' : ''} transition-all duration-200 h-full`}>
        
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
            <div className="flex items-start justify-between mb-1.5">
              <div className="flex items-center text-sm font-medium text-slate-500 dark:text-slate-400">
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

              {/* DELETE BUTTON: Only show in detail view if author matches */}
              {isDetailView && isAuthor && (
                <button 
                  onClick={openDeleteModal} 
                  disabled={isDeleting}
                  title="Delete Thread"
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors -mt-1 -mr-1"
                >
                  <TrashIcon />
                </button>
              )}
            </div>

            {/* Title & Content Wrapper */}
            {/* @ts-ignore */}
            <Wrapper {...wrapperProps}>
              <h2 className={`text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mb-1.5 leading-tight tracking-tight ${isDetailView ? 'mb-4 border-b border-slate-100 dark:border-slate-700 pb-2' : ''}`}>
                {thread.title}
              </h2>
              
              {!hideContent && (
                <div className={`text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal prose prose-slate dark:prose-invert max-w-none prose-p:my-2 prose-headings:text-base prose-headings:my-2 ${isDetailView ? '' : 'line-clamp-2'}`}>
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        // Handle links explicitly
                        a: ({node, ...props}) => {
                          // Define common Blue and Underlined style
                          const linkStyle = "text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline decoration-blue-300 dark:decoration-blue-500 hover:decoration-blue-800 dark:hover:decoration-blue-300 transition-all font-medium";
                          
                          if (isDetailView) {
                            // In Detail View: Real clickable link
                            return <a target="_blank" rel="noopener noreferrer" className={linkStyle} {...props} />;
                          } else {
                            // In List View: Span mimicking link (avoids hydration error)
                            return <span className={linkStyle} {...props} />;
                          }
                        }
                      }}
                    >
                      {thread.content}
                    </ReactMarkdown>
                </div>
              )}
            </Wrapper>
          </div>

          {/* Footer: Tags & Comments */}
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 dark:border-slate-700/50">
             <div className="flex flex-wrap gap-2">
              {thread.tags?.map((tag) => (
                <span key={tag} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-slate-700 transition-colors cursor-default">
                  #{tag}
                </span>
              ))}
            </div>
            {!isDetailView && (
              <Link href={`/forum/${thread.id}`} className="flex items-center px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg transition-colors ml-4">
                  <ChatBubbleIcon />
                  {thread.reply_count} <span className="hidden sm:inline ml-1">{thread.reply_count === 1 ? 'Comment' : 'Comments'}</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* --- REUSABLE MODAL (DASHBOARD STYLE) --- */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Confirm Deletion">
        <div className="space-y-6">
            {deleteError && ( 
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 animate-pulse">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <p className="text-sm font-bold text-red-600 dark:text-red-400">{deleteError}</p>
                </div>
            )} 
            
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
                    Are you sure you want to delete <span className="font-bold text-slate-900 dark:text-white">&quot;{thread.title}&quot;</span>?
                </p>
                <p className="text-sm text-red-500 mt-2 font-bold uppercase tracking-wide">This action cannot be undone and will delete all replies.</p>
            </div>

            <div className="flex justify-end gap-3 pt-2"> 
                <button 
                    onClick={() => setShowDeleteModal(false)} 
                    disabled={isDeleting}
                    className="px-6 py-3 text-lg font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                    Cancel
                </button> 
                <button 
                    onClick={handleDelete} 
                    disabled={isDeleting} 
                    className="px-6 py-3 text-lg font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 shadow-lg shadow-red-500/30 hover:shadow-red-500/50 disabled:opacity-50 flex items-center justify-center transition-all transform hover:-translate-y-0.5"
                >
                    {isDeleting ? <SpinnerIcon/> : "Yes, Delete"}
                </button> 
            </div> 
        </div>
      </Modal>
    </>
  );
};

export default ForumThreadCard;