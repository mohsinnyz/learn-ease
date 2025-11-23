// frontend/src/app/settings/page.tsx
"use client";

import { useEffect, useState, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { 
    Category, 
    fetchUserCategories, 
    createCategory, 
    updateCategoryName, 
    deleteCategory 
} from "@/services/categoryService";

import { 
    UserPublic, 
    UserUpdatePayload, 
    fetchUserProfile, 
    updateUserProfile,
    UserPasswordChangePayload,
    changePassword
} from "@/services/authService"; 

// --- Icons ---
const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1.5" {...props}><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" /></svg> );
const EditIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1.5" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>);
const SaveIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1.5" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125V6.375c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v.001c0 .621.504 1.125 1.125 1.125z" /></svg>);
const SpinnerIcon = ({className = "h-5 w-5 text-white"} : {className?: string}) => ( <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>);
const ChevronLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);
const EnvelopeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
);
const CalendarDaysIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5M12 14.25h.008v.008H12v-.008zm0 2.25h.008v.008H12v-.008zM9.75 14.25h.008v.008H9.75v-.008zm0 2.25h.008v.008H9.75v-.008zm2.25-4.5h.008v.008H12v-.008zM15 14.25h.008v.008H15v-.008zm0 2.25h.008v.008H15v-.008zm2.25-4.5h.008v.008H17.25v-.008zm0 2.25h.008v.008H17.25V15z" />
    </svg>
);
const AcademicCapIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
  </svg>
);
const CheckBadgeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
    </svg>
);
const XCircleMiniIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
    </svg>
);
const PencilIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
  </svg>
);
const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12.56 0c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);
const FolderPlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
);
const SettingsAppIcon = (props: React.SVGProps<SVGSVGElement>) => ( 
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props} >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.26.713.53 1.003l.825.875a1.125 1.125 0 010 1.59l-.825.875a1.5 1.5 0 00-.53 1.004l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281a1.5 1.5 0 00-.53-1.004l-.825-.875a1.125 1.125 0 010-1.59l.825-.875a1.5 1.5 0 00.53-1.003l.213-1.28z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);
const XMarkIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
    </svg>
);

// --- Global Styles (Unified Design) ---
const GlobalStyles = () => (
  <style jsx global>{`
    /* Unified Card Style */
    .learn-ease-card {
      background-color: #ffffff; 
      border-radius: 1rem;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      border: 1px solid rgba(226, 232, 240, 1);
      transition: box-shadow 0.3s ease-out, transform 0.3s ease-out;
    }
    html.dark .learn-ease-card {
      background-color: rgba(30, 41, 59, 0.95);
      border-color: rgba(51, 65, 85, 0.8);
    }
    .learn-ease-card-hover:hover {
        box-shadow: 0 6px 20px -3px rgba(249, 115, 22, 0.35),
                    0 4px 30px 0px rgba(239, 68, 68, 0.25);
        transform: translateY(-2px);
    }

    /* Polka Dot Pattern */
    :root {
      --dot-pattern-url: url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1.5' cy='1.5' r='1.5' fill='%2394a3b8' fill-opacity='0.4'/%3E%3C/svg%3E");
      
      /* Autofill Variables */
      --input-bg-light: #ffffff;
      --input-text-light: #0f172a; 
      --input-placeholder-light: #94a3b8; 
      --input-caret-light: #0f172a;
      --input-bg-dark: rgba(51, 65, 85, 1); 
      --input-text-dark: #ffffff; 
      --input-placeholder-dark: #64748b; 
      --input-caret-dark: #ffffff;
    }
    html.dark {
      --dot-pattern-url: url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1' cy='1' r='1' fill='%23cbd5e1' fill-opacity='0.1'/%3E%3C/svg%3E");
    }

    input, select, textarea { background-clip: padding-box !important; }
    
    input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus, input:-webkit-autofill:active,
    select:-webkit-autofill, select:-webkit-autofill:hover, select:-webkit-autofill:focus, select:-webkit-autofill:active,
    textarea:-webkit-autofill, textarea:-webkit-autofill:hover, textarea:-webkit-autofill:focus, textarea:-webkit-autofill:active {
      -webkit-box-shadow: 0 0 0 1000px var(--input-bg-light) inset !important; 
      -webkit-text-fill-color: var(--input-text-light) !important; 
      caret-color: var(--input-caret-light) !important;
    }
    
    html.dark input:-webkit-autofill, html.dark input:-webkit-autofill:hover, html.dark input:-webkit-autofill:focus, html.dark input:-webkit-autofill:active,
    html.dark select:-webkit-autofill, html.dark select:-webkit-autofill:hover, html.dark select:-webkit-autofill:focus, html.dark select:-webkit-autofill:active,
    html.dark textarea:-webkit-autofill, html.dark textarea:-webkit-autofill:hover, html.dark textarea:-webkit-autofill:focus, html.dark textarea:-webkit-autofill:active {
      -webkit-box-shadow: 0 0 0 1000px var(--input-bg-dark) inset !important; 
      -webkit-text-fill-color: var(--input-text-dark) !important; 
      caret-color: var(--input-caret-dark) !important;
    }

    /* Subtle animation for cards */
    @keyframes cardEnterAnimation {
        from { opacity: 0; transform: translateY(15px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .animate-card-enter {
        opacity: 0; 
        animation: cardEnterAnimation 0.4s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
    }
    .settings-card-1 { animation-delay: 0.1s; }
    .settings-card-2 { animation-delay: 0.2s; }
    .settings-card-3 { animation-delay: 0.3s; }
  `}</style>
);

const passwordRequirements = [
  { id: 'length', text: 'At least 8 characters', regex: /.{8,}/ },
  { id: 'uppercase', text: 'An uppercase letter (A-Z)', regex: /[A-Z]/ },
  { id: 'lowercase', text: 'A lowercase letter (a-z)', regex: /[a-z]/ },
  { id: 'number', text: 'A number (0-9)', regex: /[0-9]/ },
  { id: 'special', text: 'A special character (e.g., !@#$%)', regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/ },
];

interface PasswordValidationStatus {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
}

// --- Unified Modal Component ---
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg transform transition-all duration-300 scale-100 border border-slate-200 dark:border-slate-800 flex flex-col animate-card-enter">
        <div className="flex justify-between items-center px-8 py-6 border-b-2 border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-900 rounded-t-2xl">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-red-600">
               {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close modal"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="p-8 overflow-y-auto custom-scrollbar">
           {children}
        </div>
      </div>
    </div>
  );
};

export default function SettingsPage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [profile, setProfile] = useState<UserPublic | null>(null);
  const [editableProfile, setEditableProfile] = useState<UserUpdatePayload>({});
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [errorProfile, setErrorProfile] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [updateProfileSuccess, setUpdateProfileSuccess] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [errorCategories, setErrorCategories] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [createCategoryError, setCreateCategoryError] = useState<string | null>(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [categoryToRename, setCategoryToRename] = useState<Category | null>(null);
  const [renamedCategoryName, setRenamedCategoryName] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
  const [changePasswordSuccess, setChangePasswordSuccess] = useState<string | null>(null);
  const [newPasswordValidation, setNewPasswordValidation] = useState<PasswordValidationStatus>({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });
  const [isNewPasswordFocused, setIsNewPasswordFocused] = useState(false);
  const allNewPasswordRequirementsMet = Object.values(newPasswordValidation).every(Boolean);

  useEffect(() => {
    setIsClient(true); 
  }, []);

  useEffect(() => {
    if (isClient) { 
      const token = localStorage.getItem("authToken");
      if (!token) {
        router.push("/login?message=Please log in to access settings.");
      } else {
        loadUserProfile(); 
        loadUserCategories(); 
      }
    }
  }, [isClient, router]);

  useEffect(() => {
    const newValidationStatus: PasswordValidationStatus = {
      length: passwordRequirements.find(r => r.id === 'length')!.regex.test(newPassword),
      uppercase: passwordRequirements.find(r => r.id === 'uppercase')!.regex.test(newPassword),
      lowercase: passwordRequirements.find(r => r.id === 'lowercase')!.regex.test(newPassword),
      number: passwordRequirements.find(r => r.id === 'number')!.regex.test(newPassword),
      special: passwordRequirements.find(r => r.id === 'special')!.regex.test(newPassword),
    };
    setNewPasswordValidation(newValidationStatus);
  }, [newPassword]); 


  const loadUserProfile = async () => { 
    setErrorProfile(null);
    setIsLoadingProfile(true);
    try { 
      const userProfileData = await fetchUserProfile(); 
      setProfile(userProfileData); 
      setEditableProfile({ 
        firstname: userProfileData.firstname,
        lastname: userProfileData.lastname,
        age: userProfileData.age,
        university_name: userProfileData.university_name,
      });
    } catch (err: unknown) { 
      setErrorProfile(err instanceof Error ? err.message : "Failed to load profile."); 
    } finally { 
      setIsLoadingProfile(false); 
    }
  };

  const handleProfileInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { 
    const { name, value } = e.target;
    setEditableProfile(prev => ({ ...prev, [name]: name === 'age' ? (value === '' ? undefined : parseInt(value, 10)) : value }));
  };

  const handleProfileUpdateSubmit = async (event: FormEvent<HTMLFormElement>) => { 
    event.preventDefault(); 
    setIsUpdatingProfile(true); 
    setErrorProfile(null); 
    setUpdateProfileSuccess(null);
    try { 
      const payloadToSend: UserUpdatePayload = {
          firstname: editableProfile.firstname,
          lastname: editableProfile.lastname,
      };
      if (editableProfile.age !== undefined && editableProfile.age !== null && !isNaN(Number(editableProfile.age))) {
          payloadToSend.age = Number(editableProfile.age);
      }
      if (typeof payloadToSend.age === 'number' && payloadToSend.age < 14) {
        setErrorProfile("Age must be 14 or above.");
        setIsUpdatingProfile(false); 
        return; 
      }      
      if (editableProfile.university_name !== undefined) {
          payloadToSend.university_name = editableProfile.university_name;
}
      const updatedProfileData = await updateUserProfile(payloadToSend); 
      setProfile(updatedProfileData); 
      setEditableProfile({ 
        firstname: updatedProfileData.firstname,
        lastname: updatedProfileData.lastname,
        age: updatedProfileData.age,
        university_name: updatedProfileData.university_name,
      });
      setIsEditingProfile(false); 
      setUpdateProfileSuccess("Profile updated successfully!");
      setTimeout(() => setUpdateProfileSuccess(null), 3000); 
    } catch (err: unknown) { 
      setErrorProfile(err instanceof Error ? err.message : "Failed to update profile.");
    } finally { 
      setIsUpdatingProfile(false); 
    }
  };
  const loadUserCategories = async () => {  
    setIsLoadingCategories(true);
    setErrorCategories(null); 
    try {
      const userCategories = await fetchUserCategories();
      setCategories(userCategories.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err: unknown) {
      setErrorCategories(err instanceof Error ? err.message : "Failed to load categories."); 
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const handleOpenCreateModal = () => { setNewCategoryName(""); setCreateCategoryError(null); setShowCreateModal(true); };
  
  const handleCreateCategory = async (event: FormEvent<HTMLFormElement>) => {  
    event.preventDefault(); if (!newCategoryName.trim()) { setCreateCategoryError("Category name cannot be empty."); return; }
    setIsCreatingCategory(true); setCreateCategoryError(null); 
    try { 
      const newCat = await createCategory({ name: newCategoryName }); 
      setCategories(prev => [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name))); 
      setShowCreateModal(false); 
      setNewCategoryName(""); 
    }
    catch (err: unknown) { setCreateCategoryError(err instanceof Error ? err.message : "An unknown error occurred."); }
    finally { setIsCreatingCategory(false); }
  };
  
  const handleOpenRenameModal = (category: Category) => { setCategoryToRename(category); setRenamedCategoryName(category.name); setRenameError(null); setShowRenameModal(true);};
  
  const handleRenameCategory = async (event: FormEvent<HTMLFormElement>) => { 
    event.preventDefault(); if (!categoryToRename || !renamedCategoryName.trim()) { setRenameError("Category name cannot be empty."); return; }
    setIsRenaming(true); setRenameError(null);
    try { 
      const updatedCategory = await updateCategoryName(categoryToRename.id, { name: renamedCategoryName }); 
      setCategories(prev => prev.map(cat => cat.id === updatedCategory.id ? updatedCategory : cat).sort((a, b) => a.name.localeCompare(b.name))); 
      setShowRenameModal(false); 
      setCategoryToRename(null); 
    }
    catch (err: unknown) { setRenameError(err instanceof Error ? err.message : "An unknown error occurred."); }
    finally { setIsRenaming(false); }
  };

  const handleOpenDeleteModal = (category: Category) => { setCategoryToDelete(category); setDeleteError(null); setShowDeleteModal(true);};
  
  const handleConfirmDeleteCategory = async () => {  
    if (!categoryToDelete) return; 
    setIsDeleting(true); setDeleteError(null);
    try { 
      await deleteCategory(categoryToDelete.id); 
      setCategories(prev => prev.filter(cat => cat.id !== categoryToDelete.id)); 
      setShowDeleteModal(false); 
      setCategoryToDelete(null); 
    }
    catch (err: unknown) { setDeleteError(err instanceof Error ? err.message : "An unknown error occurred."); }
    finally { setIsDeleting(false); }
  };

  const handleChangePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setChangePasswordError("New passwords do not match.");
      return;
    }
    if (!allNewPasswordRequirementsMet) {
      setChangePasswordError("New password does not meet all requirements. Please check the criteria.");
      setIsNewPasswordFocused(true); 
      return;
    }
    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(newPassword) ) {
        setChangePasswordError("Password must be at least 8 characters and include uppercase, lowercase, number, and special character.");
        return;
    }
    setIsChangingPassword(true);
    setChangePasswordError(null);
    setChangePasswordSuccess(null);
    const payload: UserPasswordChangePayload = { current_password: currentPassword, new_password: newPassword, confirm_new_password: confirmNewPassword };
    try {
      await changePassword(payload); 
      setChangePasswordSuccess("Password changed successfully!");
      setCurrentPassword(""); setNewPassword(""); setConfirmNewPassword("");
      setTimeout(() => setChangePasswordSuccess(null), 3000);
    } catch (err: unknown) {
      setChangePasswordError(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Helper component for Profile Info Item
  const ProfileInfoItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | number | null | undefined | React.ReactNode }) => (
    <div className="flex items-start space-x-3 py-3 border-b border-slate-200/60 dark:border-slate-700/40 last:border-b-0">
      <Icon className="w-5 h-5 text-orange-500 dark:text-orange-400 flex-shrink-0 mt-0.5" />
      <div className="flex-grow">
        <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
        <span className="text-sm text-slate-800 dark:text-slate-100">
          {value !== null && value !== undefined ? value : <span className="italic text-slate-400 dark:text-slate-500">N/A</span>}
        </span>
      </div>
    </div>
  );


  if (!isClient || isLoadingProfile || isLoadingCategories) {
    return (
      <div 
        className="flex min-h-screen flex-col items-center justify-center bg-slate-200 dark:bg-slate-950 transition-colors duration-500" 
        style={{ backgroundImage: 'var(--dot-pattern-url)' }}
      >
        <GlobalStyles />
        <SpinnerIcon className="h-12 w-12 text-orange-500" />
        <p className="text-lg text-slate-600 dark:text-slate-300 mt-4">Loading settings...</p>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-slate-200 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 transition-colors duration-500 text-left"
      style={{ backgroundImage: 'var(--dot-pattern-url)' }}
    >
      <GlobalStyles />
      <div className="mb-6"> 
        <Link href="/dashboard" className="inline-flex items-center text-orange-600 dark:text-orange-400 hover:text-red-600 dark:hover:text-red-500 transition-colors group text-sm font-medium">
          <ChevronLeftIcon className="w-5 h-5 mr-1 transition-transform group-hover:-translate-x-0.5" />
          Back to Dashboard
        </Link>
      </div>
      
      <h1 className="text-5xl sm:text-5xl font-extrabold tracking-tight text-left pb-4 border-b border-slate-300/70 dark:border-slate-700/70 mb-8">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-red-500 to-red-600">User</span>
          <span className="text-slate-800 dark:text-slate-200"> Settings</span>
      </h1>
      
      <div className="max-w-4xl mx-auto space-y-6"> 
        {/* Section 1: Profile Details */}
        <section id="profile-details" className="learn-ease-card learn-ease-card-hover p-4 sm:p-6 text-left animate-card-enter settings-card-1">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <h2 className="text-3xl font-semibold text-slate-800 dark:text-slate-100 mb-3 sm:mb-0">Profile Details</h2> 
            {!isEditingProfile && profile && (
              <button 
                onClick={() => {
                  setIsEditingProfile(true); 
                  setErrorProfile(null); 
                  setUpdateProfileSuccess(null);
                  if (profile) { setEditableProfile({ firstname: profile.firstname, lastname: profile.lastname, age: profile.age, university_name: profile.university_name}); }
                }}
                className="flex items-center px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-medium rounded-lg shadow-md hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-2 ring-offset-2 dark:ring-offset-slate-800 ring-red-500 transition-all self-start sm:self-center"
              >
                <EditIcon /> Edit Profile
              </button>
            )}
          </div>

          {errorProfile && <div className="p-3 text-sm text-red-700 bg-red-100 dark:bg-red-900/60 dark:text-red-300 rounded-md mb-4 border border-red-300 dark:border-red-700 text-left">{errorProfile}</div>}
          {updateProfileSuccess && <div className="p-3 text-sm text-green-700 bg-green-100 dark:bg-green-900/60 dark:text-green-300 rounded-md mb-4 border border-green-300 dark:border-green-700 text-left">{updateProfileSuccess}</div>}

          {!profile && !isLoadingProfile && !errorProfile && <p className="text-slate-500 dark:text-slate-400 text-left">No profile data found.</p>}
          
          {profile && !isEditingProfile && (
            <div className="mt-2">
                <div className="flex flex-col items-center sm:items-start sm:flex-row sm:space-x-6 mb-6">
                    <div className="w-24 h-24 flex-shrink-0 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 text-3xl font-semibold border-2 border-slate-300 dark:border-slate-600 mb-4 sm:mb-0">
                        {profile.firstname?.charAt(0).toUpperCase()}{profile.lastname?.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-center sm:text-left pt-2 sm:pt-0">
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                            {profile.firstname} {profile.lastname}
                        </h3>
                        <p className="text-sm text-orange-600 dark:text-orange-400 flex items-center justify-center sm:justify-start">
                            <EnvelopeIcon className="w-4 h-4 mr-1.5"/> {profile.email}
                        </p>
                    </div>
                </div>
                
                <div className="space-y-1 divide-y divide-slate-200/60 dark:divide-slate-700/40">
                    <ProfileInfoItem icon={CalendarDaysIcon} label="Age" value={profile.age} />
                    <ProfileInfoItem icon={AcademicCapIcon} label="University" value={profile.university_name} />
                    <ProfileInfoItem 
                        icon={profile.verified ? CheckBadgeIcon : XCircleMiniIcon} 
                        label="Verified" 
                        value={
                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full inline-flex items-center ${
                                profile.verified 
                                ? 'bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-300' 
                                : 'bg-red-100 text-red-700 dark:bg-red-700/30 dark:text-red-300'
                            }`}>
                                {profile.verified ? <CheckBadgeIcon className="w-3.5 h-3.5 mr-1 opacity-90"/> : <XCircleMiniIcon className="w-3.5 h-3.5 mr-1 opacity-90"/>}
                                {profile.verified ? 'Verified' : 'Not Verified'}
                            </span>
                        } 
                    />
                </div>
            </div>
          )}

          {isEditingProfile && profile && ( 
            <form onSubmit={handleProfileUpdateSubmit} className="space-y-4 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstname" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">First Name</label>
                  <input type="text" name="firstname" id="firstname" value={editableProfile.firstname || ''} onChange={handleProfileInputChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500" />
                </div>
                <div>
                  <label htmlFor="lastname" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Last Name</label>
                  <input type="text" name="lastname" id="lastname" value={editableProfile.lastname || ''} onChange={handleProfileInputChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500" />
                </div>
                <div>
                  <label htmlFor="age" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Age</label>
                  <input type="number" name="age" id="age" value={editableProfile.age ?? ''} onChange={handleProfileInputChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500" />
                </div>
                <div>
                  <label htmlFor="university_name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">University Name</label>
                  <input type="text" name="university_name" id="university_name" value={editableProfile.university_name || ''} onChange={handleProfileInputChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500" />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-1">
                <button type="button" onClick={() => setIsEditingProfile(false)} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={isUpdatingProfile} className="flex items-center justify-center px-4 py-2 text-sm bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium rounded-lg shadow-md hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-2 ring-offset-2 dark:ring-offset-slate-800 ring-red-500 disabled:opacity-60">
                  {isUpdatingProfile ? <><SpinnerIcon className="h-4 w-4 mr-2"/>Saving...</> : <><SaveIcon /> Save Changes</>}
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Section 2: Manage Categories */}
        <section id="manage-categories" className="learn-ease-card learn-ease-card-hover p-4 sm:p-6 text-left animate-card-enter settings-card-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5">
            <h2 className="text-3xl font-semibold text-slate-800 dark:text-slate-100 mb-3 sm:mb-0">Manage Your Categories</h2>
            <button onClick={handleOpenCreateModal} className="flex items-center px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-medium rounded-lg shadow-md hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-2 ring-offset-2 dark:ring-offset-slate-800 ring-red-500 transition-all self-start sm:self-center"> 
              <PlusIcon /> Add New Category 
            </button>
          </div>
          {errorCategories && !isLoadingCategories && <div className="p-3 text-sm text-red-700 bg-red-100 dark:bg-red-900/60 dark:text-red-300 rounded-md mb-4 border border-red-300 dark:border-red-700">{errorCategories}</div>}
          
          {isLoadingCategories && <div className="text-center py-8"><SpinnerIcon className="h-8 w-8 text-orange-500 mx-auto"/></div>}

          {!isLoadingCategories && categories.length === 0 && !errorCategories && (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <FolderPlusIcon className="w-12 h-12 mx-auto mb-3 text-slate-400 dark:text-slate-500 opacity-70"/>
                <p className="font-semibold">No categories yet.</p>
                <p className="text-sm">Click &quot;Add New Category&quot; to get started.</p>
            </div>
          )}
          {categories.length > 0 && (
            <ul className="space-y-2"> 
              {categories.map(category => (
                <li 
                  key={category.id} 
                  className="group flex justify-between items-center p-3 bg-slate-100/60 dark:bg-slate-700/30 border border-slate-300/80 dark:border-slate-600/60 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-600/40 transition-colors duration-150"
                >
                  <span className="text-slate-800 dark:text-slate-100 font-medium text-sm">{category.name}</span>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
                    <button 
                      onClick={() => handleOpenRenameModal(category)} 
                      title="Rename Category"
                      className="p-2 text-orange-500 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 rounded-md hover:bg-orange-100/80 dark:hover:bg-orange-600/30 transition-colors"
                    >
                      <PencilIcon className="w-4 h-4" />
                      <span className="sr-only">Rename {category.name}</span>
                    </button>
                    <button 
                      onClick={() => handleOpenDeleteModal(category)} 
                      title="Delete Category"
                      className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-md hover:bg-red-100/80 dark:hover:bg-red-600/30 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                      <span className="sr-only">Delete {category.name}</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Section 3: Change Password */}
        <section id="change-password" className="learn-ease-card learn-ease-card-hover p-4 sm:p-6 text-left animate-card-enter settings-card-3">
          <h2 className="text-3xl font-semibold text-slate-800 dark:text-slate-100 mb-5">Change Password</h2>
          {changePasswordError && <div className="p-3 text-sm text-red-700 bg-red-100 dark:bg-red-900/60 dark:text-red-300 rounded-md mb-4 border border-red-300 dark:border-red-700">{changePasswordError}</div>}
          {changePasswordSuccess && <div className="p-3 text-sm text-green-700 bg-green-100 dark:bg-green-900/60 dark:text-green-300 rounded-md mb-4 border border-green-300 dark:border-green-700">{changePasswordSuccess}</div>}
          <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Current Password</label>
              <input type="password" name="currentPassword" id="currentPassword" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500" required />
            </div>
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300">New Password</label>
              <div className="relative mt-1"> 
                <input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required className="block w-full px-4 py-2.5 pr-10 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"  value={newPassword} onChange={(e) => setNewPassword(e.target.value)} onFocus={() => setIsNewPasswordFocused(true)} />
                {newPassword.length > 0 && allNewPasswordRequirementsMet && ( <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-green-500 dark:text-green-400 pointer-events-none"> <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"> <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /> </svg> </span> )}
              </div>
            </div>

            {(isNewPasswordFocused || (newPassword.length > 0 && !allNewPasswordRequirementsMet)) && (
              <div className="mt-2 p-3 bg-slate-100 dark:bg-slate-700/70 rounded-md border border-slate-200 dark:border-slate-600">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">New password must include:</p>
                <ul className="space-y-1">
                  {passwordRequirements.map(req => ( 
                    <li key={req.id} className={`flex items-center text-xs ${newPasswordValidation[req.id as keyof PasswordValidationStatus] ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}> 
                      {newPasswordValidation[req.id as keyof PasswordValidationStatus] ? 
                        <svg className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg> : 
                        <svg className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg> 
                      } 
                      <span>{req.text}</span> 
                    </li> 
                  ))}
                </ul>
              </div>
            )}
            
            <div>
              <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Confirm New Password</label>
              <div className="relative mt-1"> 
                <input id="confirmNewPassword" name="confirmNewPassword" type="password" autoComplete="new-password" required className="mt-1 block w-full px-4 py-2.5 pr-10 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} />
                {confirmNewPassword.length > 0 && newPassword.length > 0 && ( 
                  <span className={`absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none ${newPassword === confirmNewPassword ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}> 
                    {newPassword === confirmNewPassword ? ( 
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"> <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /> </svg> 
                    ) : ( 
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"> <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" /> </svg> 
                    )} 
                  </span> 
                )}
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <button type="submit" disabled={isChangingPassword} className="flex items-center justify-center px-4 py-2 text-sm bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium rounded-lg shadow-md hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-2 ring-offset-2 dark:ring-offset-slate-800 ring-red-500 disabled:opacity-60">
                {isChangingPassword ? <><SpinnerIcon className="h-4 w-4 mr-2"/>Changing...</> : "Change Password"}
              </button>
            </div>
          </form>
        </section>
      </div>

      {/* Modals */}
       <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Category"> 
          <form onSubmit={handleCreateCategory} className="space-y-4">
            <input 
              type="text" 
              value={newCategoryName} 
              onChange={(e) => setNewCategoryName(e.target.value)} 
              placeholder="Category Name" 
              className="block w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500" 
              required 
            />
            {createCategoryError && <p className="text-red-600 dark:text-red-400 text-sm text-left">{createCategoryError}</p>}
            <button 
              type="submit" 
              disabled={isCreatingCategory} 
              className="w-full flex items-center justify-center px-4 py-2 text-sm bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium rounded-lg shadow-md hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-2 ring-offset-2 dark:ring-offset-slate-800 ring-red-500 disabled:opacity-60"
            >
              {isCreatingCategory ? <><SpinnerIcon className="h-4 w-4 mr-2"/>Creating...</> : "Create"}
            </button>
          </form>
        </Modal>

        {categoryToRename && (
          <Modal isOpen={showRenameModal} onClose={() => setShowRenameModal(false)} title={`Rename Category: ${categoryToRename.name}`}>
            <form onSubmit={handleRenameCategory} className="space-y-4">
              <input 
                type="text" 
                value={renamedCategoryName} 
                onChange={(e) => setRenamedCategoryName(e.target.value)} 
                placeholder="New Category Name" 
                className="block w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500" 
                required 
              />
              {renameError && <p className="text-red-600 dark:text-red-400 text-sm text-left">{renameError}</p>}
              <button 
                type="submit" 
                disabled={isRenaming} 
                className="w-full flex items-center justify-center px-4 py-2 text-sm bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium rounded-lg shadow-md hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-2 ring-offset-2 dark:ring-offset-slate-800 ring-red-500 disabled:opacity-60"
              >
                {isRenaming ? <><SpinnerIcon className="h-4 w-4 mr-2"/>Renaming...</> : "Save Changes"}
              </button>
            </form>
          </Modal>
        )}

        {categoryToDelete && (
          <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Confirm Delete Category">
            {deleteError && <p className="text-red-600 dark:text-red-400 text-sm mb-3 text-left">{deleteError}</p>}
            <p className="mb-6 text-slate-600 dark:text-slate-300 text-left">Are you sure you want to delete the category &quot;{categoryToDelete.name}&quot;? Books in this category will become uncategorized.</p>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setShowDeleteModal(false)} 
                disabled={isDeleting} 
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmDeleteCategory} 
                disabled={isDeleting} 
                className="flex items-center justify-center px-4 py-2 text-sm bg-red-600 text-white font-medium rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 ring-offset-2 dark:ring-offset-slate-800 ring-red-500 disabled:opacity-60"
              >
                {isDeleting ? <><SpinnerIcon className="h-4 w-4 mr-2"/>Deleting...</> : "Delete"}
              </button>
            </div>
          </Modal>
        )}

      <footer className="mt-12 pt-6 border-t border-slate-300/70 dark:border-slate-700/70 text-center">
        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center">
          <SettingsAppIcon className="w-4 h-4 mr-1.5" />
          <span className="ml-1">You are on the Settings page.</span>
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          &copy; {new Date().getFullYear()} Learn-Ease. All rights reserved.
        </p>
      </footer>
    </div>
  );
}