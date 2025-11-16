"use client";

import { useState, FormEvent, useEffect } from 'react';
import { 
  StudyGroupPublic,
  GroupMemberPublic,
  getGroupMembers,
  inviteMember,
  kickMember,
  transferOwnership,
  leaveGroup // <-- 1. Import the new function
} from '@/services/studyGroupService';
import { UserPublic } from '@/services/authService';

// --- (Copied from your dashboard/settings files) ---
const SpinnerIcon = ({className = "h-5 w-5 text-white"} : {className?: string}) => ( <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>);

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




// --- Main Component ---
interface GroupSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: StudyGroupPublic;
  currentUser: UserPublic;
}

const GroupSettingsModal = ({ isOpen, onClose, group, currentUser }: GroupSettingsModalProps) => {
  const [members, setMembers] = useState<GroupMemberPublic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  
  // --- 2. Add new state for the leave button ---
  const [isLeaving, setIsLeaving] = useState(false);

  // This function loads the member list
  const loadMembers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const memberList = await getGroupMembers(group.id);
      setMembers(memberList);
    } catch (err: any) {
      setError(err.message || "Failed to load group members.");
    } finally {
      setIsLoading(false);
    }
  };

  // Load members when the modal is opened
  useEffect(() => {
    if (isOpen) {
      loadMembers();
    }
  }, [isOpen, group.id]);

  // --- Form Handlers ---
  
  const handleInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!inviteEmail.trim()) {
      setInviteError("Email is required.");
      return;
    }
    
    setIsInviting(true);
    setInviteError(null);
    setInviteSuccess(null);
    try {
      await inviteMember(group.id, inviteEmail);
      setInviteSuccess(`Successfully invited ${inviteEmail}!`);
      setInviteEmail('');
      loadMembers(); // Refresh the member list
    } catch (err: any) {
      setInviteError(err.message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleKick = async (member: GroupMemberPublic) => {
    if (!window.confirm(`Are you sure you want to kick ${member.firstname} ${member.lastname}?`)) {
      return;
    }
    
    setError(null); // Clear main error
    try {
      await kickMember(group.id, member.id);
      loadMembers(); // Refresh list on success
    } catch (err: any) {
      setError(err.message); // Show error in main section
    }
  };

  const handleTransfer = async (member: GroupMemberPublic) => {
    if (!window.confirm(`Are you sure you want to make ${member.firstname} ${member.lastname} the new admin? You will lose your admin status.`)) {
      return;
    }
    
    setError(null);
    try {
      await transferOwnership(group.id, member.id);
      // On success, the backend has changed the admin.
      // We'll close the modal as the user is no longer admin.
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLeaveGroup = async () => {
    // Check if admin is trying to leave
    const isUserAdmin = currentUser.id === group.admin_id;
    const confirmMessage = isUserAdmin
      ? "You are the admin. You must transfer ownership before leaving. Are you sure you want to try?" // This will fail, but we show the error.
      : "Are you sure you want to leave this group?";
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    setIsLeaving(true);
    setError(null);
    try {
      await leaveGroup(group.id);
      // If successful, close the modal and refresh the app
      onClose(); 
      window.location.reload(); // Easiest way to refresh the inbox list
    } catch (err: any) {
      setError(err.message); // This will show "Admin cannot leave..."
    } finally {
      setIsLeaving(false);
    }
  };

  const isUserAdmin = currentUser.id === group.admin_id;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Group Settings">
      <div className="space-y-6">

        {/* --- 1. Invite Members (FR 19.2) --- */}
        <section>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Invite New Member</h3>
          <form onSubmit={handleInvite} className="flex space-x-2">
            <input 
              type="email" 
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Enter user's email"
              className="flex-grow px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white/70 dark:bg-slate-700/80 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
              required
            />
            <button
              type="submit"
              disabled={isInviting}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-medium rounded-lg shadow-md hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-2 ring-offset-2 dark:ring-offset-slate-800 ring-red-500 disabled:opacity-60 flex items-center justify-center"
            >
              {isInviting ? <SpinnerIcon className="w-5 h-5" /> : "Invite"}
            </button>
          </form>
          {inviteError && <p className="mt-2 text-sm text-red-500">{inviteError}</p>}
          {inviteSuccess && <p className="mt-2 text-sm text-green-600">{inviteSuccess}</p>}
        </section>
        
{/* --- Error Display --- */}
        {error && <p className="p-3 text-sm text-red-700 bg-red-100 dark:bg-red-900/50 dark:text-red-300 rounded-md border border-red-300 dark:border-red-700">{error}</p>}

        {/* --- 2. Member List (Visible to all members) --- */}
        <section>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
            Members ({members.length})
          </h3>
          <div className="max-h-60 overflow-y-auto chat-scrollbar bg-slate-100 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
            {isLoading ? (
              <div className="flex justify-center p-4">
                <SpinnerIcon className="w-8 h-8 text-orange-500" />
              </div>
            ) : (
              <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                {members.map(member => (
                  <li key={member.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-3">
                    {/* Member Info */}
                    <div className="flex items-center space-x-3 mb-2 sm:mb-0">
                      {/* ... (avatar/initials) ... */}
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                          {member.firstname} {member.lastname}
                          {member.id === group.admin_id && (
                            <span className="ml-2 text-xs font-bold text-orange-500">(Admin)</span>
                          )}
                        </p>
                      </div>
                    </div>
                    
                    {/* Admin Actions */}
                    {currentUser.id === group.admin_id && member.id !== currentUser.id && (
                      <div className="flex space-x-2 self-end sm:self-center">
                        <button
                          onClick={() => handleTransfer(member)}
                          className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-800/50"
                        >
                          Make Admin
                        </button>
                        <button
                          onClick={() => handleKick(member)}
                          className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-800/50"
                        >
                          Kick
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* --- 4. (NEW) Danger Zone --- */}
        <section className="pt-4 border-t border-slate-300 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
            Leave Group
          </h3>
          <div className="flex justify-between items-center mt-2">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {isUserAdmin 
                ? "You must transfer ownership before leaving."
                : "This action cannot be undone."
              }
            </p>
            <button
              onClick={handleLeaveGroup}
              disabled={isLeaving}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 ring-red-500 disabled:opacity-50 flex items-center justify-center"
            >
              {isLeaving ? <SpinnerIcon /> : "Leave Group"}
            </button>
          </div>
        </section>

      </div>
    </Modal>
  );
};

export default GroupSettingsModal;