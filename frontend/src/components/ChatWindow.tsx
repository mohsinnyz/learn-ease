"use client";

// --- (NEW) Import the real components ---
import GroupChat from './GroupChat';
import DirectMessageChat from './DirectMessageChat';
// --- (END NEW) ---

// --- (DELETED) The placeholder 'DirectMessageChat' component is now gone ---

interface ChatWindowProps {
  conversationId: string;
  type: 'group' | 'dm';
  name: string;
}

const ChatWindow = ({ conversationId, type }: ChatWindowProps) => {
  // This component is the "router" for the right panel.
  
  if (type === 'group') {
    // It renders the REAL GroupChat component
    return <GroupChat key={conversationId} threadId={conversationId} />;
  }
  
  if (type === 'dm') {
    // --- (NEW) It now renders the REAL DirectMessageChat component ---
    return <DirectMessageChat key={conversationId} conversationId={conversationId} />;
  }

  // Fallback in case type is invalid
  return (
    <div className="p-4 text-center text-red-500">
      Error: Unknown conversation type.
    </div>
  );
};

export default ChatWindow;