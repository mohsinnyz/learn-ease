// frontend/src/components/NewChatModal.tsx
"use client";

import { useState, useEffect } from 'react';
import { 
  searchUsers,
  createOrGetConversation,
  ConversationPublic
} from '@/services/chatService';
import { UserPublic } from '@/services/authService';

// --- Icons ---
const SpinnerIcon = ({ className = "h-5 w-5 text-white" }: { className?: string }) => (
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const SearchIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" {...props}>
    <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
  </svg>
);

const XMarkIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" /></svg>);
const UserPlusIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-slate-200 dark:text-slate-700"><path d="M6.25 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM3.25 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM19.75 7.5a.75.75 0 00-1.5 0v2.25H16a.75.75 0 000 1.5h2.25v2.25a.75.75 0 001.5 0v-2.25H22a.75.75 0 000-1.5h-2.25V7.5z" /></svg>);

// --- Modal Wrapper ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl transform transition-all duration-300 scale-100 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] animate-fadeIn">
        {/* Header - Updated with prominent border */}
        <div className="flex justify-between items-center px-8 py-6 border-b-2 border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-900 rounded-t-2xl">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-red-600">
              {title}
            </h2>
            <p className="text-base text-slate-500 mt-1 font-medium">Find peers and mentors</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close modal"
          >
            <XMarkIcon />
          </button>
        </div>
        {/* Body */}
        <div className="p-8"> 
          {children}
        </div>
      </div>
    </div>
  );
};

// --- Debounce Hook ---
function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// --- NewChatModal ---
interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConversationStarted: (conversation: ConversationPublic) => void;
}

const NewChatModal = ({ isOpen, onClose, onConversationStarted }: NewChatModalProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserPublic[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounced = useDebounce(query, 300);

  useEffect(() => {
    if (debounced.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const search = async () => {
      setLoading(true);
      setError(null);
      try {
        const users = await searchUsers(debounced);
        setResults(users);
      } catch (err: any) {
        setError(err.message || "Failed to search users.");
      } finally {
        setLoading(false);
      }
    };

    search();
  }, [debounced]);

  const reset = () => {
    setQuery('');
    setResults([]);
    setLoading(false);
    setCreating(false);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSelect = async (user: UserPublic) => {
    setCreating(true);
    setError(null);
    try {
      const convo = await createOrGetConversation(user.id);
      onConversationStarted(convo);
      handleClose(); 
    } catch (err: any) {
      setError(err.message || "Could not start conversation.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New Chat">
      <div className="space-y-8"> {/* Increased spacing */}

        {/* Search Input Section */}
        <div className="space-y-3">
            <label className="block text-lg font-bold text-slate-800 dark:text-slate-100">
                Search Users
            </label>
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <SearchIcon className="text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                </div>
                <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name (e.g. John)..."
                className="block w-full pl-12 pr-12 py-4 text-lg bg-slate-100 dark:bg-slate-900 border-2 border-transparent rounded-xl focus:bg-white dark:focus:bg-slate-950 focus:border-orange-500 outline-none text-slate-900 dark:text-white placeholder-slate-400 transition-all font-medium shadow-sm"
                autoFocus
                />
                {loading && (
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                    <SpinnerIcon className="w-5 h-5 text-orange-500" />
                </div>
                )}
            </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 animate-pulse">
             <div className="w-2 h-2 bg-red-500 rounded-full"></div>
             <p className="text-sm font-bold text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Results / Empty State */}
        <div className="min-h-[200px]">
          {results.length > 0 ? (
             // Results list
            <ul className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
              {results.map(user => (
                <li
                  key={user.id}
                  onClick={() => handleSelect(user)}
                  className="group p-3 rounded-xl cursor-pointer bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-orange-200 dark:hover:border-orange-900 hover:shadow-md hover:shadow-orange-500/5 transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    {/* Modern Gradient Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                      {user.firstname.charAt(0).toUpperCase()}{user.lastname.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-base font-bold text-slate-800 dark:text-slate-100 group-hover:text-orange-600 transition-colors">
                        {user.firstname} {user.lastname}
                      </p>
                      <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  
                  {/* Action Button */}
                  {creating ? (
                      <SpinnerIcon className="w-5 h-5 text-orange-500" />
                  ) : (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                        <span className="px-3 py-1.5 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-bold rounded-lg">
                            Start Chat
                        </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            /* Empty State */
            <div className="flex flex-col items-center justify-center h-[200px] text-center p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/50">
              <div className="mb-3 bg-white dark:bg-slate-800 p-3 rounded-full shadow-sm">
                  <UserPlusIcon />
              </div>
              <p className={`text-base font-bold ${debounced.length < 2 ? "text-slate-400" : "text-slate-600 dark:text-slate-300"}`}>
                {debounced.length < 2 
                  ? "Search for a student or mentor" 
                  : (loading ? "Searching database..." : "No users found")}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                  Try searching by full name or email address
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default NewChatModal;