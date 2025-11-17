"use client";

import { useEffect, useState, useRef } from 'react';
import { UserPublic, fetchUserProfile } from '@/services/authService';
import {
  MessagePublic,
  fetchConversationMessages,
  chatSocket // The WebSocket service
} from '@/services/chatService';

// Import the reusable components we already built
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';

// --- Icons ---
const SpinnerIcon = ({ className = "h-5 w-5 text-white" }: { className?: string }) => ( <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>);
// --- End Icons ---

interface DirectMessageChatProps {
  conversationId: string;
}

const DirectMessageChat = ({ conversationId }: DirectMessageChatProps) => {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [messages, setMessages] = useState<MessagePublic[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [postError, setPostError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'auto') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // --- 1. Load Initial Data (History & User) ---
  useEffect(() => {
    if (!conversationId) return;
    
    const loadChatData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [userData, messageHistory] = await Promise.all([
          fetchUserProfile(),
          fetchConversationMessages(conversationId)
        ]);
        
        setUser(userData);
        setMessages(messageHistory);
        scrollToBottom('auto'); 
      } catch (err: any) {
        setError(err.message || "Failed to load chat history.");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadChatData();
  }, [conversationId]);
  
  // --- 2. WebSocket Connection & Listeners ---
  useEffect(() => {
    chatSocket.connect();

    const handleNewMessage = (newMessage: MessagePublic) => {
      if (newMessage.conversation_id === conversationId) {
        setMessages(prevMessages => [...prevMessages, newMessage]);
      }
    };

    chatSocket.on('new_message', handleNewMessage);

    return () => {
      chatSocket.off('new_message', handleNewMessage);
    };
  }, [conversationId]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages.length]);

  // --- 3. Handle Sending a New Message ---
  const handleSendMessage = async (content: string) => {
    setPostError(null);
    try {
      chatSocket.sendMessage(conversationId, content);
    } catch (err: any) {
      setPostError("Failed to send message. Please check your connection.");
      throw err; // Let the input know it failed
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return <div className="flex-1 flex items-center justify-center"><SpinnerIcon className="h-10 w-10 text-orange-500" /></div>;
    }
    if (error) {
      return <div className="flex-1 flex items-center justify-center p-4"><p className="text-red-500">{error}</p></div>;
    }
    return (
      <div className="flex-1 overflow-y-auto chat-scrollbar p-4 space-y-4">
        {messages.map(post => (
          <MessageBubble
            key={post.id}
            
            // --- (THIS IS THE FIX) ---
            // We map the DM's `MessagePublic` object to the
            // props `MessageBubble` now expects.
            post={{
              id: post.id,
              content: post.content,
              created_at: post.created_at,
              author: {
                id: post.sender_id // This is all it needs to check 'isMine'
                // firstname and lastname are optional, so we omit them
              }
            }}
            // --- (END FIX) ---

            currentUser={user}
            isGroup={false} // <-- This tells the bubble to HIDE author names
            replyContext={null} // DMs don't have replies
            onReply={() => {}}  // DMs don't have replies
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {renderContent()}
      <div className="flex-shrink-0">
        {postError && (
          <div className="p-2 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 text-sm text-center">
            {postError}
          </div>
        )}
        <MessageInput
          onSubmit={handleSendMessage}
        />
      </div>
    </div>
  );
};
export default DirectMessageChat;