"use client";

import { useEffect, useState, useRef } from 'react';
import { UserPublic, fetchUserProfile } from '@/services/authService';
import {
  ForumPostPublic,
  ForumPostCreate,
  fetchThreadDetails,
  createForumPost
} from '@/services/forumService';
// --- (Imports for Group Data) ---
import {
  StudyGroupPublic,
  fetchMyGroups // We need this to find the group details
} from '@/services/studyGroupService';
import GroupSettingsModal from './GroupSettingsModal'; // Import the modal

// --- Icons ---
const SpinnerIcon = ({ className = "h-5 w-5 text-white" }: { className?: string }) => ( <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>);
const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.108 1.204.165.399.505.71.93.78l.893.15c.543.09.94.56.94 1.11v1.093c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.142.854.108 1.204l.527.738c.32.447.27.96-.12 1.45l-.773.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.399.165-.71.505-.781.93l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-.96.27-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.399-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.11v-1.094c0 .55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.142.854-.107-1.204l-.527-.738a1.125 1.125 0 01 .12-1.45l.773-.773a1.125 1.125 0 01 1.45-.12l.737.527c.35.25.807.272 1.204.107.399-.165.71-.505.78-.93l.15-.893z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
// --- End Icons ---

import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';


interface GroupChatProps {
  threadId: string;
}

const GroupChat = ({ threadId }: GroupChatProps) => {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [group, setGroup] = useState<StudyGroupPublic | null>(null);
  const [posts, setPosts] = useState<ForumPostPublic[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [postError, setPostError] = useState<string | null>(null);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };

  // Load all page data
  useEffect(() => {
    if (!threadId) return;
    const loadChatData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [userData, threadData, allGroupsData] = await Promise.all([
          fetchUserProfile(),
          fetchThreadDetails(threadId),
          fetchMyGroups() // Fetch group list to find our group
        ]);
        
        setUser(userData);
        setPosts(threadData.posts);
        
        const currentGroup = allGroupsData.find(g => g.forum_thread_id === threadId);
        setGroup(currentGroup || null);

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

  

  // This check is still needed for the *modal*
  const isUserAdmin = user && group && user.id === group.admin_id;

  return (
    <>
      <div className="flex flex-col h-full">
        {/* --- Chat Header --- */}
        <div className="p-4 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-700/80 flex-shrink-0 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {group ? group.name : 'Loading...'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {group ? `${group.member_count} Members` : '...'}
            </p>
          </div>
          
          {/* --- (THIS IS THE FIX) --- */}
          {/* Show settings button to *all* members, not just admin */}
          {group && user && (
            <button
              onClick={() => setIsSettingsOpen(true)}
              title="Group Settings"
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 focus:outline-none focus:ring-2 ring-offset-2 dark:ring-offset-slate-900 ring-slate-400 transition-all duration-150 ease-in-out"
            >
              <SettingsIcon />
            </button>
          )}
          {/* --- (END FIX) --- */}

        </div>
        
        {/* Main chat message area */}
        {renderContent()}

        {/* Reply/Send Input Box */}
        <div className="flex-shrink-0">
          {postError && (
            <div className="p-2 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 text-sm text-center">
              {postError}
            </div>
          )}
          <MessageInput
            onSubmit={handleSendMessage}
          />
        </div>
      </div>
      
      {/* --- Render the Modal --- */}
      {/* The modal will only render if the group and user are loaded */}
      {group && user && (
        <GroupSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          group={group}
          currentUser={user}
        />
      )}
    </>
  );
};
export default GroupChat;