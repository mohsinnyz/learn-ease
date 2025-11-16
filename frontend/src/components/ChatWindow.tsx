"use client";

// We import the (real) GroupChat component
import GroupChat from './GroupChat';

// --- (Placeholder for Stage 3) ---
const DirectMessageChat = ({ dmId }: { dmId: string }) => (
  <div className="p-4 flex-1 flex flex-col items-center justify-center">
    <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300">
      Private Chat
    </h2>
    <p className="text-slate-500 dark:text-slate-400">
      (Real-time DM UI will go here in Stage 3)
    </p>
  </div>
);
// --- End Placeholder ---

interface ChatWindowProps {
  conversationId: string;
  type: 'group' | 'dm';
}

const ChatWindow = ({ conversationId, type }: ChatWindowProps) => {
  // This component is the "router" for the right panel.
  
  if (type === 'group') {
    // It renders the REAL GroupChat component
    // We pass the forum_thread_id as the key
    return <GroupChat key={conversationId} threadId={conversationId} />;
  }
  
  if (type === 'dm') {
    return <DirectMessageChat key={conversationId} dmId={conversationId} />;
  }

  return (
    <div className="p-4 text-center text-red-500">
      Error: Unknown conversation type.
    </div>
  );
};

export default ChatWindow;