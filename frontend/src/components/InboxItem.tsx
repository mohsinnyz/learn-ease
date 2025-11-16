"use client";

import Link from 'next/link';

// --- Icons (from your dashboard file) ---
const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 00-12.728 0M12 3.021a9.094 9.094 0 015.657 2.303m-1.14 0a6.06 6.06 0 00-9.034 0M12 12.021a3.03 3.03 0 110-6.06 3.03 3.03 0 010 6.06z" />
  </svg>
);

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);
// --- End Icons ---


// This is the "Unified" type that our InboxList will create
export interface ConversationItem {
  id: string; // This will be the thread_id for groups, or conversation_id for DMs
  type: 'group' | 'dm';
  name: string;
  lastMessage: string;
  lastActivityDate: string; // ISO string
}

interface InboxItemProps {
  item: ConversationItem;
  isSelected: boolean;
  onSelect: () => void;
}

// Helper to format dates
function formatLastActivity(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // Get local date at midnight
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (date.getTime() > startOfToday.getTime()) {
      // Today: 1:35 PM
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      });
    } else {
      // Past Day: Nov 15
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  } catch (e) {
    return "";
  }
}

const InboxItem = ({ item, isSelected, onSelect }: InboxItemProps) => {
  
  // This is the "oomph" you wanted.
  // A gradient and a strong orange border for the active item.
  const selectedClasses = isSelected 
    ? 'bg-gradient-to-r from-orange-50 to-red-50 dark:bg-gradient-to-r dark:from-slate-700/50 dark:to-slate-700/30 border-r-4 border-orange-500' 
    : 'hover:bg-slate-200/60 dark:hover:bg-slate-700/60 border-r-4 border-transparent';

  return (
    <div
      onClick={onSelect}
      className={`flex items-center space-x-3 p-4 cursor-pointer transition-all duration-150 ${selectedClasses}`}
    >
      {/* 1. Icon */}
      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-slate-200 dark:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400">
        {item.type === 'group' ? <UsersIcon /> : <UserIcon />}
      </div>
      
      {/* 2. Text Content */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
            {item.name}
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0 ml-2">
            {formatLastActivity(item.lastActivityDate)}
          </span>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 truncate mt-0.5">
          {item.lastMessage}
        </p>
      </div>
    </div>
  );
};

export default InboxItem;