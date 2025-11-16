"use client";

import { ForumPostPublic } from '@/services/forumService';
import { UserPublic } from '@/services/authService';

// Helper to format dates
function formatTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } catch(e) { return ""; }
}

interface MessageBubbleProps {
  post: ForumPostPublic;
  currentUser: UserPublic | null;
  isGroup: boolean; 
}

const MessageBubble = ({ post, currentUser, isGroup }: MessageBubbleProps) => {
  const isMine = currentUser?.id === post.author.id;

  // --- Dynamic Styling ---
  const bubbleClasses = isMine
    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
    : 'bg-white dark:bg-slate-700';
  
  const alignmentClasses = isMine ? 'items-end' : 'items-start';

  return (
    <div className={`flex flex-col ${alignmentClasses} group`}>
      <div className={`flex items-start space-x-2 ${isMine ? 'flex-row-reverse space-x-reverse' : ''}`}>
        
        {/* --- Reply Button (REMOVED) --- */}

        {/* --- Bubble Content --- */}
        <div 
          className={`relative max-w-xs lg:max-w-md px-4 py-3 rounded-lg shadow ${bubbleClasses} ${isMine ? 'rounded-br-none' : 'rounded-bl-none'}`}
        >
          {/* 1. Author Name (Groups only) */}
          {!isMine && isGroup && (
            <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-1">
              {post.author.firstname} {post.author.lastname}
            </p>
          )}

          {/* 2. Reply Context (REMOVED) --- */}

          {/* 3. Message Content */}
          <p className="text-sm">
            {post.content}
          </p>

          {/* 4. Timestamp */}
          <p className={`text-xs mt-1 opacity-70 ${isMine ? 'text-right' : 'text-left'}`}>
            {formatTime(post.created_at)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;