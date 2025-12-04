"use client";

import { useEffect, useState } from 'react';
import { fetchMyGroups, StudyGroupPublic } from '@/services/studyGroupService';
import { fetchMyConversations, ConversationPublic } from '@/services/chatService';

// Icons
const PlusIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" /></svg> );
const NewMessageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
);

// --- Helper: Get Initials Correctly ---
const getInitials = (name: string) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

interface InboxItemData { id: string; type: 'group' | 'dm'; name: string; lastMsg: string; date: string; }

interface InboxListProps {
  onSelectConversation: (id: string, type: 'group' | 'dm', name: string) => void;
  selectedConversationId: string | null;
  onNewGroup: () => void;
  onNewMessage: () => void;
}

export default function InboxList({ 
  onSelectConversation, 
  selectedConversationId, 
  onNewGroup, 
  onNewMessage 
}: InboxListProps) {
  const [items, setItems] = useState<InboxItemData[]>([]);

  useEffect(() => {
    const load = async () => {
      const [groups, dms] = await Promise.allSettled([fetchMyGroups(), fetchMyConversations()]);
      
      const groupItems = groups.status === 'fulfilled' ? groups.value.map((g: StudyGroupPublic) => ({
        id: g.forum_thread_id, 
        type: 'group' as const, 
        name: g.name, 
        lastMsg: g.description || 'Study Group', 
        date: g.created_at
      })) : [];

      const dmItems = dms.status === 'fulfilled' ? dms.value.map((c: ConversationPublic) => ({
        id: c.id, 
        type: 'dm' as const, 
        name: `${c.participant.firstname} ${c.participant.lastname}`, 
        lastMsg: c.last_message || 'Start chatting', 
        date: c.last_activity
      })) : [];

      const combined = [...groupItems, ...dmItems].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setItems(combined);
    };
    load();
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 grid grid-cols-2 gap-3">
        <button onClick={onNewGroup} className="flex items-center justify-center gap-2 py-4 text-base font-bold text-white bg-slate-800 dark:bg-slate-700 hover:opacity-90 rounded-xl transition-all shadow-sm">
          <PlusIcon /> <span>Group</span>
        </button>
        <button onClick={onNewMessage} className="flex items-center justify-center gap-2 py-4 text-base font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl transition-all shadow-sm">
          <NewMessageIcon /> <span>Message</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 space-y-3 pb-4">
        {items.length === 0 ? (
           <div className="text-center pt-10 text-slate-500 text-lg">No messages yet.</div>
        ) : (
          items.map((item) => {
            const isActive = selectedConversationId === item.id;
            return (
              <button
                key={`${item.type}-${item.id}`}
                onClick={() => onSelectConversation(item.id, item.type, item.name)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left ${
                  isActive 
                    ? 'bg-white dark:bg-slate-700 shadow-md ring-1 ring-slate-200 dark:ring-slate-600' 
                    : 'hover:bg-slate-200/50 dark:hover:bg-slate-800'
                }`}
              >
                {/* Avatar with correct initials */}
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-sm flex-shrink-0 ${
                  item.type === 'group' ? 'bg-indigo-500' : 'bg-gradient-to-br from-orange-400 to-red-500'
                }`}>
                  {getInitials(item.name)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className={`text-lg font-bold truncate ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                    {item.name}
                  </div>
                  <div className={`text-base truncate mt-1 ${isActive ? 'text-slate-600 dark:text-slate-300' : 'text-slate-500'}`}>
                    {item.lastMsg}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}