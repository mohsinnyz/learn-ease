"use client";

import { useEffect, useState, FormEvent } from 'react';
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
import ForumThreadCard from '@/components/ForumThreadCard'; // The card for the *main* post
import ForumPostCard from '@/components/ForumPostCard';     // The card for the *replies*

// --- Icons & Styles (Copied from dashboard) ---
const SpinnerIcon = ({className = "h-5 w-5 text-white"} : {className?: string}) => ( <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>);
const lightModeDotPatternUrl = "url(\"data:image/svg+xml,%3Csvg width='15' height='15' viewBox='0 0 15 15' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='15' height='15' fill='none'/%3E%3Ccircle cx='7.5' cy='7.5' r='0.8' fill='%23A0AEC0' fill-opacity='0.5'/%3E%3C/svg%3E\")";
const darkModeDotPatternUrl = "url(\"data:image/svg+xml,%3Csvg width='15' height='15' viewBox='0 0 15 15' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='15' height='15' fill='none'/%3E%3Ccircle cx='7.5' cy='7.5' r='0.8' fill='%23CBD5E0' fill-opacity='0.15'/%3E%3C/svg%3E\")";

const GlobalStyles = () => (
  <style jsx global>{`
    :root { --dot-pattern-url: ${lightModeDotPatternUrl}; }
    html.dark { --dot-pattern-url: ${darkModeDotPatternUrl}; }
    .learn-ease-card {
      background-color: rgba(255, 255, 255, 0.85); 
      backdrop-filter: blur(6px); border-radius: 0.75rem; 
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.07), 0 4px 6px -2px rgba(0,0,0,0.05);
      border-width: 1px; border-color: rgba(203, 213, 225, 0.5); 
    }
    html.dark .learn-ease-card {
      background-color: rgba(30, 41, 59, 0.85); 
      border-color: rgba(51, 65, 85, 0.8); 
    }
  `}</style>
);
// --- End Style Imports ---


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
        setError(err.message || "Failed to load thread. It may not exist.");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPageData();
  }, [threadId]);

  const handlePostReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newPostContent.trim()) {
      setPostError("Reply cannot be empty.");
      return;
    }

    setIsPosting(true);
    setPostError(null);

    const postData: ForumPostCreate = {
      thread_id: threadId,
      content: newPostContent.trim()
    };

    try {
      const newPost = await createForumPost(postData);
      // Add the new post to the list for instant UI update
      setPosts(prevPosts => [...prevPosts, newPost]);
      setNewPostContent(''); // Clear the textarea
    } catch (err: any) {
      setPostError(err.message || "Failed to post reply.");
    } finally {
      setIsPosting(false);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center py-20">
          <SpinnerIcon className="h-12 w-12 text-orange-500 mx-auto" />
          <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">
            Loading Thread...
          </p>
        </div>
      );
    }

    if (error || !thread) {
      return (
        <div className="learn-ease-card p-10 text-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30">
          <h3 className="text-2xl font-semibold mb-2">Error</h3>
          <p className="text-sm">{error || "This thread could not be loaded."}</p>
        </div>
      );
    }

    // --- Data is loaded, render the page ---
    return (
      <>
        {/* 1. The Main Question Card */}
        <section className="mb-8">
          {/* We reuse the ThreadCard, but we'll add the content */}
          <ForumThreadCard thread={thread} />
          <div className="learn-ease-card -mt-2 p-6 pt-4 border-t-0 rounded-t-none">
            <div className="prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200">
              {/* We can add markdown rendering here later */}
              <p>{thread.content}</p>
            </div>
          </div>
        </section>

        {/* 2. The "Post a Reply" Form */}
        <section className="learn-ease-card p-6 mb-8" id="reply-form">
          <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
            Post a Reply
          </h3>
          <form onSubmit={handlePostReply}>
            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder={user ? `Replying as ${user.firstname}...` : "Loading user..."}
              className="mt-1 block w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white/70 dark:bg-slate-700/80 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
              rows={5}
              required
              disabled={isPosting || !user}
            />
            {postError && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {postError}
              </p>
            )}
            <div className="flex justify-end mt-4">
              <button 
                type="submit" 
                disabled={isPosting || !user}
                className="flex items-center px-6 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg shadow-lg hover:shadow-xl hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-2 ring-offset-2 dark:ring-offset-slate-900 ring-red-500 transition-all duration-150 ease-in-out text-sm font-medium transform hover:scale-105 active:scale-95 disabled:opacity-60"
              >
                {isPosting ? <SpinnerIcon /> : "Submit Reply"}
              </button>
            </div>
          </form>
        </section>

        {/* 3. The List of Replies */}
        <section className="learn-ease-card p-6">
          <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-6 border-b border-slate-300 dark:border-slate-700 pb-3">
            {posts.length} {posts.length === 1 ? 'Reply' : 'Replies'}
          </h3>
          <div className="space-y-6">
            {posts.length > 0 ? (
              posts.map(post => (
                <ForumPostCard key={post.id} post={post} />
              ))
            ) : (
              <p className="text-center text-slate-500 dark:text-slate-400 pb-4">
                No replies yet. Be the first to answer!
              </p>
            )}
          </div>
        </section>
      </>
    );
  };

  return (
    <div 
      className="min-h-screen text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8 bg-slate-100 dark:bg-slate-900 transition-colors duration-500"
      style={{ backgroundImage: "var(--dot-pattern-url)" }}
    >
      <GlobalStyles />
      <main className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/forum" className="inline-flex items-center text-orange-600 dark:text-orange-400 hover:text-red-600 dark:hover:text-red-500 transition-colors group text-sm font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5 mr-1 transition-transform group-hover:-translate-x-0.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            Back to All Threads
          </Link>
        </div>
        
        {renderContent()}
      </main>
    </div>
  );
}