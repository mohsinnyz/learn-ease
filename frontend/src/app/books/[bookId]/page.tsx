// learn-ease-fyp/frontend/src/app/books/[bookId]/page.tsx
"use client";

import {
  useEffect,
  useState,
  MouseEvent as ReactMouseEvent,
  useCallback,
} from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css"; // Recommended for annotations/text selection
import "react-pdf/dist/esm/Page/TextLayer.css"; // Required for text selection

// Removed fetchBookExtractedText and BookTextContent from this import
import {
  Book,
  fetchBookDetails,
  fetchBookPdfAsBlob,
  summarizeTextService,
  SummarizeResponse,
} from "@/services/bookService";

// --- Modal component (as defined previously, ensure this is robust or a shared component) ---
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
// --- End Modal ---

// Configure PDF.js worker
if (typeof window !== "undefined") {
  // Ensure this path matches where you copied your pdf.worker.min.mjs (or .js) file
  pdfjs.GlobalWorkerOptions.workerSrc = `/js/pdf.worker.min.mjs`;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  selectedTextContent: string;
}

export default function BookViewPage() {
  const router = useRouter();
  const params = useParams();
  const bookId = params.bookId as string;

  const [bookDetails, setBookDetails] = useState<Book | null>(null);
  const [pdfFileUrl, setPdfFileUrl] = useState<string | null>(null); // Object URL for the PDF blob
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    selectedTextContent: "",
  });

  // State for summarization and summary display modal
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summarizeError, setSummarizeError] = useState<string | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("authToken")) {
      router.push("/login?message=Please log in to view books");
      return; // Important to stop further execution in this effect
    }

    if (bookId) {
      setIsLoading(true);
      setError(null); // Reset error on new load

      const loadBookData = async () => {
        try {
          // Fetch book details (title, etc.)
          const details = await fetchBookDetails(bookId);
          setBookDetails(details);

          // Fetch PDF as Blob and create an object URL
          const blob = await fetchBookPdfAsBlob(bookId);
          const objectUrl = URL.createObjectURL(blob);
          setPdfFileUrl(objectUrl);

          // Full extracted text feature removed as per your request.
          // No call to fetchBookExtractedText here.
        } catch (err: unknown) {
          const errorMessage =
            err instanceof Error ? err.message : "An unknown error occurred.";
          setError(`Failed to load book data: ${errorMessage}`);
          setPdfFileUrl(null); // Clear PDF URL on error
        } finally {
          setIsLoading(false);
        }
      };
      loadBookData();
    }

    // Cleanup object URL when component unmounts or bookId changes (triggering a new pdfFileUrl)
    return () => {
      if (pdfFileUrl) {
        URL.revokeObjectURL(pdfFileUrl);
      }
    };
  }, [bookId, router]); // pdfFileUrl removed from dependency array to prevent re-runs when it's set.

  const handleRequestSummary = async (textToSummarize: string) => {
    if (!textToSummarize) {
      // This alert can be replaced with a more subtle notification if preferred
      alert("No text selected to summarize.");
      return;
    }

    setIsSummarizing(true);
    setSummarizeError(null);
    setSummary(null); // Clear previous summary
    setShowSummaryModal(true); // Open modal to show loading state / then summary or error

    try {
      // Ensure summarizeTextService is correctly imported and used
      const result: SummarizeResponse = await summarizeTextService(
        textToSummarize
      );
      setSummary(result.summary);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to get summary.";
      setSummarizeError(msg);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleContextMenuAction = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const currentSelectedText = window.getSelection()?.toString().trim() || "";

    if (currentSelectedText) {
      setContextMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        selectedTextContent: currentSelectedText,
      });
    } else {
      // If no text is selected when right-clicking, hide the context menu
      setContextMenu((prev) => ({ ...prev, visible: false }));
    }
  };

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, []); // Removed contextMenu from dependency array to avoid potential loops

  useEffect(() => {
    // Add event listener to close context menu on any outside click or escape key
    const handleClickToClose = () => closeContextMenu();
    const handleEscToClose = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeContextMenu();
      }
    };

    document.addEventListener("click", handleClickToClose);
    document.addEventListener("keydown", handleEscToClose);
    return () => {
      document.removeEventListener("click", handleClickToClose);
      document.removeEventListener("keydown", handleEscToClose);
    };
  }, [closeContextMenu]);

  function onDocumentLoadSuccess({
    numPages: nextNumPages,
  }: {
    numPages: number;
  }) {
    setNumPages(nextNumPages);
    setCurrentPage(1); // Reset to first page on new document load
  }

  const goToPrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, numPages || 1));

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50 dark:bg-gray-900">
        <p className="text-lg text-gray-700 dark:text-gray-300">
          Loading book...
        </p>
        {/* You can add a spinner component here for better UX */}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50 dark:bg-gray-900">
        <p className="text-lg text-red-500 dark:text-red-400 mb-4">
          Error: {error}
        </p>
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
        <p className="text-lg text-gray-700 dark:text-gray-300">
          Book data could not be loaded or PDF is unavailable.
        </p>
        <Link href="/dashboard" legacyBehavior>
          <a className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
            Back to Dashboard
          </a>
        </Link>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col items-center p-4 sm:p-6"
      onClick={
        closeContextMenu /* Click anywhere on page to close context menu */
      }
    >
      <header className="w-full max-w-5xl mb-6">
        <div className="flex justify-start mb-2">
          <Link href="/dashboard" legacyBehavior>
            <a className="text-indigo-600 dark:text-indigo-400 hover:underline">
              &larr; Back to Dashboard
            </a>
          </Link>
        </div>
        <h1
          className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white truncate"
          title={bookDetails.title}
        >
          {bookDetails.title}
        </h1>
      </header>

      <div
        className="w-full max-w-4xl bg-white dark:bg-gray-700 shadow-2xl rounded-lg overflow-hidden"
        onContextMenu={handleContextMenuAction} // Attach right-click handler here
      >
        <Document
          file={pdfFileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={(pdfError) => {
            console.error("PDF Load Error object:", pdfError);
            setError(
              `Failed to load PDF: ${
                pdfError.message || "Unknown PDF loading error"
              }`
            );
          }}
          className="flex justify-center" // Centers the Document component if its width is less than container
          loading={
            <div className="text-center p-10 text-gray-700 dark:text-gray-300">
              Loading PDF document...
            </div>
          }
          error={
            <div className="text-center p-10 text-red-500 dark:text-red-400">
              Error loading PDF. Please try again or check the file.
            </div>
          }
        >
          {/* Ensure the Page component is centered if it's narrower than the Document container */}
          <div className="flex justify-center">
            <Page
              pageNumber={currentPage}
              width={Math.min(
                typeof window !== "undefined" ? window.innerWidth * 0.9 : 800,
                800
              )} // Responsive width
              renderTextLayer={true} // Essential for text selection
              renderAnnotationLayer={true} // Good for accessibility & internal PDF links
              className="shadow-lg"
            />
          </div>
        </Document>
      </div>

      {numPages && numPages > 0 && (
        <div className="mt-6 mb-4 flex items-center justify-center space-x-4 p-3 bg-gray-200 dark:bg-gray-700 rounded-lg shadow-md">
          <button
            onClick={goToPrevPage}
            disabled={currentPage <= 1}
            className="px-4 py-2 bg-indigo-500 text-white rounded-md disabled:opacity-50 hover:bg-indigo-600 transition-colors"
          >
            Prev
          </button>
          <p className="text-gray-800 dark:text-gray-200 font-medium">
            Page {currentPage} of {numPages}
          </p>
          <button
            onClick={goToNextPage}
            disabled={currentPage >= numPages}
            className="px-4 py-2 bg-indigo-500 text-white rounded-md disabled:opacity-50 hover:bg-indigo-600 transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* Custom Context Menu */}
      {contextMenu.visible && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="absolute bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-xl py-1 z-50 text-sm"
          onClick={(e) => e.stopPropagation()} // Prevent this click from closing the menu
        >
          <button
            onClick={() => {
              handleRequestSummary(contextMenu.selectedTextContent);
              closeContextMenu(); // Close context menu after action
            }}
            className="block w-full text-left px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-indigo-500 hover:text-white dark:hover:bg-indigo-600"
          >
            Summarize: &quot{contextMenu.selectedTextContent.substring(0, 25)}
            {contextMenu.selectedTextContent.length > 25 ? "..." : ""}&quot
          </button>
          {/* You can add more context menu items here if needed */}
        </div>
      )}

      {/* Modal for Displaying Summary */}
      <Modal
        isOpen={showSummaryModal}
        onClose={() => {
          setShowSummaryModal(false);
          // Optionally clear summary/error when modal is manually closed
          // setSummary(null);
          // setSummarizeError(null);
        }}
        title={
          summarizeError
            ? "Summarization Error"
            : isSummarizing
            ? "Generating Summary..."
            : summary
            ? "Generated Summary"
            : "Summary"
        }
      >
        {isSummarizing && (
          <div className="text-center py-4">
            <p>Please wait, processing...</p>
            {/* Add spinner here */}
          </div>
        )}
        {summarizeError && <p className="text-red-500 p-2">{summarizeError}</p>}
        {summary && !isSummarizing && (
          <div className="max-h-96 overflow-y-auto p-1">
            {" "}
            {/* Scrollable summary area */}
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {summary}
            </p>
          </div>
        )}
        {/* Fallback if modal is open but no specific state is active (should ideally not happen with current logic) */}
        {!isSummarizing && !summary && !summarizeError && (
          <p className="text-gray-500 dark:text-gray-400">
            No summary details to display at the moment.
          </p>
        )}
      </Modal>
    </div>
  );
}
