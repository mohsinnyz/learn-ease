"use client";

import { useEffect, useState } from 'react';
import { fetchMyGroups, StudyGroupPublic } from '@/services/studyGroupService';
import { fetchMyConversations, ConversationPublic } from '@/services/chatService'; 
import InboxItem, { ConversationItem } from './InboxItem';
import CreateGroupModal from './CreateGroupModal'; 

// --- Icons (from your dashboard file) ---
const SpinnerIcon = ({className = "h-5 w-5 text-white"} : {className?: string}) => ( <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>);
const PlusIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" /></svg> );
// --- (NEW ICON) ---
const NewMessageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
);
// --- (END NEW ICON) ---


// --- Main Component ---
interface InboxListProps {
  onSelectConversation: (id: string, type: 'group' | 'dm', name: string) => void;
  selectedConversationId: string | null;
  // --- (NEW PROPS) ---
  onNewGroup: () => void;    // Callback to open the "Create Group" modal
  onNewMessage: () => void; // Callback to open the "New Message" modal
  // --- (END NEW PROPS) ---
}

const InboxList = ({ 
  onSelectConversation, 
  selectedConversationId, 
  onNewGroup, 
  onNewMessage 
}: InboxListProps) => {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // This is the combined list of items
  const [combinedList, setCombinedList] = useState<ConversationItem[]>([]);

  useEffect(() => {
    loadInbox();
  }, []);

  const loadInbox = async () => {
    setIsLoading(true);
    setError(null);
    
    // Fetch both in parallel
    const [groupResults, dmResults] = await Promise.allSettled([
      fetchMyGroups(),
      fetchMyConversations() // This now fetches real DMs
    ]);

    let loadedItems: ConversationItem[] = [];

    // Process Groups
    if (groupResults.status === 'fulfilled') {
      const groupItems = groupResults.value.map((group: StudyGroupPublic) => ({
        id: group.forum_thread_id, 
        type: 'group' as const, 
        name: group.name,
        lastMessage: group.description || 'Group created',
        lastActivityDate: group.created_at, // TODO: We'll update this to be the *real* last activity
      }));
      loadedItems.push(...groupItems);
    }

    // Process DMs
    if (dmResults.status === 'fulfilled') {
      const dmItems = dmResults.value.map((dm: ConversationPublic) => ({
        id: dm.id, // This is the conversation_id
        type: 'dm' as const,
        name: dm.participant.firstname + ' ' + dm.participant.lastname,
        lastMessage: dm.last_message || 'Conversation started.',
        lastActivityDate: dm.last_activity,
      }));
      loadedItems.push(...dmItems);
    }

    // Sort the merged list
    loadedItems.sort((a, b) => 
      new Date(b.lastActivityDate).getTime() - new Date(a.lastActivityDate).getTime()
    );
    
    setConversations(loadedItems);

    if (groupResults.status === 'rejected') {
      setError("Could not load study groups.");
    }
    if (dmResults.status === 'rejected') {
      setError("Could not load private messages.");
    }
    
    setIsLoading(false);
  };
  
  // This component no longer needs to know how to create a group
  // It just calls the callbacks given to it by the parent page
  
  if (isLoading) {
    return <div className="text-center p-6"><SpinnerIcon className="h-8 w-8 text-orange-500 mx-auto" /></div>;
  }
  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }

  return (
    <>
      {/* --- (MODIFIED) "Create" Button Bar --- */}
      <div className="p-2 grid grid-cols-2 gap-2">
        <button
          onClick={onNewGroup}
          className="w-full flex items-center justify-center p-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg shadow-md hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-2 ring-offset-2 dark:ring-offset-slate-900 ring-red-500 transition-all duration-150 ease-in-out text-sm font-medium transform hover:scale-105 active:scale-95"
        >
          <PlusIcon />
          New Group
        </button>
        <button
          onClick={onNewMessage}
          className="w-full flex items-center justify-center p-2.5 bg-indigo-600 text-white rounded-lg shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 ring-offset-2 dark:ring-offset-slate-900 ring-indigo-500 transition-all duration-150 ease-in-out text-sm font-medium transform hover:scale-105 active:scale-95"
        >
          <NewMessageIcon />
          New Message
        </button>
      </div>
      {/* --- (END MODIFIED) --- */}
    
      {conversations.length === 0 ? (
        <div className="p-4 text-center text-slate-500 dark:text-slate-400">
          Your inbox is empty. Create a group or start a new chat.
        </div>
      ) : (
        <div className="divide-y divide-slate-200/80 dark:divide-slate-700/80">
          {conversations.map(item => (
            <InboxItem
              key={`${item.type}-${item.id}`}
              item={item}
              isSelected={selectedConversationId === item.id}
              onSelect={() => onSelectConversation(item.id, item.type, item.name)}
            />
          ))}
        </div>
      )}
      
      {/* The Modals are no longer rendered here, they are in the parent page */}
    </>
  );
};

export default InboxList;