// frontend/src/components/CreateGroupModal.tsx
"use client";

import { useState, FormEvent, useEffect } from "react";
import {
  createGroup,
  StudyGroupCreate,
  StudyGroupPublic,
} from "@/services/studyGroupService";
import { searchUsers } from "@/services/chatService";
import { UserPublic } from "@/services/authService";

// --- Icons ---
const SpinnerIcon = ({ className = "h-5 w-5 text-white" }: { className?: string }) => (
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

// Updated XMarkIcon to accept className for flexible sizing
const XMarkIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
  </svg>
);

const UserGroupIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 5.472m0 0a9.09 9.09 0 00-3.279 3.298m.944-5.497a5.974 5.974 0 00-4.125 5m4.125 0a9 9 0 01-4.125-5M3 7.5a3 3 0 116 0 3 3 0 01-6 0zm13.5 3a3 3 0 116 0 3 3 0 01-6 0z" /></svg>);
const TextIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" /></svg>);
const SearchIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" /></svg>);

// --- Modal Shell ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all duration-300">
      {/* Standardized Width: max-w-xl for a nice vertical flow that isn't too narrow */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl transform transition-all duration-300 scale-100 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] animate-fadeIn">
        {/* Header - Updated with prominent border */}
        <div className="flex justify-between items-center px-8 py-6 border-b-2 border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-900 rounded-t-2xl">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-red-600">
              {title}
            </h2>
            <p className="text-base text-slate-500 mt-1 font-medium">Collaborate with peers</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close modal"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-8 overflow-y-auto custom-scrollbar">
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

// --- Main Component ---
interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (newGroup: StudyGroupPublic) => void;
}

const CreateGroupModal = ({
  isOpen,
  onClose,
  onGroupCreated,
}: CreateGroupModalProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  
  // Search State
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserPublic[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserPublic[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebounce(query, 300);

  // Effect for User Search
  useEffect(() => {
    if (debouncedQuery.length < 2) {
        setSearchResults([]);
        return;
    }

    const search = async () => {
        setIsSearching(true);
        try {
            const users = await searchUsers(debouncedQuery);
            // Filter out already selected users
            setSearchResults(users.filter(u => !selectedUsers.some(selected => selected.id === u.id)));
        } catch (err) {
            console.error("Search failed", err);
        } finally {
            setIsSearching(false);
        }
    };
    search();
  }, [debouncedQuery, selectedUsers]);

  const handleAddUser = (user: UserPublic) => {
      setSelectedUsers([...selectedUsers, user]);
      setQuery(""); 
      setSearchResults([]);
  };

  const handleRemoveUser = (userId: string) => {
      setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setSelectedUsers([]);
    setQuery("");
    setError(null);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      setError("Group name is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const groupData: StudyGroupCreate = {
      name: name.trim(),
      description: description.trim() || null,
      // If your backend supports adding members on creation, uncomment this:
      // member_ids: selectedUsers.map(u => u.id) 
    };

    try {
      const newGroup = await createGroup(groupData);
      onGroupCreated(newGroup);
      resetForm();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create group.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Study Group">
      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* 1. Group Name */}
        <div className="space-y-3">
            <label htmlFor="groupName" className="block text-lg font-bold text-slate-800 dark:text-slate-100">
                Group Name
            </label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <UserGroupIcon />
                </div>
                <input
                    id="groupName"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., CS101 Finals Prep"
                    className="block w-full pl-12 pr-4 py-4 text-lg bg-slate-100 dark:bg-slate-900 border-2 border-transparent rounded-xl focus:bg-white dark:focus:bg-slate-950 focus:border-orange-500 outline-none text-slate-900 dark:text-white placeholder-slate-400 transition-all font-medium"
                    required
                    minLength={3}
                    maxLength={100}
                />
            </div>
        </div>

        {/* 2. Description */}
        <div className="space-y-3">
            <label htmlFor="groupDescription" className="block text-lg font-bold text-slate-800 dark:text-slate-100">
                Description <span className="text-sm font-normal text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded ml-2">Optional</span>
            </label>
            <div className="relative">
                <div className="absolute top-4 left-4 flex items-center pointer-events-none text-slate-400">
                    <TextIcon />
                </div>
                <textarea
                    id="groupDescription"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What is the goal of this group?"
                    rows={3}
                    maxLength={500}
                    className="block w-full pl-12 pr-4 py-4 text-base bg-slate-100 dark:bg-slate-900 border-2 border-transparent rounded-xl focus:bg-white dark:focus:bg-slate-950 focus:border-orange-500 outline-none text-slate-900 dark:text-white placeholder-slate-400 transition-all font-medium resize-none"
                />
            </div>
        </div>

        {/* 3. Add Members Section */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
             <label className="block text-lg font-bold text-slate-800 dark:text-slate-100 mb-3">
                Add Members <span className="text-sm font-normal text-slate-400 bg-slate-100 dark"></span>
            </label>
            
            {/* Search Input */}
            <div className="relative mb-3">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <SearchIcon />
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by student name..."
                    className="block w-full pl-12 pr-10 py-4 text-base bg-slate-100 dark:bg-slate-900 border-2 border-transparent rounded-xl focus:bg-white dark:focus:bg-slate-950 focus:border-orange-500 outline-none text-slate-900 dark:text-white placeholder-slate-400 transition-all font-medium"
                />
                {isSearching && (
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                        <SpinnerIcon className="w-5 h-5 text-orange-500" />
                    </div>
                )}
            </div>

            {/* Container for Search Results & Selected Chips */}
            {(selectedUsers.length > 0 || searchResults.length > 0) && (
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-3 animate-fadeIn">
                    
                    {/* Selected Users (Chips) */}
                    {selectedUsers.length > 0 && (
                         <div className="flex flex-wrap gap-2">
                            {selectedUsers.map(user => (
                                <div key={user.id} className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full pl-1 pr-3 py-1 shadow-sm animate-fadeIn">
                                     <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-red-500 text-white flex items-center justify-center text-[10px] font-bold">
                                            {user.firstname[0]}{user.lastname[0]}
                                     </div>
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{user.firstname}</span>
                                    <button type="button" onClick={() => handleRemoveUser(user.id)} className="text-slate-400 hover:text-red-500 ml-1 transition-colors">
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                         </div>
                    )}

                    {/* Search Results List */}
                    {searchResults.length > 0 && (
                        <div className={`${selectedUsers.length > 0 ? 'border-t border-slate-200 dark:border-slate-700 pt-2 mt-2' : ''}`}>
                             <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wider">Click to add</p>
                            <ul className="space-y-1 max-h-[200px] overflow-y-auto custom-scrollbar">
                                {searchResults.map(user => (
                                    <li key={user.id} onClick={() => handleAddUser(user)} className="flex items-center justify-between p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm cursor-pointer transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs font-bold">
                                                {user.firstname[0]}{user.lastname[0]}
                                            </div>
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{user.firstname} {user.lastname}</span>
                                        </div>
                                        <span className="text-orange-500 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">Add +</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 animate-pulse">
             <div className="w-2 h-2 bg-red-500 rounded-full"></div>
             <p className="text-sm font-bold text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`
                w-full py-4 text-lg font-bold text-white rounded-xl shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all transform
                ${isSubmitting 
                    ? 'bg-slate-400 cursor-not-allowed' 
                    : 'bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 hover:from-orange-400 hover:to-red-500 hover:-translate-y-1 hover:shadow-orange-500/40 active:scale-95'}
            `}
          >
            {isSubmitting ? <SpinnerIcon /> : "Create Study Group"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateGroupModal;