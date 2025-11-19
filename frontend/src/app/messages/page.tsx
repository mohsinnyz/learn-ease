//C:\Users\mohsi\Projects\learn-ease-fyp\frontend\src\app\messages\page.tsx
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

// --- (NEW) Import all the REAL components ---
import InboxList from '@/components/InboxList';
import ChatWindow from '@/components/ChatWindow';
import ChatWindowEmptyState from '@/components/ChatWindowEmptyState';
import CreateGroupModal from '@/components/CreateGroupModal';
import NewChatModal from '@/components/NewChatModal';
import { ConversationPublic } from '@/services/chatService';
import { StudyGroupPublic } from '@/services/studyGroupService';
// --- (END NEW) ---

// --- Icons & Styles ---
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
    .chat-scrollbar::-webkit-scrollbar { width: 6px; }
    .chat-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .chat-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
    html.dark .chat-scrollbar::-webkit-scrollbar-thumb { background: #475569; }
    .chat-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    html.dark .chat-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
  `}</style>
);
// --- End Style Imports ---

// --- (Placeholders are GONE) ---

export default function MessagesPage() {
  const [isClient, setIsClient] = useState(false);
  
  const [selectedConversation, setSelectedConversation] = useState<{
    id: string; // This ID will be the main_thread_id for groups, or convo_id for DMs
    type: 'group' | 'dm';
    name: string; // We'll pass the name to the ChatWindow header
  } | null>(null);

  // --- (NEW) State for Modals ---
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [inboxKey, setInboxKey] = useState(1); // Used to force-refresh the inbox
  // --- (END NEW) ---

  useEffect(() => {
    setIsClient(true);
    // TODO: Add auth check here, redirect to /login if no token
  }, []);

  // --- (NEW) Handlers for modal callbacks ---
  const handleConversationStarted = (convo: ConversationPublic) => {
    // A new DM was started.
    // 1. Refresh the inbox list
    setInboxKey(prev => prev + 1); 
    // 2. Select the new conversation
    setSelectedConversation({
      id: convo.id,
      type: 'dm',
      name: convo.participant.firstname + ' ' + convo.participant.lastname
    });
  };

  const handleGroupCreated = (group: StudyGroupPublic) => {
    // A new group was created.
    // 1. Refresh the inbox list
    setInboxKey(prev => prev + 1);
    // 2. Select the new group
    setSelectedConversation({
      id: group.forum_thread_id,
      type: 'group',
      name: group.name
    });
  };
  // --- (END NEW) ---

  if (!isClient) {
    return (
      <div 
        className="flex min-h-screen flex-col items-center justify-center bg-slate-100 dark:bg-slate-900"
        style={{ backgroundImage: "var(--dot-pattern-url)" }}
      >
        <GlobalStyles />
        <SpinnerIcon className="h-12 w-12 text-orange-500" />
      </div>
    );
  }

  return (
    <>
      <GlobalStyles />
      <div 
        className="flex h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
        style={{ backgroundImage: "var(--dot-pattern-url)" }}
      >
        {/* --- 1. Left Panel (Inbox) --- */}
        <div className="w-full sm:w-1/3 md:w-1/4 flex-shrink-0 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border-r border-slate-200/80 dark:border-slate-700/80 flex flex-col">
          <div className="p-4 border-b border-slate-200/80 dark:border-slate-700/80 flex-shrink-0">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              Messages
            </h1>
          </div>
          
          <div className="flex-grow overflow-y-auto chat-scrollbar">
            <InboxList 
              key={inboxKey} // This will force a re-fetch when a new item is created
              onSelectConversation={(id, type, name) => setSelectedConversation({ id, type, name })}
              selectedConversationId={selectedConversation ? selectedConversation.id : null}
              onNewGroup={() => setIsGroupModalOpen(true)}
              onNewMessage={() => setIsMessageModalOpen(true)}
            />
          </div>

          <div className="p-2 border-t border-slate-200/80 dark:border-slate-700/80 flex-shrink-0">
            <Link href="/dashboard" className="block text-center w-full p-2 text-sm text-orange-600 dark:text-orange-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors">
              &larr; Back to Dashboard
            </Link>
          </div>
        </div>

        {/* --- 2. Right Panel (Chat Window) --- */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <ChatWindow 
              key={selectedConversation.id} 
              conversationId={selectedConversation.id}
              type={selectedConversation.type}
              // We pass the name to the header
              name={selectedConversation.name} 
            />
          ) : (
            <ChatWindowEmptyState />
          )}
        </div>
      </div>
      
      {/* --- (NEW) Render Modals --- */}
      <CreateGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        onGroupCreated={handleGroupCreated}
      />
      <NewChatModal
        isOpen={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        onConversationStarted={handleConversationStarted}
      />
    </>
  );
}