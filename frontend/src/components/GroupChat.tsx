"use client";

import { useEffect, useState, useRef } from 'react';
import { UserPublic, fetchUserProfile } from '@/services/authService';
import {
  ForumPostPublic,
  ForumPostCreate,
  fetchThreadDetails,
  createForumPost
} from '@/services/forumService';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
const SpinnerIcon = ({ className = "h-5 w-5 text-white" }: { className?: string }) => ( <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>);

interface GroupChatProps {
  threadId: string;
}
const GroupChat = ({ threadId }: GroupChatProps) => {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [posts, setPosts] = useState<ForumPostPublic[]>([]);
  
  // --- (REMOVED postsMap and replyingTo state) ---
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [postError, setPostError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };

  useEffect(() => {
    if (!threadId) return;
    const loadChatData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [userData, threadData] = await Promise.all([
          fetchUserProfile(),
          fetchThreadDetails(threadId)
        ]);
        
        setUser(userData);
        setPosts(threadData.posts);
      } catch (err: any) {
        setError(err.message || "Failed to load group chat.");
      } finally {
        setIsLoading(false);
      }
    };
    loadChatData();
  }, [threadId]);

  useEffect(() => { scrollToBottom(); }, [posts.length]);

  const handleSendMessage = async (content: string) => {
    setPostError(null);
    const postData: ForumPostCreate = {
      thread_id: threadId,
      content: content.trim(),
    };

    try {
      const newPost = await createForumPost(postData);
      setPosts(prevPosts => [...prevPosts, newPost]);
    } catch (err: any) {
      setPostError(err.message || "Failed to send message. Please try again.");
      throw err; 
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return <div className="flex-1 flex items-center justify-center"><SpinnerIcon className="h-10 w-10 text-orange-500" /></div>;
    }
    if (error) {
      return <div className="flex-1 flex items-center justify-center p-4"><p className="text-red-500">{error}</p></div>;
    }
    return (
      <div className="flex-1 overflow-y-auto chat-scrollbar p-4 space-y-4">
        {posts.map(post => (
          <MessageBubble
            key={post.id}
            post={post}
            currentUser={user}
            isGroup={true}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {renderContent()}
      <div className="flex-shrink-0">
        {postError && (
          <div className="p-2 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-30m text-sm text-center">
            {postError}
          </div>
        )}
        {/* --- (THIS IS THE FIX) --- */}
        {/* Removed the 'replyingTo' and 'onClearReply' props */}
        <MessageInput
          onSubmit={handleSendMessage}
        />
        {/* --- (END FIX) --- */}
      </div>
    </div>
  );
};
export default GroupChat;