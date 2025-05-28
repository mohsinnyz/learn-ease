"use client";
import { useEffect, useState, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Book, fetchUserBooks, uploadBook, updateBookCategory, deleteBook } from "@/services/bookService";
import { Category, fetchUserCategories, createCategory } from "@/services/categoryService";
import Link from "next/link";

// --- Icons ---
const UploadIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-2"><path d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 101.09 1.03L9.25 4.636v8.614z" /><path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" /></svg> );
const PlusIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1.5"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" /></svg> );
const LogoutIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m-3 0l-3-3m0 0l3-3m-3 3H12" /></svg>);
const SettingsIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.108 1.204.165.399.505.71.93.78l.893.15c.543.09.94.56.94 1.11v1.093c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.142.854.108 1.204l.527.738c.32.447.27.96-.12 1.45l-.773.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.399.165-.71.505-.781.93l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-.96.27-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.399-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.11v-1.094c0 .55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.142-.854-.107-1.204l-.527-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.399-.165.71-.505.78-.93l.15-.893Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
);
const SpinnerIcon = ({className = "h-5 w-5 text-white"} : {className?: string}) => ( <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>);
const EmptyStateBooksIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-slate-400 dark:text-slate-500 opacity-70 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v11.494m0 0a8.485 8.485 0 0011.97 0M12 17.747a8.485 8.485 0 01-11.97 0M12 17.747v-2.024m0 0A8.455 8.455 0 0018 9.723M12 15.723A8.455 8.455 0 016 9.723m6 6V9.723M12 6.253a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5zM12 6.253V3M12 6.253l2.5-1.5M12 3L9.5 1.75M12 3l2.5 1.75M12 3L9.5 4.75" /></svg> );
const NoResultsIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-slate-400 dark:text-slate-500 opacity-70 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h.008v.008h-.008V10.5zm-3 0h.008v.008h-.008V10.5zm-3 0h.008v.008H7.5v-.008z" /></svg> );
const DashboardIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h12A2.25 2.25 0 0020.25 14.25V3M3.75 21h16.5M12 3.75h.008v.008H12V3.75z" /></svg>);
const BookOpenHeroIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
  </svg>
);
const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12.56 0c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

// --- Standardized Dot Patterns ---
const lightModeDotPatternUrl = "url(\"data:image/svg+xml,%3Csvg width='15' height='15' viewBox='0 0 15 15' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='15' height='15' fill='none'/%3E%3Ccircle cx='7.5' cy='7.5' r='0.8' fill='%23A0AEC0' fill-opacity='0.3'/%3E%3C/svg%3E\")";
const darkModeDotPatternUrl = "url(\"data:image/svg+xml,%3Csvg width='15' height='15' viewBox='0 0 15 15' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='15' height='15' fill='none'/%3E%3Ccircle cx='7.5' cy='7.5' r='0.8' fill='%23CBD5E0' fill-opacity='0.15'/%3E%3C/svg%3E\")";

// --- Modal component ---
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

export default function DashboardPage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(true);
  const [errorBooks, setErrorBooks] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadTargetCategoryId, setUploadTargetCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [errorCategories, setErrorCategories] = useState<string | null>(null);
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [createCategoryError, setCreateCategoryError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | 'all' | 'uncategorized'>('all');
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isDeletingBook, setIsDeletingBook] = useState(false);
  const [deleteBookError, setDeleteBookError] = useState<string | null>(null);
  const [deleteBookSuccess, setDeleteBookSuccess] = useState<string | null>(null);

  useEffect(() => { setIsClient(true);const token = localStorage.getItem("authToken");if (!token) {router.push("/login");} else {loadInitialData();}}, [router]);
  const loadInitialData = async () => { setIsLoadingBooks(true);setIsLoadingCategories(true);await Promise.all([loadBooks(), loadCategories()]);};
  const loadBooks = async () => { setErrorBooks(null);try {const d = await fetchUserBooks(); setBooks(d.sort((a,b)=>new Date(b.upload_date).getTime()-new Date(a.upload_date).getTime()));} catch(e){setErrorBooks(e instanceof Error?e.message:"Err loading books");setBooks([]);}finally{setIsLoadingBooks(false);}};
  const loadCategories = async () => { setErrorCategories(null);try {const d = await fetchUserCategories(); setCategories(d.sort((a,b)=>a.name.localeCompare(b.name)));} catch(e){setErrorCategories(e instanceof Error?e.message:"Err loading categories");setCategories([]);}finally{setIsLoadingCategories(false);}};
  const handleLogout = () => { if (isClient) localStorage.removeItem("authToken");router.push("/login");};
  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => { if(event.target.files&&event.target.files[0]){setSelectedFile(event.target.files[0]);setUploadError(null);setUploadSuccess(null);}else{setSelectedFile(null);}};
  const handleUploadSubmit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault();if(!selectedFile){setUploadError("Please select a PDF file to upload.");return;}if(selectedFile.type!=="application/pdf"){setUploadError("Invalid file type. Only PDF files are allowed.");return;}setIsUploading(true);setUploadError(null);setUploadSuccess(null);try{const nB=await uploadBook(selectedFile,selectedFile.name,uploadTargetCategoryId);setBooks(pB=>[nB,...pB].sort((a,b)=>new Date(b.upload_date).getTime()-new Date(a.upload_date).getTime()));setUploadSuccess(`"${nB.title||selectedFile.name}" uploaded successfully!`);setSelectedFile(null);if(document.getElementById("bookFile"))(document.getElementById("bookFile")as HTMLInputElement).value="";setUploadTargetCategoryId(null);setTimeout(()=>{setShowUploadModal(false);setUploadSuccess(null);},2500);}catch(e){setUploadError(e instanceof Error?e.message:"Failed to upload book.");}finally{setIsUploading(false);}};
  const handleCreateCategorySubmit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault();if(!newCategoryName.trim()){setCreateCategoryError("Category name cannot be empty.");return;}setIsCreatingCategory(true);setCreateCategoryError(null);try{const nC=await createCategory({name:newCategoryName});setCategories(p=>[...p,nC].sort((a,b)=>a.name.localeCompare(b.name)));setNewCategoryName("");setShowCreateCategoryModal(false);}catch(e){setCreateCategoryError(e instanceof Error?e.message:"Failed to create category.");}finally{setIsCreatingCategory(false);}};
  const handleBookCategoryChange = async (bookId: string, newCategoryId: string | null) => { try{const uB=await updateBookCategory(bookId,newCategoryId);setBooks(pB=>pB.map(b=>b.id===bookId?{...b,category_id:uB.category_id}:b));}catch(e){alert(`Error updating category: ${e instanceof Error?e.message:"Unknown error"}`);}};
  const getCategoryNameById = (categoryId: string | null | undefined): string => { if(!categoryId)return"Uncategorized";const c=categories.find(cat=>cat.id===categoryId);return c?c.name:"Unknown Category";};
  const handleAttemptDeleteBook = (bookId: string, bookTitle: string) => { setBookToDelete({id:bookId,title:bookTitle});setDeleteBookError(null);setDeleteBookSuccess(null);setShowDeleteConfirmModal(true);};
  const handleConfirmDeleteBook = async () => { if(!bookToDelete)return;setIsDeletingBook(true);setDeleteBookError(null);setDeleteBookSuccess(null);try{await deleteBook(bookToDelete.id);setBooks(pB=>pB.filter(b=>b.id!==bookToDelete.id));setDeleteBookSuccess(`Book "${bookToDelete.title}" deleted successfully.`);setShowDeleteConfirmModal(false);setBookToDelete(null);setTimeout(()=>setDeleteBookSuccess(null),3000);}catch(e){setDeleteBookError(e instanceof Error?e.message:"Failed to delete book.");}finally{setIsDeletingBook(false);}};

    const GlobalStyles = () => (
      <style jsx global>{`
        :root { 
          --dot-pattern-url: ${lightModeDotPatternUrl}; 
          --input-bg-light: rgba(255, 255, 255, 0.7); 
          --input-text-light: #0f172a; 
          --input-placeholder-light: #94a3b8; 
          --input-caret-light: #0f172a;
          --input-bg-dark: rgba(51, 65, 85, 0.8); 
          --input-text-dark: #ffffff; 
          --input-placeholder-dark: #64748b; 
          --input-caret-dark: #ffffff;
        }
        html.dark { --dot-pattern-url: ${darkModeDotPatternUrl}; }

      .learn-ease-card {
        background-color: rgba(255, 255, 255, 0.85); /* Light mode default */
        backdrop-filter: blur(6px); 
        border-radius: 0.75rem; 
        box-shadow: 0 10px 15px -3px rgba(0,0,0,0.07), 0 4px 6px -2px rgba(0,0,0,0.05);
        transition: box-shadow 0.3s ease-out, transform 0.3s ease-out;
        border-width: 1px;
        border-color: rgba(203, 213, 225, 0.5); /* Light mode border slate-300/50 */
      }
      html.dark .learn-ease-card { /* <--- FOCUS ON THIS RULE */
        background-color: rgba(30, 41, 59, 0.85); /* Dark mode: slate-800 with 85% opacity */
        border-color: rgba(51, 65, 85, 0.8); /* Dark mode border: slate-700 with 80% opacity */
      }
      .learn-ease-card-hover:hover {
        box-shadow: 0 6px 20px -3px rgba(249, 115, 22, 0.35), /* Orange part */
                    0 4px 30px 0px rgba(239, 68, 68, 0.25);  /* Red part */
        transform: translateY(-2px);
      }
      input, select { background-clip: padding-box !important; }
      input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus, input:-webkit-autofill:active,
      select:-webkit-autofill, select:-webkit-autofill:hover, select:-webkit-autofill:focus, select:-webkit-autofill:active {
        -webkit-box-shadow: 0 0 0 1000px var(--input-bg-light) inset !important; -webkit-text-fill-color: var(--input-text-light) !important; caret-color: var(--input-caret-light) !important;
      }
      html.dark input:-webkit-autofill, html.dark input:-webkit-autofill:hover, html.dark input:-webkit-autofill:focus, html.dark input:-webkit-autofill:active,
      html.dark select:-webkit-autofill, html.dark select:-webkit-autofill:hover, html.dark select:-webkit-autofill:focus, html.dark select:-webkit-autofill:active {
        -webkit-box-shadow: 0 0 0 1000px var(--input-bg-dark) inset !important; -webkit-text-fill-color: var(--input-text-dark) !important; caret-color: var(--input-caret-dark) !important;
      }
    `}</style>
  );

  if (!isClient || isLoadingBooks || isLoadingCategories) { 
    return (
      <div 
        className="flex min-h-screen flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 transition-colors duration-500" 
        style={{ backgroundImage: `var(--dot-pattern-url, ${lightModeDotPatternUrl})` }}
      >
        <GlobalStyles /> 
        <div className="flex flex-col items-center">
            <SpinnerIcon className="h-12 w-12 text-orange-500" />
            <p className="text-lg text-slate-600 dark:text-slate-300 mt-4">Loading Dashboard...</p>
        </div>
      </div>
    );
  }
  
  const filteredBooks = books.filter(book => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'uncategorized') return !book.category_id;
    return book.category_id === activeFilter;
  });

  return (
    <div 
      className="min-h-screen text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8 bg-slate-100 dark:bg-slate-900 transition-colors duration-500" 
      style={{ backgroundImage: `var(--dot-pattern-url, ${lightModeDotPatternUrl})` }}
    >
      <GlobalStyles />

      <header className="pb-6 border-b border-slate-300/70 dark:border-slate-700/70 flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6"> {/* Reduced mb-10 to mb-6 */}
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 sm:mb-0 whitespace-nowrap text-left self-start sm:self-auto"> 
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-red-500 to-red-600">
            Learn-Ease
          </span>
          <span className="text-slate-700 dark:text-slate-300"> Dashboard</span>
        </h1>
        <nav className="flex items-center space-x-3 mt-4 sm:mt-0 self-start sm:self-center">
          <button 
            onClick={() => { setShowUploadModal(true); setUploadError(null); setUploadSuccess(null); setSelectedFile(null); setUploadTargetCategoryId(null); if (document.getElementById("bookFile")) (document.getElementById("bookFile") as HTMLInputElement).value = ""; }} 
            className="flex items-center px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg shadow-lg hover:shadow-xl hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-2 ring-offset-2 dark:ring-offset-slate-900 ring-red-500 transition-all duration-150 ease-in-out text-sm font-medium transform hover:scale-105 active:scale-95"
          >
            <UploadIcon /> Upload Book
          </button>
          <button 
            onClick={() => { setShowCreateCategoryModal(true); setCreateCategoryError(null); setNewCategoryName(""); }} 
            className="flex items-center px-4 py-2.5 bg-indigo-600 text-white rounded-lg shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 ring-offset-2 dark:ring-offset-slate-900 ring-indigo-500 transition-all duration-150 ease-in-out text-sm font-medium transform hover:scale-105 active:scale-95"
          >
            <PlusIcon /> New Category
          </button>
          <button 
            onClick={handleLogout} 
            className="flex items-center px-4 py-2.5 bg-slate-600 text-white rounded-lg shadow-md hover:bg-slate-700 focus:outline-none focus:ring-2 ring-offset-2 dark:ring-offset-slate-900 ring-slate-500 transition-all duration-150 ease-in-out text-sm font-medium transform hover:scale-105 active:scale-95"
          >
            <LogoutIcon/> Logout
          </button>
          <Link 
            href="/settings" 
            title="Settings" 
            className="p-2.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 focus:outline-none focus:ring-2 ring-offset-2 dark:ring-offset-slate-900 ring-slate-400 transition-all duration-150 ease-in-out transform hover:scale-110 active:scale-95"
          >
            <SettingsIcon />
          </Link>
        </nav>
      </header>

      <main className="space-y-8">
        {(!isLoadingCategories || categories.length > 0 || activeFilter !== 'all') && ( 
          <section className="learn-ease-card learn-ease-card-hover p-6"> {/* Filter card already pulled up by header mb change */}
            <h3 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-5">Filter by Category</h3> {/* Increased text size and bottom margin */}
            <div className="flex flex-wrap gap-3 items-center">
              {/* Increased padding, font size, and added text-left to filter buttons */}
              <button onClick={() => setActiveFilter('all')} className={`text-left px-6 py-2.5 text-base rounded-full font-medium transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 ring-offset-2 dark:ring-offset-slate-800 ${ activeFilter === 'all' ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md ring-orange-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 ring-slate-300 dark:ring-slate-600' }`}>All Books</button>
              <button onClick={() => setActiveFilter('uncategorized')} className={`text-left px-6 py-2.5 text-base rounded-full font-medium transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 ring-offset-2 dark:ring-offset-slate-800 ${ activeFilter === 'uncategorized' ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md ring-orange-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 ring-slate-300 dark:ring-slate-600' }`}>Uncategorized</button>
              {categories.map(cat => ( <button key={cat.id} onClick={() => setActiveFilter(cat.id)} className={`text-left px-6 py-2.5 text-base rounded-full font-medium transition-all duration-200 ease-in-out transform hover:scale-105 truncate max-w-[200px] sm:max-w-[240px] focus:outline-none focus:ring-2 ring-offset-2 dark:ring-offset-slate-800 ${ activeFilter === cat.id ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md ring-orange-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 ring-slate-300 dark:ring-slate-600' }`} title={cat.name}>{cat.name}</button>))}
            </div>
          </section>
        )}
        
        {errorCategories && !isLoadingCategories && ( <div className="my-4 p-4 text-sm text-red-700 bg-red-100 dark:bg-red-900/50 dark:text-red-300 rounded-lg border border-red-300 dark:border-red-700"><strong>Category Error:</strong> {errorCategories}</div> )}

        <section className="learn-ease-card learn-ease-card-hover p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <h2 className="text-3xl font-semibold text-slate-800 dark:text-slate-100 mb-2 sm:mb-0"> 
              {activeFilter === 'all' ? 'All Your Books' : activeFilter === 'uncategorized' ? 'Uncategorized Books' : <><span className="text-slate-500 dark:text-slate-400">Books in: </span><span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">{getCategoryNameById(activeFilter)}</span></>}
            </h2>
            <span className="text-sm text-slate-500 dark:text-slate-400 self-end sm:self-center bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full">{filteredBooks.length} book(s)</span>
          </div>
          {deleteBookSuccess && <div className="mb-4 p-3 text-sm text-green-600 bg-green-100 dark:bg-green-900/50 dark:text-green-300 rounded-lg border border-green-300 dark:border-green-700">{deleteBookSuccess}</div>}

          {isLoadingBooks && ( <div className="text-center py-16"><SpinnerIcon className="h-10 w-10 text-orange-500 mx-auto" /> <p className="mt-3 text-slate-500 dark:text-slate-400">Loading your books...</p></div> )}
          {!isLoadingBooks && errorBooks && ( <div className="text-center py-10 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-4 rounded-lg"><strong>Error loading books:</strong> {errorBooks}</div> )}
          {!isLoadingBooks && !errorBooks && books.length === 0 && ( <div className="text-center py-16 text-slate-500 dark:text-slate-400"><EmptyStateBooksIcon /><p className="mb-2 text-xl font-semibold">No books uploaded yet.</p><p className="text-sm">Click the &quot;Upload Book&quot; button to add your first textbook!</p></div> )}
          {!isLoadingBooks && !errorBooks && books.length > 0 && (
            <>
              {filteredBooks.length === 0 ? (
                <div className="text-center py-16 text-slate-500 dark:text-slate-400"><NoResultsIcon /><p className="mb-2 text-xl font-semibold">No books found in &quot;{activeFilter === 'uncategorized' ? 'Uncategorized' : activeFilter === 'all' ? 'All Books' : getCategoryNameById(activeFilter)}&quot;.</p></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredBooks.map((book) => (
                    <div key={book.id} className="learn-ease-card learn-ease-card-hover flex flex-col overflow-hidden group">
                      {/* Enhanced Book Card Top Section */}
                      <div className="p-5 flex-grow flex items-start space-x-4">
                        <div className="flex-shrink-0 mt-1">
                          <BookOpenHeroIcon className="w-10 h-10 text-orange-500 dark:text-orange-400 opacity-80 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="flex-grow min-w-0"> {/* min-w-0 for proper truncation */}
                          <h3 className="text-lg font-semibold text-orange-600 dark:text-orange-400 mb-1 truncate group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors" title={book.title}>
                            {book.title}
                          </h3>
                          {book.filename && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 truncate" title={book.filename}>
                              {book.filename}
                            </p>
                          )}
                          <p className="text-xs text-slate-600 dark:text-slate-300 mb-0">
                            Category:
                            <span className="ml-1.5 inline-block font-medium bg-orange-100 dark:bg-orange-900/60 text-orange-700 dark:text-orange-300 px-2.5 py-1 rounded-full">
                              {getCategoryNameById(book.category_id)}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Action Footer */}
                      <div className="p-4 bg-slate-100/70 dark:bg-slate-700/70 border-t border-slate-200/80 dark:border-slate-600/80 flex flex-col space-y-2.5">
                        <select 
                          value={book.category_id || ""} 
                          onChange={(e) => handleBookCategoryChange(book.id, e.target.value === "" ? null : e.target.value)} 
                          className="w-full text-xs p-2.5 border border-slate-300 dark:border-slate-600 rounded-md bg-white/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-shadow appearance-none"
                        > 
                          <option value="">Uncategorized</option> 
                          {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))} 
                        </select>
                        <div className="flex items-center space-x-2">
                            <Link href={`/books/${book.id}`} className="flex-grow text-center text-sm px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-md hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-2 ring-offset-2 dark:ring-offset-slate-800 ring-red-500 transition-all duration-150 ease-in-out font-medium transform hover:scale-105 active:scale-95">
                                View Book
                            </Link>
                            <button 
                                onClick={() => handleAttemptDeleteBook(book.id, book.title)} 
                                title="Delete Book"
                                className="p-2.5 bg-red-100/50 dark:bg-red-800/30 text-red-600 dark:text-red-400 rounded-md hover:bg-red-200/70 dark:hover:bg-red-700/50 hover:text-red-700 dark:hover:text-red-300 focus:outline-none focus:ring-2 ring-offset-2 dark:ring-offset-slate-800 ring-red-500 transition-all duration-150 ease-in-out transform hover:scale-105 active:scale-95"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {/* Modals */}
      <Modal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} title="Upload Your Textbook"> 
        <form onSubmit={handleUploadSubmit} className="space-y-5">
          <div><label htmlFor="bookFile" className="sr-only">Select PDF file:</label><input id="bookFile" type="file" accept=".pdf" onChange={handleFileSelect} className="block w-full text-sm text-slate-900 dark:text-slate-200 bg-slate-100 dark:bg-slate-700/80 rounded-lg border border-slate-300 dark:border-slate-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 file:mr-4 file:py-2.5 file:px-5 file:rounded-l-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-100 dark:file:bg-slate-600 file:text-orange-700 dark:file:text-orange-300 hover:file:bg-orange-200 dark:hover:file:bg-slate-500" />{selectedFile && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)</p>}</div>
          <div><label htmlFor="uploadCategorySelect" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Assign to Category (Optional):</label><select id="uploadCategorySelect" value={uploadTargetCategoryId || ""} onChange={(e) => setUploadTargetCategoryId(e.target.value === "" ? null : e.target.value)} className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-md bg-white/70 dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 text-sm"><option value="">Uncategorized</option>{categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}</select></div>
          {uploadError && <p className="p-3 text-sm text-red-700 bg-red-100 dark:bg-red-900/50 dark:text-red-300 rounded-md border border-red-300 dark:border-red-700">{uploadError}</p>}
          {uploadSuccess && <p className="p-3 text-sm text-green-600 bg-green-100 dark:bg-green-900/50 dark:text-green-300 rounded-md border border-green-300 dark:border-green-700">{uploadSuccess}</p>}
          <button type="submit" disabled={isUploading || !selectedFile} className="w-full px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium rounded-lg shadow-md hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-2 ring-offset-2 dark:ring-offset-slate-800 ring-red-500 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center">{isUploading ? <SpinnerIcon/> : "Start Upload"}</button>
        </form> 
      </Modal>
      <Modal isOpen={showCreateCategoryModal} onClose={() => setShowCreateCategoryModal(false)} title="Create New Category"> 
        <form onSubmit={handleCreateCategorySubmit} className="space-y-4">
          <div><label htmlFor="newCategoryName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Category Name:</label><input id="newCategoryName" type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="mt-1 block w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white/70 dark:bg-slate-700/80 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500" required /></div>
          {createCategoryError && <p className="text-sm text-red-600 dark:text-red-400">{createCategoryError}</p>}
          <button type="submit" disabled={isCreatingCategory} className="w-full px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium rounded-lg shadow-md hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-2 ring-offset-2 dark:ring-offset-slate-800 ring-red-500 disabled:opacity-50 flex items-center justify-center">{isCreatingCategory ? <SpinnerIcon/> : "Create Category"}</button>
        </form> 
      </Modal>
      <Modal isOpen={showDeleteConfirmModal} onClose={() => { setShowDeleteConfirmModal(false); setBookToDelete(null); setDeleteBookError(null); }} title="Confirm Book Deletion"> 
        {deleteBookError && ( <p className="p-3 text-sm text-red-700 bg-red-100 dark:bg-red-900/50 dark:text-red-300 rounded-md mb-4">Error: {deleteBookError}</p> )} 
        <p className="text-slate-700 dark:text-slate-300 mb-6">Are you sure you want to delete the book &quot;{bookToDelete?.title || 'this book'}&quot;? This action cannot be undone.</p> 
        <div className="flex justify-end space-x-3"> 
          <button onClick={() => { setShowDeleteConfirmModal(false); setBookToDelete(null); setDeleteBookError(null); }} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-600 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 focus:outline-none focus:ring-2 ring-slate-400 transition-colors">Cancel</button> 
          <button onClick={handleConfirmDeleteBook} disabled={isDeletingBook} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 ring-red-500 disabled:opacity-50 flex items-center justify-center">{isDeletingBook ? <SpinnerIcon/> : "Confirm Delete"}</button> 
        </div> 
      </Modal>

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t border-slate-200/80 dark:border-slate-700/80 text-center">
        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center">
          <DashboardIcon /> 
          <span className="ml-1">You are on the Dashboard page.</span>
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          &copy; {new Date().getFullYear()} Learn-Ease. All rights reserved.
        </p>
      </footer>
    </div>
  );
}