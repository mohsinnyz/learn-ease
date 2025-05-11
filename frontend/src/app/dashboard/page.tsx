// frontend/src/app/dashboard/page.tsx
"use client";
import { useEffect, useState, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
// Import Book from its new location in bookService.ts
import { Book, fetchUserBooks, uploadBook } from "@/services/bookService";

// Simple Modal Component (Consider moving to its own file: src/components/Modal.tsx)
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
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-modalShow">
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
      {/* Add this animation to your globals.css or a style tag for the modal */}
      <style jsx global>{`
        @keyframes modalShow {
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-modalShow {
          animation: modalShow 0.3s forwards;
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

  useEffect(() => {
    setIsClient(true);
    const token = localStorage.getItem("authToken");
    if (!token) {
      router.push("/login");
    } else {
      loadBooks();
    }
  }, [router]);

  const loadBooks = async () => {
    setIsLoadingBooks(true);
    setErrorBooks(null);
    try {
      const userBooks = await fetchUserBooks();
      setBooks(userBooks);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred.";
      setErrorBooks(`Failed to load books: ${errorMessage}`);
      setBooks([]);
    } finally {
      setIsLoadingBooks(false);
    }
  };

  const handleLogout = () => {
    if (isClient) {
      localStorage.removeItem("authToken");
    }
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
      const newBook = await uploadBook(selectedFile);
      setBooks((prevBooks) => [newBook, ...prevBooks]);
      setUploadSuccess(
        `"${newBook.title || selectedFile.name}" uploaded successfully!`
      );
      setSelectedFile(null);
      if (document.getElementById("bookFile")) {
        (document.getElementById("bookFile") as HTMLInputElement).value = "";
      }

      setTimeout(() => {
        setShowUploadModal(false);
        setUploadSuccess(null);
      }, 2500);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred.";
      setUploadError(`Upload failed: ${errorMessage}`);
    } finally {
      setIsUploading(false);
    }
  };

  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <p className="text-lg text-gray-700 dark:text-gray-300">
          Initializing Dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-4 sm:p-6 lg:p-8">
      <header className="mb-8 pb-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-4 sm:mb-0">
          Learn-Ease Dashboard
        </h1>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setShowUploadModal(true);
              setUploadError(null);
              setUploadSuccess(null);
              setSelectedFile(null);
              if (document.getElementById("bookFile")) {
                (
                  document.getElementById("bookFile") as HTMLInputElement
                ).value = "";
              }
            }}
            className="px-5 py-2.5 bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition ease-in-out duration-150 text-sm font-medium"
          >
            Upload New Book
          </button>
          <button
            onClick={handleLogout}
            className="px-5 py-2.5 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition ease-in-out duration-150 text-sm font-medium"
          >
            Logout
          </button>
        </div>
      </header>

      <main>
        <section className="bg-white dark:bg-gray-800 shadow-xl rounded-xl p-6">
          <h2 className="text-2xl font-semibold mb-6 text-gray-700 dark:text-gray-200">
            Your Uploaded Books
          </h2>
          {isLoadingBooks && (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
              Loading your books...
            </div>
          )}
          {!isLoadingBooks && errorBooks && (
            <div className="text-center py-10 text-red-500 bg-red-50 dark:bg-red-900 dark:text-red-300 p-4 rounded-md">
              <strong>Error:</strong> {errorBooks} <br /> Please ensure the
              backend services are running or try again later.
            </div>
          )}
          {!isLoadingBooks && !errorBooks && books.length === 0 && (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
              <p className="mb-2 text-lg">No books uploaded yet.</p>
              <p>
                Click &quot;Upload New Book&quot; to add your first textbook!
              </p>
            </div>
          )}
          {!isLoadingBooks && !errorBooks && books.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {books.map((book) => (
                <div
                  key={book.id}
                  className="p-5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 ease-in-out flex flex-col" // Added flex-col for button alignment
                >
                  <div className="flex-grow">
                    {" "}
                    {/* Added flex-grow for content */}
                    <h3
                      className="text-xl font-semibold text-indigo-700 dark:text-indigo-400 mb-2 truncate"
                      title={book.title}
                    >
                      {book.title}
                    </h3>
                    {book.filename && (
                      <p
                        className="text-xs text-gray-500 dark:text-gray-400 mb-3 truncate"
                        title={book.filename}
                      >
                        Filename: {book.filename}
                      </p>
                    )}
                  </div>
                  <div className="mt-auto pt-3 border-t border-gray-200 dark:border-gray-600">
                    <button className="w-full text-sm px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors">
                      View Details {/* Placeholder for future actions */}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Your Textbook (PDF)"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-5">
          <div>
            <label htmlFor="bookFile" className="sr-only">
              Select PDF file:
            </label>
            <input
              id="bookFile"
              type="file"
              accept=".pdf" // Only accept PDF files
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-900 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 file:mr-4 file:py-2.5 file:px-5 file:rounded-l-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-100 dark:file:bg-gray-600 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-200 dark:hover:file:bg-gray-500"
            />
            {selectedFile && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Selected: {selectedFile.name} (
                {(selectedFile.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>
          {uploadError && (
            <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900 dark:text-red-300 p-3 rounded-md">
              {uploadError}
            </p>
          )}
          {uploadSuccess && (
            <p className="text-sm text-green-600 bg-green-50 dark:bg-green-900 dark:text-green-300 p-3 rounded-md">
              {uploadSuccess}
            </p>
          )}
          <button
            type="submit"
            disabled={isUploading || !selectedFile}
            className="w-full px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-60 disabled:cursor-not-allowed transition ease-in-out duration-150"
          >
            {isUploading ? "Uploading..." : "Start Upload"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
