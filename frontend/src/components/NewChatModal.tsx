"use client";

import { useState, FormEvent, useEffect, useCallback } from 'react';
import { 
  searchUsers,
  createOrGetConversation,
  ConversationPublic
} from '@/services/chatService';
import { UserPublic } from '@/services/authService';

// --- (Copied from your dashboard/settings files) ---
const SpinnerIcon = ({className = "h-5 w-5 text-white"} : {className?: string}) => ( <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>);
const SearchIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" {...props}><path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" /></svg>);
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out">
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-lg transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-modalShow border border-slate-200/80 dark:border-slate-700/70">
        <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-300 dark:border-slate-700">
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-orange-500 dark:text-slate-500 dark:hover:text-orange-400 text-3xl transition-colors rounded-full p-1 leading-none flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700"
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>
        {children}
      </div>
      <style jsx global>{`
        @keyframes modalShow { 
          0% { transform: scale(0.95) translateY(20px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; } 
        }
        .animate-modalShow { 
          animation: modalShow 0.35s cubic-bezier(0.25, 0.8, 0.25, 1) forwards; 
        }
      `}</style>
    </div>
  );
};
// --- (End Copied Code) ---

// --- (NEW) Debounce Hook ---
// This is a simple hook to prevent spamming the API on every keypress
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}
// --- (END Debounce) ---

// --- Main Component ---
interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  // This callback will tell the main page to open the new chat
  onConversationStarted: (conversation: ConversationPublic) => void;
}

const NewChatModal = ({ isOpen, onClose, onConversationStarted }: NewChatModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<UserPublic[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false); // For when clicking a user

  const debouncedSearchQuery = useDebounce(searchQuery, 300); // Wait 300ms after user stops typing

  // This effect runs when the *debounced* query changes
  useEffect(() => {
    if (debouncedSearchQuery.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const performSearch = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const users = await searchUsers(debouncedSearchQuery);
        setResults(users);
      } catch (err: any) {
        setError(err.message || "Failed to search users.");
      } finally {
        setIsLoading(false);
      }
    };
    
    performSearch();
  }, [debouncedSearchQuery]);

  const resetForm = () => {
    setSearchQuery('');
    setResults([]);
    setIsLoading(false);
    setError(null);
    setIsCreating(false);
  };

  const handleSelectUser = async (user: UserPublic) => {
    setIsCreating(true);
    setError(null);
    try {
      // Call the API to create or get the conversation
      const newConversation = await createOrGetConversation(user.id);
      onConversationStarted(newConversation); // Pass the new convo back
      handleClose(); // Close the modal
    } catch (err: any) {
      setError(err.message || "Could not start conversation.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Start a New Conversation">
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white/70 dark:bg-slate-700/80 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
            autoFocus
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchIcon className="text-slate-400" />
          </div>
          {isLoading && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <SpinnerIcon className="w-5 h-5 text-orange-500" />
            </div>
          )}
        </div>
        
        {/* Error Message */}
        {error && (
          <p className="p-3 text-sm text-red-700 bg-red-100 dark:bg-red-900/50 dark:text-red-300 rounded-md border border-red-300 dark:border-red-700">
            {error}
          </p>
        )}

        {/* Results List */}
        <div className="max-h-60 overflow-y-auto chat-scrollbar bg-slate-100 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
          {results.length > 0 ? (
            <ul className="divide-y divide-slate-200 dark:divide-slate-700">
              {results.map(user => (
                <li 
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      {user.firstname} {user.lastname}
                    </p>
                    {/* This is the differentiator you asked for */}
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {user.email}
                    </p>
                  </div>
                  {isCreating && (
                    <SpinnerIcon className="w-5 h-5 text-orange-500" />
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
              {debouncedSearchQuery.length < 2 
                ? "Type at least 2 characters to search."
                : (isLoading ? "Searching..." : "No users found.")
              }
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default NewChatModal;