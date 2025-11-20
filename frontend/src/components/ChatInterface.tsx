"use client";

import { useState, useEffect, useRef } from 'react';
import { fetchConversationMessages, chatSocket, MessagePublic } from '@/services/chatService';
import { fetchThreadDetails, createForumPost } from '@/services/forumService';
// Import StudyGroupPublic
import { fetchMyGroups, StudyGroupPublic } from '@/services/studyGroupService'; 
// Import UserPublic
import { fetchUserProfile, UserPublic } from '@/services/authService';
import GroupSettingsModal from './GroupSettingsModal'; 

// --- Icons ---
const SendIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>);
const CogIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.581-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>);

// --- Helper: Get Initials Correctly ---
const getInitials = (name: string) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase(); 
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

interface UIMessage {
  id: string;
  content: string;
  senderName: string;
  senderId: string;
  createdAt: string;
}

export default function ChatInterface({ id, type, name }: { id: string, type: 'group' | 'dm', name: string }) {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState('');
  
  // FIX 1: Store the full UserPublic object, not just ID
  const [currentUser, setCurrentUser] = useState<UserPublic | null>(null);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentGroup, setCurrentGroup] = useState<StudyGroupPublic | null>(null);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load full user profile
    fetchUserProfile().then(u => setCurrentUser(u));
    
    if (type === 'dm') {
        chatSocket.connect();
    } else {
        fetchMyGroups().then(groups => {
            const found = groups.find(g => g.forum_thread_id === id);
            if (found) setCurrentGroup(found);
        }).catch(console.error);
    }

    const loadData = async () => {
      try {
        let formattedMessages: UIMessage[] = [];
        if (type === 'dm') {
          const data = await fetchConversationMessages(id);
          formattedMessages = data.map((msg: MessagePublic) => ({
            id: msg.id,
            content: msg.content,
            senderId: msg.sender_id,
            senderName: '...', 
            createdAt: msg.created_at
          }));
        } else {
          const data = await fetchThreadDetails(id);
          formattedMessages = data.posts.map((post: any) => ({
            id: post.id,
            content: post.content,
            senderId: post.author.id,
            senderName: `${post.author.firstname} ${post.author.lastname}`,
            createdAt: post.created_at
          }));
        }
        setMessages(formattedMessages);
      } catch (err) { console.error(err); }
    };

    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, [id, type]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentUser) return;
    const textToSend = input;
    setInput(''); 

    try {
      if (type === 'dm') {
        chatSocket.sendMessage(id, textToSend);
        const optimisticMsg: UIMessage = {
          id: Date.now().toString(),
          content: textToSend,
          senderId: currentUser.id, // Use object
          senderName: 'Me',
          createdAt: new Date().toISOString()
        };
        setMessages(prev => [...prev, optimisticMsg]);
      } else {
        await createForumPost({ thread_id: id, content: textToSend });
        const data = await fetchThreadDetails(id);
        const newMsgs = data.posts.map((post: any) => ({
            id: post.id,
            content: post.content,
            senderId: post.author.id,
            senderName: `${post.author.firstname} ${post.author.lastname}`,
            createdAt: post.created_at
        }));
        setMessages(newMsgs);
      }
    } catch (err) { console.error(err); setInput(textToSend); }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700">
      {/* Header */}
      <div className="h-20 px-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shadow-sm z-10 bg-white dark:bg-slate-900">
        <h2 className="font-bold text-2xl text-slate-800 dark:text-slate-100">{name}</h2>
        
        {type === 'group' && (
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Group Settings"
          >
            <CogIcon />
          </button>
        )}
      </div>

      {/* Message Area */}
      <div 
        className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-200/60 dark:bg-[#0f172a]"
        style={{ backgroundImage: "var(--dot-pattern-url)" }}
      >
        {messages.map((msg, i) => {
          // Check using optional chaining just in case
          const isMe = msg.senderId === currentUser?.id;
          const displayName = type === 'dm' ? (isMe ? 'Me' : name) : msg.senderName;
          const initials = isMe ? 'Me' : getInitials(displayName);

          return (
            <div key={i} className={`flex gap-4 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 mt-1 shadow-md ${isMe ? 'bg-orange-500' : 'bg-slate-500'}`}>
                {initials}
              </div>

              <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{displayName}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
                <div className={`px-5 py-3 rounded-2xl text-lg shadow-md leading-relaxed ${
                  isMe 
                    ? 'bg-orange-600 text-white rounded-tr-none' 
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-none'
                }`}>
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-10">
        <form onSubmit={handleSend} className="relative flex items-center">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message ${name}...`}
            className="w-full pl-6 pr-14 py-4 rounded-xl bg-slate-100 dark:bg-slate-800 border-none focus:ring-2 focus:ring-orange-500 text-base text-slate-800 dark:text-slate-100 placeholder-slate-500 shadow-inner"
          />
          <button type="submit" disabled={!input.trim()} className="absolute right-4 p-2 text-slate-400 hover:text-orange-600 disabled:opacity-50 transition-colors">
            <SendIcon />
          </button>
        </form>
      </div>

      {/* --- RENDER THE MODAL --- */}
      {/* FIX 2: Now passing 'group' AND 'currentUser' correctly */}
      {type === 'group' && currentGroup && currentUser && (
        <GroupSettingsModal 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)} 
            group={currentGroup}
            currentUser={currentUser}
        />
      )}
    </div>
  );
}