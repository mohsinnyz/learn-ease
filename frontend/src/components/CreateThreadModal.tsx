"use client";

import { useState, FormEvent, useEffect, useRef } from 'react';
import { 
  createForumThread, 
  ForumThreadPublic,
  ForumThreadCreate
} from '@/services/forumService';
import { fetchUserBooks, Book } from '@/services/bookService';

// --- Icons ---
const SpinnerIcon = ({className = "h-5 w-5 text-white"} : {className?: string}) => ( <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>);
const XMarkIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" /></svg>);
const BookIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>);
const TagIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.593l6.248-1.562a2.25 2.25 0 001.562-2.25V10.5h-3.75a2.25 2.25 0 01-2.25-2.25V4.5h-4.318a2.25 2.25 0 00-1.591.659z" /></svg>);

// Toolbar Icons
const BoldIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h5c2.21 0 4-1.79 4-4v-1c0-1.47-.85-2.75-2.1-3.43C19.7 11.74 20.5 10.48 20.5 9c0-2.21-1.79-4-4-4h-4.5zm-1 2h3.5c1.1 0 2 .9 2 2s-.9 2-2 2H11V5zm0 8h4c1.1 0 2 .9 2 2s-.9 2-2 2H11v-4z"/></svg>);
const ItalicIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/></svg>);
const ListIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/></svg>);
const CodeIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>);
const LinkIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>);

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
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl transform transition-all duration-300 scale-100 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[80vh] animate-fadeIn">
        {/* Header - Updated with prominent border */}
        <div className="flex justify-between items-center px-8 py-6 border-b-2 border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-900 rounded-t-2xl">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-red-600">
                {title}
            </h2>
            <p className="text-base text-slate-500 mt-1 font-medium">let the community answer you query</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close modal"
          >
            <XMarkIcon />
          </button>
        </div>
        {/* Scrollable Body - SCROLL REMOVED AS REQUESTED */}
        <div className="p-8">
            {children}
        </div>
      </div>
    </div>
  );
};

// --- Main Component ---
interface CreateThreadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onThreadCreated: (newThread: ForumThreadPublic) => void;
}

const CreateThreadModal = ({ isOpen, onClose, onThreadCreated }: CreateThreadModalProps) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [bookId, setBookId] = useState<string | null>(null);
  
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoadingBooks(true);
      fetchUserBooks()
        .then(userBooks => setBooks(userBooks))
        .catch(err => {
          console.error("Failed to fetch books for modal:", err);
          setError("Could not load your books. You can still post a general question.");
        })
        .finally(() => setIsLoadingBooks(false));
    }
  }, [isOpen]);

  // --- Markdown Logic ---
  const insertMarkdown = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = content;
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);

    const newText = before + prefix + selection + suffix + after;
    setContent(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setTags('');
    setBookId(null);
    setError(null);
    setIsSubmitting(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError("Title and content are required.");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);

    const threadData: ForumThreadCreate = {
      title: title.trim(),
      content: content.trim(),
      book_id: bookId || null,
      tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
    };

    try {
      const newThread = await createForumThread(threadData);
      onThreadCreated(newThread); 
      resetForm();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create thread.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { resetForm(); onClose(); }} title="Ask a New Question">
      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* 1. Title Input */}
        <div className="space-y-3">
          <label htmlFor="threadTitle" className="block text-lg font-bold text-slate-800 dark:text-slate-100">
            Question Title
          </label>
          <input 
            id="threadTitle"
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Error in gradient descent logic"
            className="block w-full px-5 py-4 text-lg bg-slate-100 dark:bg-slate-900 border-2 border-transparent rounded-xl focus:bg-white dark:focus:bg-slate-950 focus:border-orange-500 outline-none text-slate-900 dark:text-white placeholder-slate-400 transition-all font-medium"
            required
            minLength={5}
            maxLength={150}
          />
        </div>

        {/* 2. Content Editor */}
        <div className="space-y-3">
          <label htmlFor="threadContent" className="block text-lg font-bold text-slate-800 dark:text-slate-100">
            Details & Context
          </label>
          
          <div className="group relative border-2 border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 focus-within:bg-white dark:focus-within:bg-slate-950 focus-within:border-orange-500 transition-all">
             {/* Editor Toolbar */}
             <div className="flex items-center gap-1 p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-200/50 dark:bg-slate-900/50">
                <button type="button" onClick={() => insertMarkdown('**', '**')} className="p-2 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors" title="Bold"><BoldIcon /></button>
                <button type="button" onClick={() => insertMarkdown('*', '*')} className="p-2 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors" title="Italic"><ItalicIcon /></button>
                <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-2"></div>
                <button type="button" onClick={() => insertMarkdown('- ')} className="p-2 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors" title="List"><ListIcon /></button>
                <button type="button" onClick={() => insertMarkdown('```\n', '\n```')} className="p-2 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors" title="Code Block"><CodeIcon /></button>
                <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-2"></div>
                <button type="button" onClick={() => insertMarkdown('[Link Text](https://', ')')} className="p-2 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors" title="Link"><LinkIcon /></button>
            </div>

            <textarea
              id="threadContent"
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your code or describe the concept you are struggling with..."
              className="block w-full px-5 py-4 bg-transparent border-none focus:ring-0 text-slate-900 dark:text-slate-200 placeholder-slate-400 font-mono text-base resize-y min-h-[200px] leading-relaxed"
              rows={8}
              required
              minLength={10}
            />
             {/* Markdown Hint */}
             <div className="absolute bottom-3 right-4 text-xs font-bold text-slate-400 uppercase tracking-wider opacity-0 group-focus-within:opacity-60 transition-opacity">
              Markdown Supported
            </div>
          </div>
        </div>

        {/* 3. Secondary Inputs (Two Column) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Book Select */}
            <div className="space-y-3">
                <label htmlFor="threadBook" className="block text-lg font-bold text-slate-800 dark:text-slate-100">
                    Link to Book <span className="text-sm font-normal text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded ml-2">Optional</span>
                </label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <BookIcon />
                    </div>
                    <select 
                        id="threadBook"
                        value={bookId || ""}
                        onChange={(e) => setBookId(e.target.value === "" ? null : e.target.value)}
                        disabled={isLoadingBooks}
                        className="block w-full pl-12 pr-10 py-4 bg-slate-100 dark:bg-slate-900 border-2 border-transparent rounded-xl focus:bg-white dark:focus:bg-slate-950 focus:border-orange-500 outline-none text-slate-900 dark:text-white appearance-none transition-all font-medium cursor-pointer"
                    >
                        <option value="">-- General Question --</option>
                        {isLoadingBooks ? (
                        <option disabled>Loading books...</option>
                        ) : (
                        books.map(book => (
                            <option key={book.id} value={book.id}>{book.title}</option>
                        ))
                        )}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                        <svg className="h-5 w-5 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                    </div>
                </div>
            </div>

            {/* Tags Input */}
            <div className="space-y-3">
                <label htmlFor="threadTags" className="block text-lg font-bold text-slate-800 dark:text-slate-100">
                    Tags <span className="text-sm font-normal text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded ml-2">Optional</span>
                </label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <TagIcon />
                    </div>
                    <input 
                        id="threadTags"
                        type="text" 
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        placeholder="math, python, bug"
                        className="block w-full pl-12 pr-4 py-4 bg-slate-100 dark:bg-slate-900 border-2 border-transparent rounded-xl focus:bg-white dark:focus:bg-slate-950 focus:border-orange-500 outline-none text-slate-900 dark:text-white placeholder-slate-400 transition-all font-medium"
                    />
                </div>
            </div>
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
            {isSubmitting ? <SpinnerIcon /> : "Post Question"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateThreadModal;