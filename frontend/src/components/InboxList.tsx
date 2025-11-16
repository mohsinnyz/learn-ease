"use client";

import { useEffect, useState } from 'react';
import { fetchMyGroups, StudyGroupPublic } from '@/services/studyGroupService';
import { fetchMyConversations, ConversationPublic } from '@/services/chatService'; 
import InboxItem, { ConversationItem } from './InboxItem';
// --- (NEW IMPORTS) ---
import CreateGroupModal from './CreateGroupModal'; 
// --- (END NEW IMPORTS) ---


// --- Icons (from your dashboard file) ---
const SpinnerIcon = ({className = "h-5 w-5 text-white"} : {className?: string}) => ( <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>);

// --- (NEW ICON) ---
const PlusIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" /></svg> );
// --- (END NEW ICON) ---


// --- Main Component ---
interface InboxListProps {
  onSelectConversation: (id: string, type: 'group' | 'dm') => void;
  selectedConversationId: string | null;
}

const InboxList = ({ onSelectConversation, selectedConversationId }: InboxListProps) => {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // --- (NEW STATE) ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  // --- (END NEW STATE) ---

  useEffect(() => {
    loadInbox();
  }, []); // Runs once on component mount

  const loadInbox = async () => {
    setIsLoading(true);
    setError(null);
    
    const [groupResults, dmResults] = await Promise.allSettled([
      fetchMyGroups(),
      fetchMyConversations()
    ]);

    let loadedItems: ConversationItem[] = [];

    if (groupResults.status === 'fulfilled') {
      const groupItems = groupResults.value.map((group: StudyGroupPublic) => ({
        id: group.forum_thread_id, 
        type: 'group' as const, 
        name: group.name,
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

    loadedItems.sort((a, b) => 
      new Date(b.lastActivityDate).getTime() - new Date(a.lastActivityDate).getTime()
    );
    
    setConversations(loadedItems);

    if (groupResults.status === 'rejected' && dmResults.status === 'rejected') {
      setError("Could not load groups or messages.");
    } else if (groupResults.status === 'rejected') {
      setError("Could not load study groups.");
    } else if (dmResults.status === 'rejected') {
      setError("Could not load private messages.");
    }
    
    setIsLoading(false);
  };
  
  // --- (NEW FUNCTION) ---
  const handleGroupCreated = (newGroup: StudyGroupPublic) => {
    // Add the new group to the top of the list for an instant UI update
    const newConversationItem: ConversationItem = {
      id: newGroup.forum_thread_id,
      type: 'group',
      name: newGroup.name,
      lastMessage: newGroup.description || 'No activity yet.',
      lastActivityDate: newGroup.created_at,
    };
    
    setConversations(prev => [newConversationItem, ...prev]);
  };
  // --- (END NEW FUNCTION) ---


  if (isLoading) {
    return <div className="text-center p-6"><SpinnerIcon className="h-8 w-8 text-orange-500 mx-auto" /></div>;
  }
  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }

  return (
    <>
      {/* --- (NEW) "Create Group" Button --- */}
      <div className="p-2">
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full flex items-center justify-center p-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg shadow-md hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-2 ring-offset-2 dark:ring-offset-slate-900 ring-red-500 transition-all duration-150 ease-in-out text-sm font-medium transform hover:scale-105 active:scale-95"
        >
          <PlusIcon />
          Create New Group
        </button>
      </div>
      {/* --- (END NEW) --- */}
    
      {conversations.length === 0 ? (
        <div className="p-4 text-center text-slate-500 dark:text-slate-400">
          No groups joined yet. Create one!
        </div>
      ) : (
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
      )}
      
      {/* --- (NEW) Modal --- */}
      <CreateGroupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGroupCreated={handleGroupCreated}
      />
      {/* --- (END NEW) --- */}
    </>
  );
};

export default InboxList;