"use client";

import { useState, FormEvent, useEffect } from 'react';
import { 
  createForumThread, 
  ForumThreadPublic,
  ForumThreadCreate
} from '@/services/forumService';
import { fetchUserBooks, Book } from '@/services/bookService';

// --- (Copied from your dashboard/page.tsx) ---
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

  // Fetch user's books when the modal opens
  useEffect(() => {
    if (isOpen) {
      setIsLoadingBooks(true);
      fetchUserBooks()
        .then(userBooks => {
          setBooks(userBooks);
        })
        .catch(err => {
          console.error("Failed to fetch books for modal:", err);
          setError("Could not load your books. You can still post a general question.");
        })
        .finally(() => {
          setIsLoadingBooks(false);
        });
    }
  }, [isOpen]); // Re-run when modal is opened

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
      onThreadCreated(newThread); // Pass the new thread back to the page
      resetForm();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create thread.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Ask a New Question">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label htmlFor="threadTitle" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Title
          </label>
          <input 
            id="threadTitle"
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What's your question about?"
            className="mt-1 block w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white/70 dark:bg-slate-700/80 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
            required
            minLength={5}
            maxLength={150}
          />
        </div>

        {/* Content */}
        <div>
          <label htmlFor="threadContent" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Content
          </label>
          <textarea
            id="threadContent"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Describe your issue or question in detail..."
            className="mt-1 block w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white/70 dark:bg-slate-700/80 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
            rows={6}
            required
            minLength={10}
          />
        </div>

        {/* Book Select (Optional) */}
        <div>
          <label htmlFor="threadBook" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Link to a Book (Optional)
          </label>
          <select 
            id="threadBook"
            value={bookId || ""}
            onChange={(e) => setBookId(e.target.value === "" ? null : e.target.value)}
            disabled={isLoadingBooks}
            className="mt-1 block w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-md bg-white/70 dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 text-sm"
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
        </div>

        {/* Tags (Optional) */}
        <div>
          <label htmlFor="threadTags" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Tags (Optional)
          </label>
          <input 
            id="threadTags"
            type="text" 
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g., networking, python, chapter-2"
            className="mt-1 block w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white/70 dark:bg-slate-700/80 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Separate tags with a comma.
          </p>
        </div>
        
        {/* Error Message */}
        {error && (
          <p className="p-3 text-sm text-red-700 bg-red-100 dark:bg-red-900/50 dark:text-red-300 rounded-md border border-red-300 dark:border-red-700">
            {error}
          </p>
        )}

        {/* Submit Button */}
        <div className="flex justify-end pt-4">
          <button 
            type="submit" 
            disabled={isSubmitting} 
            className="w-full px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium rounded-lg shadow-md hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-2 ring-offset-2 dark:ring-offset-slate-800 ring-red-500 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSubmitting ? <SpinnerIcon /> : "Post Question"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateThreadModal;