"use client";

import { useEffect, useState } from 'react';
import { fetchMyGroups, StudyGroupPublic } from '@/services/studyGroupService';
import { fetchMyConversations, ConversationPublic } from '@/services/chatService'; // Placeholder service
import InboxItem, { ConversationItem } from './InboxItem'; // The component we just made

// --- Icons (from your dashboard file) ---
const SpinnerIcon = ({className = "h-5 w-5 text-white"} : {className?: string}) => ( <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>);

// --- Main Component ---
interface InboxListProps {
  onSelectConversation: (id: string, type: 'group' | 'dm') => void;
  selectedConversationId: string | null;
}

const InboxList = ({ onSelectConversation, selectedConversationId }: InboxListProps) => {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadInbox = async () => {
      setIsLoading(true);
      setError(null);

      // We use Promise.allSettled so if DMs fail, groups still load
      const [groupResults, dmResults] = await Promise.allSettled([
        fetchMyGroups(),
        fetchMyConversations() // This will return [] for now from our placeholder
      ]);

      let loadedItems: ConversationItem[] = [];

      if (groupResults.status === 'fulfilled') {
        const groupItems = groupResults.value.map((group: StudyGroupPublic) => ({
          // This is the "masking" logic:
          // The ID we pass to the ChatWindow is the thread_id.
          id: group.forum_thread_id, 
          type: 'group' as const, 
          name: group.name,
          // TODO: This should be the last *post* in the group, not the group's creation date.
          // We can't get this easily from this endpoint, so we'll use the description for now.
          lastMessage: group.description || 'No activity yet.',
          lastActivityDate: group.created_at, 
        }));
        loadedItems.push(...groupItems);
      }

      if (dmResults.status === 'fulfilled') {
        const dmItems = dmResults.value.map((dm: ConversationPublic) => ({
          id: dm.id,
          type: 'dm' as const,
          name: dm.participant_name,
          lastMessage: dm.last_message,
          lastActivityDate: dm.last_activity_date,
        }));
        loadedItems.push(...dmItems);
      }

      // Sort the merged list by activity date (newest first)
      loadedItems.sort((a, b) => 
        new Date(b.lastActivityDate).getTime() - new Date(a.lastActivityDate).getTime()
      );
      
      setConversations(loadedItems);

      // Handle errors
      if (groupResults.status === 'rejected' && dmResults.status === 'rejected') {
        setError("Could not load groups or messages.");
      } else if (groupResults.status === 'rejected') {
        setError("Could not load study groups.");
      } else if (dmResults.status === 'rejected') {
        setError("Could not load private messages.");
      }
      
      setIsLoading(false);
    };

    loadInbox();
  }, []); // Runs once on component mount

  if (isLoading) {
    return (
      <div className="text-center p-6">
        <SpinnerIcon className="h-8 w-8 text-orange-500 mx-auto" />
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }

  if (conversations.length === 0) {
    return (
      <div className="p-4 text-center text-slate-500 dark:text-slate-400">
        Your inbox is empty. Join a group or start a new conversation.
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-200/80 dark:divide-slate-700/80">
      {conversations.map(item => (
        <InboxItem
          key={`${item.type}-${item.id}`}
          item={item}
          isSelected={selectedConversationId === item.id}
          onSelect={() => onSelectConversation(item.id, item.type)}
        />
      ))}
    </div>
  );
};

export default InboxList;