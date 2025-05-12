// frontend/src/app/books/[bookId]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'; // Recommended for annotations/text selection
import 'react-pdf/dist/esm/Page/TextLayer.css'; // Required for text selection

import { Book, fetchBookDetails, fetchBookPdfAsBlob } from '@/services/bookService';

// Configure PDF.js worker (do this once, e.g., in a root layout or here)
// Make sure to copy 'pdf.worker.min.js' to your public folder
// e.g., public/js/pdf.worker.min.js
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `/js/pdf.worker.min.mjs`;
}


export default function BookViewPage() {
  const router = useRouter();
  const params = useParams();
  const bookId = params.bookId as string;

  const [bookDetails, setBookDetails] = useState<Book | null>(null);
  const [pdfFileUrl, setPdfFileUrl] = useState<string | null>(null); // Object URL for the PDF blob
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  // const [extractedText, setExtractedText] = useState<BookTextContent | null>(null); // If you want to display it separately

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('authToken')) {
        router.push('/login?message=Please log in to view books');
        return;
    }

    if (bookId) {
      setIsLoading(true);
      setError(null);
      
      const loadBookData = async () => {
        try {
          const details = await fetchBookDetails(bookId);
          setBookDetails(details);

          const blob = await fetchBookPdfAsBlob(bookId);
          const objectUrl = URL.createObjectURL(blob);
          setPdfFileUrl(objectUrl);

          // Optionally fetch extracted text if needed for display or other purposes
          // const textContent = await fetchBookExtractedText(bookId);
          // setExtractedText(textContent);

        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
          setError(`Failed to load book: ${errorMessage}`);
          setPdfFileUrl(null); // Clear PDF URL on error
        } finally {
          setIsLoading(false);
        }
      };
      loadBookData();
    }

    // Cleanup object URL when component unmounts or pdfFileUrl changes
    return () => {
      if (pdfFileUrl) {
        URL.revokeObjectURL(pdfFileUrl);
      }
    };
  }, [bookId, router]); // Removed pdfFileUrl from dependency array to avoid re-fetch loops on its change

  function onDocumentLoadSuccess({ numPages: nextNumPages }: { numPages: number }) {
    setNumPages(nextNumPages);
    setCurrentPage(1); // Reset to first page on new document load
  }

  function handleTextSelection() {
    const selection = window.getSelection()?.toString() || '';
    if (selection.trim()) {
      setSelectedText(selection.trim());
      console.log("Selected Text:", selection.trim()); // For debugging
      // Here you can enable a "Summarize" button or perform other actions
    }
  }

  const goToPrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, numPages || 1));

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50 dark:bg-gray-900">
        <p className="text-lg text-gray-700 dark:text-gray-300">Loading book...</p>
        {/* Add a spinner or loading animation here */}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50 dark:bg-gray-900">
        <p className="text-lg text-red-500 dark:text-red-400 mb-4">Error: {error}</p>
        <Link href="/dashboard" legacyBehavior>
          <a className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
            Back to Dashboard
          </a>
        </Link>
      </div>
    );
  }

  if (!bookDetails || !pdfFileUrl) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50 dark:bg-gray-900">
        <p className="text-lg text-gray-700 dark:text-gray-300">Book data not found.</p>
         <Link href="/dashboard" legacyBehavior>
          <a className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
            Back to Dashboard
          </a>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-800 flex flex-col items-center p-4 sm:p-6">
      <header className="w-full max-w-5xl mb-6 flex justify-between items-center">
        <div>
            <Link href="/dashboard" legacyBehavior>
                <a className="text-indigo-600 dark:text-indigo-400 hover:underline">&larr; Back to Dashboard</a>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-2 truncate" title={bookDetails.title}>
                {bookDetails.title}
            </h1>
        </div>
        {/* Placeholder for future action buttons like Summarize Selection */}
        {selectedText && (
            <button 
                onClick={() => alert(`Selected: ${selectedText}`)} // Replace with actual summarize call
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
            >
                Process Selection
            </button>
        )}
      </header>

      <div 
        className="w-full max-w-4xl bg-white dark:bg-gray-700 shadow-2xl rounded-lg overflow-hidden"
        onMouseUp={handleTextSelection} // Capture text selection on mouse up within this container
        onTouchEnd={handleTextSelection} // For touch devices
      >
        <Document
          file={pdfFileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={(err) => setError(`Failed to load PDF: ${err.message}`)}
          className="flex justify-center"
          loading={<div className="p-10">Loading PDF document...</div>}
          error={<div className="p-10 text-red-500">Error loading PDF.</div>}
        >
          <Page 
            pageNumber={currentPage} 
            width={Math.min(window.innerWidth * 0.9, 800)} // Responsive width
            renderTextLayer={true} // Essential for text selection
            renderAnnotationLayer={true} // Optional, but good for accessibility/links
          />
        </Document>
      </div>

      {numPages && (
        <div className="mt-6 mb-4 flex items-center justify-center space-x-4 p-2 bg-gray-200 dark:bg-gray-700 rounded-md shadow">
          <button
            onClick={goToPrevPage}
            disabled={currentPage <= 1}
            className="px-4 py-2 bg-indigo-500 text-white rounded disabled:opacity-50 hover:bg-indigo-600"
          >
            Prev
          </button>
          <p className="text-gray-800 dark:text-gray-200">
            Page {currentPage} of {numPages}
          </p>
          <button
            onClick={goToNextPage}
            disabled={currentPage >= numPages}
            className="px-4 py-2 bg-indigo-500 text-white rounded disabled:opacity-50 hover:bg-indigo-600"
          >
            Next
          </button>
        </div>
      )}
      
      {/* {extractedText && (
        <div className="mt-8 p-4 bg-gray-200 dark:bg-gray-700 rounded max-w-4xl w-full">
          <h3 className="text-xl font-semibold mb-2">Extracted Text (for debugging/reference)</h3>
          <pre className="whitespace-pre-wrap text-sm">{extractedText.content.substring(0, 500)}...</pre>
        </div>
      )} */}
    </div>
  );
}