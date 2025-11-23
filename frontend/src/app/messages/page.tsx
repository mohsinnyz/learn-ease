// frontend/src/app/messages/page.tsx
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

// --- Import Components ---
import InboxList from '@/components/InboxList';
import ChatWindow from '@/components/ChatWindow';
import ChatWindowEmptyState from '@/components/ChatWindowEmptyState';
import CreateGroupModal from '@/components/CreateGroupModal';
import NewChatModal from '@/components/NewChatModal';
import { ConversationPublic } from '@/services/chatService';
import { StudyGroupPublic } from '@/services/studyGroupService';

// --- Icons ---
const SpinnerIcon = ({className = "h-5 w-5 text-white"} : {className?: string}) => ( <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>);

// --- Global Styles (Unified Design) ---
const GlobalStyles = () => (
  <style jsx global>{`
    /* Unified Card Style */
    .learn-ease-card {
      background-color: #ffffff; 
      border-radius: 1rem;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      border: 1px solid rgba(226, 232, 240, 1);
    }
    html.dark .learn-ease-card {
      background-color: rgba(30, 41, 59, 0.95);
      border-color: rgba(51, 65, 85, 0.8);
    }

    /* Polka Dot Pattern */
    :root {
      /* UPDATED: fill-opacity='0.3' */
      --dot-pattern-url: url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1.5' cy='1.5' r='1.5' fill='%2394a3b8' fill-opacity='0.3'/%3E%3C/svg%3E");
    }
    html.dark {
      --dot-pattern-url: url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1' cy='1' r='1' fill='%23cbd5e1' fill-opacity='0.1'/%3E%3C/svg%3E");
    }

    /* Custom Scrollbar for Chat/Inbox */
    .chat-scrollbar::-webkit-scrollbar { width: 6px; }
    .chat-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .chat-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
    html.dark .chat-scrollbar::-webkit-scrollbar-thumb { background: #475569; }
    .chat-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    html.dark .chat-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
  `}</style>
);

export default function MessagesPage() {
  const [isClient, setIsClient] = useState(false);
  
  const [selectedConversation, setSelectedConversation] = useState<{
    id: string; // main_thread_id for groups, convo_id for DMs
    type: 'group' | 'dm';
    name: string; 
  } | null>(null);

  // --- State for Modals ---
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [inboxKey, setInboxKey] = useState(1); // Force-refresh inbox
  // --- (END NEW) ---

  useEffect(() => {
    setIsClient(true);
  }, []);

  // --- Handlers for modal callbacks ---
  const handleConversationStarted = (convo: ConversationPublic) => {
    setInboxKey(prev => prev + 1); 
    setSelectedConversation({
      id: convo.id,
      type: 'dm',
      name: convo.participant.firstname + ' ' + convo.participant.lastname
    });
  };

  const handleGroupCreated = (group: StudyGroupPublic) => {
    setInboxKey(prev => prev + 1);
    setSelectedConversation({
      id: group.forum_thread_id,
      type: 'group',
      name: group.name
    });
  };

  if (!isClient) {
    return (
      <div 
        // UPDATED: bg-slate-200/50
        className="flex min-h-screen flex-col items-center justify-center bg-slate-200/50 dark:bg-slate-950 transition-colors duration-500"
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
        // UPDATED: bg-slate-200/50
        className="flex h-screen w-screen overflow-hidden bg-slate-200/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-500"
        style={{ backgroundImage: "var(--dot-pattern-url)" }}
      >
        {/* --- 1. Left Panel (Inbox) --- */}
        <div className="w-full sm:w-1/3 md:w-1/4 flex-shrink-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-r border-slate-300 dark:border-slate-700 flex flex-col shadow-xl z-10">
          <div className="p-4 border-b border-slate-300 dark:border-slate-700 flex-shrink-0">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              Messages
            </h1>
          </div>
          
          <div className="flex-grow overflow-y-auto chat-scrollbar">
            <InboxList 
              key={inboxKey} 
              onSelectConversation={(id, type, name) => setSelectedConversation({ id, type, name })}
              selectedConversationId={selectedConversation ? selectedConversation.id : null}
              onNewGroup={() => setIsGroupModalOpen(true)}
              onNewMessage={() => setIsMessageModalOpen(true)}
            />
          </div>

          <div className="p-2 border-t border-slate-300 dark:border-slate-700 flex-shrink-0 bg-white/50 dark:bg-slate-900/50">
            <Link href="/dashboard" className="block text-center w-full p-2 text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-slate-800 rounded-md transition-colors font-medium">
              &larr; Back to Dashboard
            </Link>
          </div>
        </div>

        {/* --- 2. Right Panel (Chat Window) --- */}
        <div className="flex-1 flex flex-col relative">
          {/* The chat window sits on top of the global dot pattern */}
          {selectedConversation ? (
            <ChatWindow 
              key={selectedConversation.id} 
              conversationId={selectedConversation.id}
              type={selectedConversation.type}
              name={selectedConversation.name} 
            />
          ) : (
            <ChatWindowEmptyState />
          )}
        </div>
      </div>
      
      {/* --- Render Modals --- */}
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