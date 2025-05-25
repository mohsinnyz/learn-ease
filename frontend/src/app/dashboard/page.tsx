// frontend/src/app/dashboard/page.tsx
"use client";
import { useEffect, useState, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Book, fetchUserBooks, uploadBook, updateBookCategory, deleteBook } from "@/services/bookService";
import { Category, fetchUserCategories, createCategory } from "@/services/categoryService";
import Link from "next/link";
import Image from "next/image"; // Import Next.js Image component

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
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-modalShow">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white text-2xl leading-none"
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>
        {children}
      </div>
      <style jsx global>{`
        @keyframes modalShow { to { transform: scale(1); opacity: 1; } }
        .animate-modalShow { animation: modalShow 0.3s forwards; }
      `}</style>
    </div>
  );
};
// --- End Modal ---

export default function DashboardPage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  // Book State
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(true);
  const [errorBooks, setErrorBooks] = useState<string | null>(null);

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadTargetCategoryId, setUploadTargetCategoryId] = useState<string | null>(null);

  // Category State
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [errorCategories, setErrorCategories] = useState<string | null>(null);
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [createCategoryError, setCreateCategoryError] = useState<string | null>(null);

  // Filter State
  const [activeFilter, setActiveFilter] = useState<string | 'all' | 'uncategorized'>('all');

  // Delete Book Confirmation State
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isDeletingBook, setIsDeletingBook] = useState(false);
  const [deleteBookError, setDeleteBookError] = useState<string | null>(null);
  const [deleteBookSuccess, setDeleteBookSuccess] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
    const token = localStorage.getItem("authToken");
    if (!token) {
      router.push("/login");
    } else {
      loadInitialData();
    }
  }, [router]);

  const loadInitialData = async () => {
    setIsLoadingBooks(true);
    setIsLoadingCategories(true);
    await Promise.all([loadBooks(), loadCategories()]);
  };

  const loadBooks = async () => {
    setErrorBooks(null);
    try {
      const userBooks = await fetchUserBooks();
      setBooks(userBooks.sort((a,b) => new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime()));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setErrorBooks(`Failed to load books: ${errorMessage}`);
      setBooks([]);
    } finally {
      setIsLoadingBooks(false);
    }
  };

  const loadCategories = async () => {
    setErrorCategories(null);
    try {
      const userCategories = await fetchUserCategories();
      setCategories(userCategories.sort((a,b) => a.name.localeCompare(b.name)));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setErrorCategories(`Failed to load categories: ${errorMessage}`);
      setCategories([]);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const handleLogout = () => {
    if (isClient) localStorage.removeItem("authToken");
    router.push("/login");
  };

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setUploadError(null);
      setUploadSuccess(null);
    } else {
      setSelectedFile(null);
    }
  };

  const handleUploadSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) {
      setUploadError("Please select a PDF file to upload.");
      return;
    }
    if (selectedFile.type !== "application/pdf") {
      setUploadError("Invalid file type. Please upload a PDF.");
      return;
    }
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    try {
      const newBook = await uploadBook(selectedFile, selectedFile.name, uploadTargetCategoryId);
      setBooks((prevBooks) => [newBook, ...prevBooks].sort((a,b) => new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime()));
      setUploadSuccess(`"${newBook.title || selectedFile.name}" uploaded successfully!`);
      setSelectedFile(null);
      if (document.getElementById("bookFile")) (document.getElementById("bookFile") as HTMLInputElement).value = "";
      setUploadTargetCategoryId(null);
      setTimeout(() => { setShowUploadModal(false); setUploadSuccess(null); }, 2500);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setUploadError(`Upload failed: ${errorMessage}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateCategorySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newCategoryName.trim()) {
      setCreateCategoryError("Category name cannot be empty.");
      return;
    }
    setIsCreatingCategory(true);
    setCreateCategoryError(null);
    try {
      const newCat = await createCategory({ name: newCategoryName });
      setCategories((prev) => [...prev, newCat].sort((a,b) => a.name.localeCompare(b.name)));
      setNewCategoryName("");
      setShowCreateCategoryModal(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create category.";
      setCreateCategoryError(msg);
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleBookCategoryChange = async (bookId: string, newCategoryId: string | null) => {
    try {
      const updatedBook = await updateBookCategory(bookId, newCategoryId);
      setBooks(prevBooks => 
        prevBooks.map(b => b.id === bookId ? { ...b, category_id: updatedBook.category_id } : b)
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update book category.";
      console.error("Error updating book category:", msg);
      alert(`Error updating category: ${msg}`);
    }
  };
  
  const getCategoryNameById = (categoryId: string | null | undefined): string => {
    if (!categoryId) return "Uncategorized";
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : "Unknown Category";
  };

  const handleAttemptDeleteBook = (bookId: string, bookTitle: string) => {
    setBookToDelete({ id: bookId, title: bookTitle });
    setDeleteBookError(null);
    setDeleteBookSuccess(null);
    setShowDeleteConfirmModal(true);
  };

  const handleConfirmDeleteBook = async () => {
    if (!bookToDelete) return;
    setIsDeletingBook(true);
    setDeleteBookError(null);
    setDeleteBookSuccess(null);
    try {
      await deleteBook(bookToDelete.id);
      setBooks(prevBooks => prevBooks.filter(b => b.id !== bookToDelete.id));
      setDeleteBookSuccess(`Book "${bookToDelete.title}" deleted successfully.`);
      setShowDeleteConfirmModal(false);
      setBookToDelete(null);
      setTimeout(() => setDeleteBookSuccess(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete book.";
      setDeleteBookError(msg);
    } finally {
      setIsDeletingBook(false);
    }
  };

  if (!isClient) { 
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
          <p className="text-lg text-gray-700 dark:text-gray-300">Initializing Dashboard...</p>
        </div>
      );
  }
  
  const filteredBooks = books.filter(book => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'uncategorized') return !book.category_id;
    return book.category_id === activeFilter;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-4 sm:p-6 lg:p-8">
      <header className="mb-8 pb-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-4 sm:mb-0">
          Learn-Ease Dashboard
        </h1>
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button onClick={() => { setShowUploadModal(true); setUploadError(null); setUploadSuccess(null); setSelectedFile(null); setUploadTargetCategoryId(null); if (document.getElementById("bookFile")) (document.getElementById("bookFile") as HTMLInputElement).value = ""; }} className="px-4 py-2 bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium">Upload Book</button>
          <button onClick={() => { setShowCreateCategoryModal(true); setCreateCategoryError(null); setNewCategoryName(""); }} className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium">New Category</button>
          <button onClick={handleLogout} className="px-4 py-2 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm font-medium">Logout</button>
          
          {/* --- Settings Icon/Link --- */}
          <Link 
            href="/settings" 
            title="Settings" 
            className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            {/* Using Next.js Image component for optimized SVG handling */}
            <Image 
              src="/settings.svg" // Assumes settings.svg is in frontend/public directory
              alt="Settings" 
              width={24} // Set appropriate width
              height={24} // Set appropriate height
              className="text-gray-600 dark:text-gray-300" // Tailwind classes might not directly color external SVGs unless they use `currentColor`
            />
          </Link>
          {/* --- End Settings Icon/Link --- */}
        </div>
      </header>

      <main>
        {isLoadingCategories && ( <div className="text-center py-4 text-gray-500 dark:text-gray-400">Loading categories...</div> )}
        {errorCategories && !isLoadingCategories && ( <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded-md dark:bg-red-900 dark:text-red-300"><strong>Category Error:</strong> {errorCategories}</div> )}
        
        {!isLoadingCategories && !errorCategories && (categories.length > 0 || activeFilter !== 'all') && (
          <section className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-3">Filter by Category:</h3>
            <div className="flex flex-wrap gap-2 items-center">
              <button onClick={() => setActiveFilter('all')} className={`px-4 py-1.5 text-sm rounded-full transition-colors ${ activeFilter === 'all' ? 'bg-indigo-600 text-white font-semibold shadow-md' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600' }`}>All Books</button>
              <button onClick={() => setActiveFilter('uncategorized')} className={`px-4 py-1.5 text-sm rounded-full transition-colors ${ activeFilter === 'uncategorized' ? 'bg-indigo-600 text-white font-semibold shadow-md' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600' }`}>Uncategorized</button>
              {categories.map(cat => ( <button key={cat.id} onClick={() => setActiveFilter(cat.id)} className={`px-4 py-1.5 text-sm rounded-full transition-colors truncate max-w-[150px] sm:max-w-xs ${ activeFilter === cat.id ? 'bg-indigo-600 text-white font-semibold shadow-md' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600' }`} title={cat.name}>{cat.name}</button>))}
            </div>
          </section>
        )}

        <section className="bg-white dark:bg-gray-800 shadow-xl rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-200"> {activeFilter === 'all' ? 'All Your Books' : activeFilter === 'uncategorized' ? 'Uncategorized Books' : `Books in "${getCategoryNameById(activeFilter)}"`}</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">{filteredBooks.length} book(s)</span>
          </div>
          {deleteBookSuccess && <div className="mb-4 p-3 text-sm text-green-700 bg-green-100 rounded-md dark:bg-green-900 dark:text-green-300">{deleteBookSuccess}</div>}

          {isLoadingBooks && ( <div className="text-center py-10 text-gray-500 dark:text-gray-400">Loading your books...</div> )}
          {!isLoadingBooks && errorBooks && ( <div className="text-center py-10 text-red-500 bg-red-50 dark:bg-red-900 dark:text-red-300 p-4 rounded-md"><strong>Error loading books:</strong> {errorBooks}</div> )}
          {!isLoadingBooks && !errorBooks && books.length === 0 && ( <div className="text-center py-10 text-gray-500 dark:text-gray-400"><p className="mb-2 text-lg">No books uploaded yet.</p><p>Click &quot;Upload Book&quot; to add your first textbook!</p></div> )}
          {!isLoadingBooks && !errorBooks && books.length > 0 && (
            <>
              {filteredBooks.length === 0 ? (
                <div className="text-center py-10 text-gray-500 dark:text-gray-400"><p className="mb-2 text-lg">No books found in &quot;{activeFilter === 'uncategorized' ? 'Uncategorized' : activeFilter === 'all' ? 'All Books' : getCategoryNameById(activeFilter)}&quot;.</p></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredBooks.map((book) => (
                    <div key={book.id} className="p-5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 ease-in-out flex flex-col">
                      <div className="flex-grow">
                        <h3 className="text-xl font-semibold text-indigo-700 dark:text-indigo-400 mb-2 truncate" title={book.title}>{book.title}</h3>
                        {book.filename && <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 truncate" title={book.filename}>Filename: {book.filename}</p>}
                        <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">Category: {getCategoryNameById(book.category_id)}</p>
                      </div>
                      <div className="mt-auto space-y-2">
                        <select value={book.category_id || ""} onChange={(e) => handleBookCategoryChange(book.id, e.target.value === "" ? null : e.target.value)} className="w-full text-xs p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-indigo-500 focus:border-indigo-500">
                          <option value="">Uncategorized</option>
                          {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                        </select>
                        <Link href={`/books/${book.id}`} className="block w-full text-center text-sm px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors">View Book</Link>
                        <button onClick={() => handleAttemptDeleteBook(book.id, book.title)} className="block w-full text-center text-sm px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 transition-colors">Delete Book</button>
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
      <Modal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} title="Upload Your Textbook (PDF)">
        <form onSubmit={handleUploadSubmit} className="space-y-5">
          <div>
            <label htmlFor="bookFile" className="sr-only">Select PDF file:</label>
            <input id="bookFile" type="file" accept=".pdf" onChange={handleFileSelect} className="block w-full text-sm text-gray-900 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 file:mr-4 file:py-2.5 file:px-5 file:rounded-l-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-100 dark:file:bg-gray-600 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-200 dark:hover:file:bg-gray-500" />
            {selectedFile && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)</p>}
          </div>
          <div>
            <label htmlFor="uploadCategorySelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign to Category (Optional):</label>
            <select id="uploadCategorySelect" value={uploadTargetCategoryId || ""} onChange={(e) => setUploadTargetCategoryId(e.target.value === "" ? null : e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 text-sm">
              <option value="">Uncategorized</option>
              {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
            </select>
          </div>
          {uploadError && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900 dark:text-red-300 p-3 rounded-md">{uploadError}</p>}
          {uploadSuccess && <p className="text-sm text-green-600 bg-green-50 dark:bg-green-900 dark:text-green-300 p-3 rounded-md">{uploadSuccess}</p>}
          <button type="submit" disabled={isUploading || !selectedFile} className="w-full px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed">
            {isUploading ? "Uploading..." : "Start Upload"}
          </button>
        </form>
      </Modal>

      <Modal isOpen={showCreateCategoryModal} onClose={() => setShowCreateCategoryModal(false)} title="Create New Category">
        <form onSubmit={handleCreateCategorySubmit} className="space-y-4">
          <div>
            <label htmlFor="newCategoryName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category Name:</label>
            <input id="newCategoryName" type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" required />
          </div>
          {createCategoryError && <p className="text-sm text-red-600">{createCategoryError}</p>}
          <button type="submit" disabled={isCreatingCategory} className="w-full px-4 py-2 bg-blue-500 text-white font-medium rounded-lg shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">
            {isCreatingCategory ? "Creating..." : "Create Category"}
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={showDeleteConfirmModal}
        onClose={() => { setShowDeleteConfirmModal(false); setBookToDelete(null); setDeleteBookError(null); }}
        title="Confirm Book Deletion"
      >
        {deleteBookError && ( <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900 dark:text-red-300 p-3 rounded-md mb-4">Error: {deleteBookError}</p> )}
        <p className="text-gray-700 dark:text-gray-300 mb-6">Are you sure you want to delete the book &quot;{bookToDelete?.title || 'this book'}&quot;? This action cannot be undone.</p>
        <div className="flex justify-end space-x-3">
          <button onClick={() => { setShowDeleteConfirmModal(false); setBookToDelete(null); setDeleteBookError(null); }} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400">Cancel</button>
          <button onClick={handleConfirmDeleteBook} disabled={isDeletingBook} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50">{isDeletingBook ? "Deleting..." : "Confirm Delete"}</button>
        </div>
      </Modal>
    </div>
  );
}