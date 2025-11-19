"use client";

// We now ONLY import the new unified interface
import ChatInterface from './ChatInterface';

interface ChatWindowProps {
  conversationId: string;
  type: 'group' | 'dm';
  name: string;
}

const ChatWindow = ({ conversationId, type, name }: ChatWindowProps) => {
  // This simply passes data to the new UI component
  return (
    <ChatInterface 
      key={`${type}-${conversationId}`} // Forces a fresh render when switching chats
      id={conversationId} 
      type={type} 
      name={name} 
    />
  );
};

export default ChatWindow;