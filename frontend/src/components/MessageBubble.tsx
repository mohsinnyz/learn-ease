"use client";

import { UserPublic } from '@/services/authService';
import { parseUTC } from '@/lib/dateUtils'; // <--- Imported central date utility

// Helper to format dates
function formatTime(dateString: string): string {
  try {
    // Use parseUTC to correctly handle the time zone offset
    const date = parseUTC(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } catch(e) { return ""; }
}

interface MessageBubbleProps {
  post: { 
    id: string;
    content: string;
    created_at: string;
    author: {
      id: string;
      firstname?: string; 
      lastname?: string; 
    };
  };
  currentUser: UserPublic | null;
  isGroup: boolean; 
  replyContext?: any | null; 
  onReply?: (post: any) => void;
}

const MessageBubble = ({ post, currentUser, isGroup, onReply }: MessageBubbleProps) => {
  const isMine = currentUser?.id === post.author.id;

  // --- Dynamic Styling ---
  const bubbleClasses = isMine
    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
    : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100';
  
  const alignmentClasses = isMine ? 'items-end' : 'items-start';

  return (
    <div className={`flex flex-col ${alignmentClasses} group mb-4`}>
      <div className={`flex items-end space-x-2 ${isMine ? 'flex-row-reverse space-x-reverse' : ''}`}>
        
        {/* --- Bubble Content --- */}
        <div 
          className={`relative max-w-[85%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl shadow-sm ${bubbleClasses} ${isMine ? 'rounded-br-none' : 'rounded-bl-none'}`}
        >
          {/* 1. Author Name (Groups only & not mine) */}
          {!isMine && isGroup && (
            <p className="text-xs font-bold text-orange-600 dark:text-orange-400 mb-1">
              {post.author.firstname ? `${post.author.firstname} ${post.author.lastname}` : 'User'}
            </p>
          )}

          {/* 2. Message Content */}
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {post.content}
          </p>

          {/* 3. Timestamp */}
          <p className={`text-[10px] mt-1 opacity-70 ${isMine ? 'text-right text-orange-100' : 'text-left text-slate-400 dark:text-slate-400'}`}>
            {formatTime(post.created_at)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;