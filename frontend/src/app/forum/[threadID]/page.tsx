"use client";

import { useEffect, useState, FormEvent, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

import { UserPublic, fetchUserProfile } from '@/services/authService';
import { 
  ForumThreadPublic, 
  ForumPostPublic, 
  fetchThreadDetails,
  createForumPost,
  ForumPostCreate
} from '@/services/forumService';
import ForumThreadCard from '@/components/ForumThreadCard';
import ForumPostCard from '@/components/ForumPostCard';

// --- Icons ---
const SpinnerIcon = ({className = "h-10 w-10 text-orange-500"} : {className?: string}) => ( <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>);
const XMarkIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>);
const ArrowLeftIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 mr-1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg> );

// Toolbar Icons
const BoldIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h5c2.21 0 4-1.79 4-4v-1c0-1.47-.85-2.75-2.1-3.43C19.7 11.74 20.5 10.48 20.5 9c0-2.21-1.79-4-4-4h-4.5zm-1 2h3.5c1.1 0 2 .9 2 2s-.9 2-2 2H11V5zm0 8h4c1.1 0 2 .9 2 2s-.9 2-2 2H11v-4z"/></svg>);
const ItalicIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/></svg>);
const ListIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/></svg>);
const CodeIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>);
const LinkIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>);

// Styles
const lightModeDotPatternUrl = "url(\"data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1.5' fill='%2394a3b8' fill-opacity='0.2'/%3E%3C/svg%3E\")";
const darkModeDotPatternUrl = "url(\"data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1.5' fill='%23334155' fill-opacity='0.6'/%3E%3C/svg%3E\")";

const GlobalStyles = () => (
  <style jsx global>{`
    :root { --dot-pattern-url: ${lightModeDotPatternUrl}; }
    html.dark { --dot-pattern-url: ${darkModeDotPatternUrl}; }
    html { scroll-behavior: smooth; }
  `}</style>
);

export default function ThreadDetailPage() {
  const params = useParams();
  const threadId = params.threadID as string;

  const [user, setUser] = useState<UserPublic | null>(null);
  const [thread, setThread] = useState<ForumThreadPublic | null>(null);
  const [posts, setPosts] = useState<ForumPostPublic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newPostContent, setNewPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<{ id: string; author: string; contentPreview: string } | null>(null);
  
  const replyFormRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!threadId) return;
    const loadPageData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [userData, threadData] = await Promise.all([
          fetchUserProfile(),
          fetchThreadDetails(threadId)
        ]);
        setUser(userData);
        setThread(threadData.thread);
        setPosts(threadData.posts);
      } catch (err: any) {
        setError(err.message || "Failed to load thread.");
      } finally {
        setIsLoading(false);
      }
    };
    loadPageData();
  }, [threadId]);

  // --- Tree Construction ---
  const { rootPosts, childrenMap } = useMemo(() => {
    const roots: ForumPostPublic[] = [];
    const mapping = new Map<string, ForumPostPublic[]>();
    posts.forEach(post => {
      if (post.parent_id) {
        if (!mapping.has(post.parent_id)) { mapping.set(post.parent_id, []); }
        mapping.get(post.parent_id)!.push(post);
      } else { roots.push(post); }
    });
    return { rootPosts: roots, childrenMap: mapping };
  }, [posts]);

  // --- Markdown Logic ---
  const insertMarkdown = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = newPostContent;
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);
    const newText = before + prefix + selection + suffix + after;
    setNewPostContent(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const handlePostReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newPostContent.trim()) { setPostError("Reply cannot be empty."); return; }
    setIsPosting(true);
    setPostError(null);

    const postData: ForumPostCreate = {
      thread_id: threadId,
      content: newPostContent.trim(),
      parent_id: replyTo?.id 
    };

    try {
      const newPost = await createForumPost(postData);
      setPosts(prevPosts => [...prevPosts, newPost]);
      setNewPostContent('');
      setReplyTo(null); 
    } catch (err: any) {
      setPostError(err.message || "Failed to post reply.");
    } finally {
      setIsPosting(false);
    }
  };

  const handleReplyClick = (post: ForumPostPublic) => {
    setReplyTo({
      id: post.id,
      author: `${post.author.firstname} ${post.author.lastname}`,
      contentPreview: post.content.substring(0, 60) + (post.content.length > 60 ? '...' : '')
    });
    setTimeout(() => {
      replyFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      textareaRef.current?.focus();
    }, 100);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-32">
          <SpinnerIcon />
          <p className="mt-4 text-lg font-medium text-slate-500 dark:text-slate-400">Loading Thread...</p>
        </div>
      );
    }

    if (error || !thread) {
      return (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 text-center max-w-2xl mx-auto">
          <h3 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">Error</h3>
          <p className="text-slate-600 dark:text-slate-300">{error || "Thread not found."}</p>
        </div>
      );
    }

    return (
      <>
        {/* 1. Main Question (Unified Card) */}
        <section className="mb-8 animate-fadeIn">
          <div className="relative z-10">
              {/* MODIFIED: Added currentUserId prop here */}
             <ForumThreadCard 
                thread={thread} 
                isDetailView={true} 
                currentUserId={user?.id}
             />
          </div>
        </section>

        {/* 2. Post a Reply Form */}
        <section className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 mb-8 shadow-sm" ref={replyFormRef}>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Post a Reply</h3>
          
          {/* "Replying to" Indicator */}
          {replyTo && (
            <div className="mb-4 flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-xl animate-fadeIn">
               <div className="text-sm text-slate-700 dark:text-slate-300">
                  <span className="font-bold text-orange-600 dark:text-orange-400 block mb-0.5">Replying to {replyTo.author}</span>
                  <span className="italic opacity-75 line-clamp-1">"{replyTo.contentPreview}"</span>
               </div>
               <button onClick={() => setReplyTo(null)} className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg"><XMarkIcon /></button>
            </div>
          )}

          <form onSubmit={handlePostReply}>
            <div className="border-2 border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-900 focus-within:border-orange-500/50 focus-within:ring-4 focus-within:ring-orange-500/10 transition-all">
                {/* Toolbar */}
                <div className="flex items-center gap-1 p-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <button type="button" onClick={() => insertMarkdown('**', '**')} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors" title="Bold"><BoldIcon /></button>
                    <button type="button" onClick={() => insertMarkdown('*', '*')} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors" title="Italic"><ItalicIcon /></button>
                    <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-2"></div>
                    <button type="button" onClick={() => insertMarkdown('- ')} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors" title="List"><ListIcon /></button>
                    <button type="button" onClick={() => insertMarkdown('```\n', '\n```')} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors" title="Code Block"><CodeIcon /></button>
                    <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-2"></div>
                    <button type="button" onClick={() => insertMarkdown('[Link Text](https://', ')')} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors" title="Link"><LinkIcon /></button>
                </div>

                {/* Text Area */}
                <textarea
                    ref={textareaRef}
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder={user ? (replyTo ? `Write your reply...` : `What are your thoughts, ${user.firstname}?`) : "Loading..."}
                    className="block w-full px-5 py-4 border-0 bg-transparent focus:ring-0 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-medium text-lg resize-y min-h-[160px]"
                    required
                    disabled={isPosting || !user}
                />
            </div>

            <div className="flex justify-between items-center mt-4">
               {postError ? (
                  <p className="text-sm text-red-600 font-medium bg-red-50 px-3 py-1 rounded-lg">{postError}</p>
               ) : (
                  <p className="text-xs text-slate-400 dark:text-slate-500">Markdown Supported</p>
               )}
              
              <button 
                type="submit" 
                disabled={isPosting || !user} 
                className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isPosting ? <SpinnerIcon className="h-5 w-5 text-white" /> : "Submit Reply"}
              </button>
            </div>
          </form>
        </section>

        {/* 3. Replies List */}
        <section className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-8 border-b border-slate-200 dark:border-slate-700 pb-4 flex items-center gap-2">
              <span className="bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-lg text-slate-700 dark:text-slate-200">{posts.length}</span>
              {posts.length === 1 ? 'Reply' : 'Replies'}
          </h3>
          <div className="space-y-8">
            {rootPosts.length > 0 ? (
              rootPosts.map(post => (
                <ForumPostCard 
                  key={post.id} 
                  post={post} 
                  onReplyClick={handleReplyClick} 
                  replies={childrenMap.get(post.id)} 
                  allPostsMap={childrenMap}          
                />
              ))
            ) : (
              <div className="text-center py-12">
                  <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">No replies yet. Be the first to join the discussion!</p>
              </div>
            )}
          </div>
        </section>
      </>
    );
  };

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100 p-6 sm:p-10 bg-slate-100 dark:bg-slate-950 transition-colors duration-500" style={{ backgroundImage: "var(--dot-pattern-url)" }}>
      <GlobalStyles />
      <main className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link href="/forum" className="inline-flex items-center text-orange-600 hover:text-orange-700 dark:text-orange-500 dark:hover:text-orange-400 transition-colors font-bold text-sm tracking-wide">
            <ArrowLeftIcon />
            Back to All Threads
          </Link>
        </div>
        {renderContent()}
      </main>
    </div>
  );
}