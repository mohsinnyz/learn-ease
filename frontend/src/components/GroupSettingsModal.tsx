// frontend/src/components/GroupSettingsModal.tsx
"use client";

import { useState, FormEvent, useEffect } from 'react';
import { 
  StudyGroupPublic,
  GroupMemberPublic,
  getGroupMembers,
  inviteMember,
  kickMember,
  transferOwnership,
  leaveGroup
} from '@/services/studyGroupService';
import { UserPublic } from '@/services/authService';

// --- Icons ---
const SpinnerIcon = ({ className = "h-5 w-5 text-white" }: { className?: string }) => (
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
);

// Flexible XMarkIcon to match other components
const XMarkIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
  </svg>
);

const MailIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" /><path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" /></svg>);
const ShieldCheckIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M12.516 2.17a.75.75 0 00-1.032 0 11.209 11.209 0 01-7.877 3.08.75.75 0 00-.722.515A12.74 12.74 0 002.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 00.374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 00-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08zm3.094 8.016a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 11.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" /></svg>);
const TrashIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.49 1.478l-.56-.058a46.645 46.645 0 00-1.058 10.454H5.83a46.648 46.648 0 00-1.058-10.454l-.56.058a.75.75 0 11-.49-1.478 48.567 48.567 0 013.878-.512V4.478a2.25 2.25 0 012.25-2.25h3.75a2.25 2.25 0 012.25 2.25zM5.09 19.75a45.034 45.034 0 01-.67-9.954h15.16c-.18 3.409-.42 6.725-.67 9.954a2.25 2.25 0 01-2.26 2.07h-9.3a2.25 2.25 0 01-2.26-2.07z" clipRule="evenodd" /></svg>);
const LogOutIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M7.5 3.75A1.5 1.5 0 006 5.25v13.5a1.5 1.5 0 001.5 1.5h6a1.5 1.5 0 001.5-1.5V15a.75.75 0 011.5 0v3.75a3 3 0 01-3 3h-6a3 3 0 01-3-3V5.25a3 3 0 013-3h6a3 3 0 013 3V9A.75.75 0 0115 9V5.25a1.5 1.5 0 00-1.5-1.5h-6zm10.72 4.72a.75.75 0 011.06 0l3 3a.75.75 0 010 1.06l-3 3a.75.75 0 11-1.06-1.06l1.72-1.72H9a.75.75 0 010-1.5h10.94l-1.72-1.72a.75.75 0 010-1.06z" clipRule="evenodd" /></svg>);

// --- Modal Component ---
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl transform transition-all duration-300 scale-100 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[190vh] animate-fadeIn">
        {/* Header - Updated with prominent border */}
        <div className="flex justify-between items-center px-8 py-6 border-b-2 border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-900 rounded-t-2xl">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-red-600">
              {title}
            </h2>
            <p className="text-base text-slate-500 mt-1 font-medium">Manage members & permissions</p>
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

  const [isLeaving, setIsLeaving] = useState(false);

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

  useEffect(() => {
    if (isOpen) loadMembers();
  }, [isOpen, group.id]);

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
      setInviteSuccess(`User Added ${inviteEmail}`);
      setInviteEmail('');
    } catch (err: any) {
      setInviteError(err.message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleKick = async (member: GroupMemberPublic) => {
    if (!window.confirm(`Are you sure you want to kick ${member.firstname} ${member.lastname}?`)) return;
    setError(null);
    try {
      await kickMember(group.id, member.id);
      loadMembers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleTransfer = async (member: GroupMemberPublic) => {
    if (!window.confirm(`Make ${member.firstname} ${member.lastname} the new admin?`)) return;
    setError(null);
    try {
      await transferOwnership(group.id, member.id);
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLeaveGroup = async () => {
    const isUserAdmin = currentUser.id === group.admin_id;
    const confirmMessage = isUserAdmin
      ? "You are the admin. You must transfer ownership before leaving. Continue?"
      : "Are you sure you want to leave this group?";
    if (!window.confirm(confirmMessage)) return;

    setIsLeaving(true);
    setError(null);
    try {
      await leaveGroup(group.id);
      onClose();
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLeaving(false);
    }
  };

  const isUserAdmin = currentUser.id === group.admin_id;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Group Settings">
      <div className="space-y-8">

        
        <section className="space-y-3">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Add New Member</h3>
          <form onSubmit={handleInvite} className="flex gap-3">
             <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <MailIcon />
                </div>
                <input 
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="Enter student email..."
                    className="block w-full pl-12 pr-4 py-4 bg-slate-100 dark:bg-slate-900 border-2 border-transparent rounded-xl focus:bg-white dark:focus:bg-slate-950 focus:border-orange-500 outline-none text-slate-900 dark:text-white placeholder-slate-400 transition-all font-medium"
                    required
                />
            </div>
            <button
              type="submit"
              disabled={isInviting}
              className="px-6 py-4 bg-gradient-to-br from-orange-500 to-red-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isInviting ? <SpinnerIcon /> : "Invite"}
            </button>
          </form>
          
          {/* Feedback Messages */}
          {inviteError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-bold flex items-center gap-2 animate-fadeIn">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  {inviteError}
              </div>
          )}
          {inviteSuccess && (
              <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm font-bold flex items-center gap-2 animate-fadeIn">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  {inviteSuccess}
              </div>
          )}
        </section>

        {/* 2. Member List Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
             <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Members ({members.length})</h3>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-180 overflow-y-auto custom-scrollbar p-2">
            {isLoading ? (
              <div className="flex justify-center p-8">
                <SpinnerIcon className="w-8 h-8 text-orange-500" />
              </div>
            ) : (
              <ul className="space-y-1">
                {members.map(member => (
                  <li key={member.id} className="group flex items-center justify-between p-3 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm">
                    
                    {/* User Info */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                        {member.firstname[0]}{member.lastname[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                           {member.firstname} {member.lastname}
                           {member.id === currentUser.id && (
                               <span className="text-[10px] font-extrabold uppercase text-slate-400 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">You</span>
                           )}
                        </p>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            {member.id === group.admin_id ? (
                                <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-bold">
                                    <ShieldCheckIcon /> Admin
                                </span>
                            ) : "Member"}
                        </p>
                      </div>
                    </div>

                    {/* Admin Actions */}
                    {isUserAdmin && member.id !== currentUser.id && (
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleTransfer(member)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                          title="Transfer Ownership"
                        >
                           <ShieldCheckIcon />
                        </button>
                        <button
                          onClick={() => handleKick(member)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title="Kick User"
                        >
                           <TrashIcon />
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {error && <p className="text-sm font-bold text-red-600">{error}</p>}
        </section>

        {/* 3. Danger Zone (Leave Group) */}
        <section className="pt-6 border-t border-slate-100 dark:border-slate-800">
           <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl p-4 flex items-center justify-between">
               <div>
                   <h3 className="text-base font-bold text-red-700 dark:text-red-400">Leave Group</h3>
                   <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-0.5">
                        {isUserAdmin ? "Transfer ownership to another member first." : "You will lose access to group chats."}
                   </p>
               </div>
               <button
                onClick={handleLeaveGroup}
                disabled={isLeaving || isUserAdmin}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-bold rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
               >
                  {isLeaving ? <SpinnerIcon className="w-4 h-4 text-red-600" /> : (
                      <>
                        <LogOutIcon /> Leave
                      </>
                  )}
               </button>
           </div>
        </section>

      </div>
    </Modal>
  );
};

export default GroupSettingsModal;