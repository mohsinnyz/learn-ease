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
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

// Updated import to include study notes related service and types
import {
  Book,
  fetchBookDetails,
  fetchBookPdfAsBlob,
  summarizeTextService,
  SummarizeResponse,
  generateFlashcardsService,
  FlashcardsApiResponse,
  Flashcard,
  generateStudyNotesService, // New
  StudyNotesApiResponse,    // New
} from "@/services/bookService";

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

if (typeof window !== "undefined") {
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
  const [pdfFileUrl, setPdfFileUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    selectedTextContent: "",
  });

  // State for Summarization
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summarizeError, setSummarizeError] = useState<string | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  // State for Flashcard Generation
  const [flashcards, setFlashcards] = useState<Flashcard[] | null>(null);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [flashcardsError, setFlashcardsError] = useState<string | null>(null);
  const [showFlashcardsModal, setShowFlashcardsModal] = useState(false);

  // --- New State for Study Notes Generation ---
  const [studyNotes, setStudyNotes] = useState<string | null>(null);
  const [isGeneratingStudyNotes, setIsGeneratingStudyNotes] = useState(false);
  const [studyNotesError, setStudyNotesError] = useState<string | null>(null);
  const [showStudyNotesModal, setShowStudyNotesModal] = useState(false);
  // --- End New State ---

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("authToken")) {
      router.push("/login?message=Please log in to view books");
      return;
    }

    if (bookId) {
      setIsLoading(true);
      setError(null);
      setNumPages(null);

      const loadBookData = async () => {
        try {
          const details = await fetchBookDetails(bookId);
          setBookDetails(details);
          const blob = await fetchBookPdfAsBlob(bookId);
          const objectUrl = URL.createObjectURL(blob);
          setPdfFileUrl(objectUrl);
        } catch (err: unknown) {
          const errorMessage =
            err instanceof Error ? err.message : "An unknown error occurred.";
          setError(`Failed to load book data: ${errorMessage}`);
          setPdfFileUrl(null);
        } finally {
          setIsLoading(false);
        }
      };
      loadBookData();
    }

    return () => {
      if (pdfFileUrl) {
        URL.revokeObjectURL(pdfFileUrl);
      }
    };
  }, [bookId, router]);

  const handleRequestSummary = async (textToSummarize: string) => {
    if (!textToSummarize) {
      console.warn("No text selected to summarize.");
      setSummarizeError("No text selected to summarize.");
      setShowSummaryModal(true);
      return;
    }
    setIsSummarizing(true);
    setSummarizeError(null);
    setSummary(null);
    setShowSummaryModal(true);
    try {
      const result: SummarizeResponse = await summarizeTextService(textToSummarize);
      setSummary(result.summary);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to get summary.";
      setSummarizeError(msg);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleRequestFlashcards = async (textToGenerateFrom: string) => {
    if (!textToGenerateFrom) {
      console.warn("No text selected to generate flashcards from.");
      setFlashcardsError("No text selected to generate flashcards from.");
      setShowFlashcardsModal(true);
      return;
    }
    setIsGeneratingFlashcards(true);
    setFlashcardsError(null);
    setFlashcards(null);
    setShowFlashcardsModal(true);
    try {
      const result: FlashcardsApiResponse = await generateFlashcardsService(textToGenerateFrom);
      setFlashcards(result.flashcards);
      if (!result.flashcards || result.flashcards.length === 0) {
        setFlashcardsError("No flashcards could be generated from the selected text.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate flashcards.";
      setFlashcardsError(msg);
    } finally {
      setIsGeneratingFlashcards(false);
    }
  };

  // --- New Handler for Study Notes Generation ---
  const handleRequestStudyNotes = async (textToGenerateFrom: string) => {
    if (!textToGenerateFrom) {
      console.warn("No text selected to generate study notes from.");
      setStudyNotesError("No text selected to generate study notes from.");
      setShowStudyNotesModal(true); // Open modal to show the error
      return;
    }
    setIsGeneratingStudyNotes(true);
    setStudyNotesError(null);
    setStudyNotes(null);
    setShowStudyNotesModal(true);
    try {
      const result: StudyNotesApiResponse = await generateStudyNotesService(textToGenerateFrom);
      setStudyNotes(result.study_notes);
      if (!result.study_notes) { // Check if the notes string is empty
        setStudyNotesError("The AI could not generate study notes from the selected text.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate study notes.";
      setStudyNotesError(msg);
    } finally {
      setIsGeneratingStudyNotes(false);
    }
  };
  // --- End New Handler ---


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
      setContextMenu((prev) => ({ ...prev, visible: false }));
    }
  };

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, []);

  useEffect(() => {
    const handleClickToClose = () => closeContextMenu();
    const handleEscToClose = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeContextMenu();
    };
    document.addEventListener("click", handleClickToClose);
    document.addEventListener("keydown", handleEscToClose);
    return () => {
      document.removeEventListener("click", handleClickToClose);
      document.removeEventListener("keydown", handleEscToClose);
    };
  }, [closeContextMenu]);

  function onDocumentLoadSuccess({ numPages: nextNumPages }: { numPages: number }) {
    setNumPages(nextNumPages);
  }

  if (isLoading) return <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50 dark:bg-gray-900"><p className="text-lg text-gray-700 dark:text-gray-300">Loading book...</p></div>;
  if (error) return <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50 dark:bg-gray-900"><p className="text-lg text-red-500 dark:text-red-400 mb-4">Error: {error}</p><Link href="/dashboard" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Back to Dashboard</Link></div>;
  if (!bookDetails || !pdfFileUrl) return <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50 dark:bg-gray-900"><p className="text-lg text-gray-700 dark:text-gray-300">Book data could not be loaded or PDF is unavailable.</p><Link href="/dashboard" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Back to Dashboard</Link></div>;

  const calculatedPageWidth = Math.min(typeof window !== "undefined" ? window.innerWidth * 0.9 : 780, 780);
  const pagePlaceholderHeight = calculatedPageWidth * 1.41;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col items-center p-4 sm:p-6" onClick={closeContextMenu}>
      <header className="w-full max-w-5xl mb-6">
        <div className="flex justify-start mb-2">
          <Link href="/dashboard" className="text-indigo-600 dark:text-indigo-400 hover:underline">
            &larr; Back to Dashboard
          </Link>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white truncate" title={bookDetails.title}>{bookDetails.title}</h1>
      </header>

      <div className="w-full max-w-4xl bg-white dark:bg-gray-800 shadow-2xl rounded-lg overflow-y-auto max-h-[80vh]" onContextMenu={handleContextMenuAction} onClick={(e) => e.stopPropagation()}>
        <Document file={pdfFileUrl} onLoadSuccess={onDocumentLoadSuccess} onLoadError={(pdfError) => { console.error("PDF Load Error object:", pdfError); setError(`Failed to load PDF: ${pdfError.message || "Unknown PDF loading error"}`); }} loading={<div className="text-center p-10 text-gray-700 dark:text-gray-300">Loading PDF document...</div>} error={<div className="text-center p-10 text-red-500 dark:text-red-400">Error loading PDF. Please try again or check the file.</div>}>
          {numPages && Array.from(new Array(numPages), (el, index) => (
            <div key={`page_wrapper_${index + 1}`} className="flex justify-center py-3">
              <Page key={`page_${index + 1}`} pageNumber={index + 1} width={calculatedPageWidth} renderTextLayer={true} renderAnnotationLayer={true} className="shadow-lg" loading={<div style={{ width: calculatedPageWidth, height: pagePlaceholderHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e0e0e0', color: '#333', borderRadius: '4px' }} className="shadow-md">Loading page {index + 1} of {numPages}...</div>} />
            </div>
          ))}
        </Document>
      </div>

      {/* Custom Context Menu */}
      {contextMenu.visible && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x, position: 'fixed' }}
          className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-xl py-1 z-[100]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              handleRequestSummary(contextMenu.selectedTextContent);
              closeContextMenu();
            }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-indigo-500 hover:text-white dark:hover:bg-indigo-600"
          >
            Summarize: &quot;{contextMenu.selectedTextContent.substring(0, 25)}
            {contextMenu.selectedTextContent.length > 25 ? "..." : ""}&quot;
          </button>
          <button
            onClick={() => {
              handleRequestFlashcards(contextMenu.selectedTextContent);
              closeContextMenu();
            }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-indigo-500 hover:text-white dark:hover:bg-indigo-600"
          >
            Generate Flashcards: &quot;{contextMenu.selectedTextContent.substring(0, 20)}
            {contextMenu.selectedTextContent.length > 20 ? "..." : ""}&quot;
          </button>
          {/* --- New Context Menu Option for Study Notes --- */}
          <button
            onClick={() => {
              handleRequestStudyNotes(contextMenu.selectedTextContent);
              closeContextMenu();
            }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-indigo-500 hover:text-white dark:hover:bg-indigo-600"
          >
            Generate Study Notes: &quot;{contextMenu.selectedTextContent.substring(0, 18)}
            {contextMenu.selectedTextContent.length > 18 ? "..." : ""}&quot;
          </button>
          {/* --- End New Context Menu Option --- */}
        </div>
      )}

      {/* Modal for Displaying Summary */}
      <Modal
        isOpen={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        title={summarizeError ? "Summarization Error" : isSummarizing ? "Generating Summary..." : summary ? "Generated Summary" : "Summary"}
      >
        {isSummarizing && <div className="text-center py-4"><p>Please wait, processing...</p></div>}
        {summarizeError && <p className="text-red-500 p-2">{summarizeError}</p>}
        {summary && !isSummarizing && <div className="max-h-96 overflow-y-auto p-1"><p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{summary}</p></div>}
        {!isSummarizing && !summary && !summarizeError && <p className="text-gray-500 dark:text-gray-400">No summary details to display.</p>}
      </Modal>

      {/* Modal for Displaying Flashcards */}
      <Modal
        isOpen={showFlashcardsModal}
        onClose={() => setShowFlashcardsModal(false)}
        title={flashcardsError ? "Flashcard Error" : isGeneratingFlashcards ? "Generating Flashcards..." : (flashcards && flashcards.length > 0) ? "Generated Flashcards" : "Flashcards"}
      >
        {isGeneratingFlashcards && (<div className="text-center py-4"><p className="text-gray-700 dark:text-gray-300">Please wait, AI is creating flashcards...</p></div>)}
        {flashcardsError && (<p className="text-red-500 p-2">{flashcardsError}</p>)}
        {!isGeneratingFlashcards && flashcards && flashcards.length > 0 && (
          <div className="max-h-[60vh] overflow-y-auto p-1 space-y-3">
            {flashcards.map((card, index) => (
              <div key={index} className="p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 shadow">
                <p className="font-semibold text-indigo-600 dark:text-indigo-400">Front:</p>
                <p className="text-gray-800 dark:text-gray-200 mb-1 pl-2">{card.front}</p>
                <p className="font-semibold text-indigo-600 dark:text-indigo-400">Back:</p>
                <p className="text-gray-800 dark:text-gray-200 pl-2">{card.back}</p>
              </div>
            ))}
          </div>
        )}
        {!isGeneratingFlashcards && !flashcardsError && (!flashcards || flashcards.length === 0) && (<p className="text-gray-500 dark:text-gray-400 p-2">No flashcards to display.</p>)}
      </Modal>

      {/* --- New Modal for Displaying Study Notes --- */}
      <Modal
        isOpen={showStudyNotesModal}
        onClose={() => setShowStudyNotesModal(false)}
        title={
          studyNotesError
            ? "Study Notes Generation Error"
            : isGeneratingStudyNotes
            ? "Generating Study Notes..."
            : studyNotes
            ? "Generated Study Notes"
            : "Study Notes"
        }
      >
        {isGeneratingStudyNotes && (
          <div className="text-center py-4">
            <p className="text-gray-700 dark:text-gray-300">Please wait, AI is creating study notes...</p>
            {/* Consider adding a spinner component here */}
          </div>
        )}
        {studyNotesError && (
          <p className="text-red-500 p-2">{studyNotesError}</p>
        )}
        {!isGeneratingStudyNotes && studyNotes && (
          <div className="max-h-[70vh] overflow-y-auto p-1"> {/* Increased max height for notes */}
            <pre className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans text-sm"> {/* Using <pre> for better formatting of structured notes */}
              {studyNotes}
            </pre>
          </div>
        )}
        {!isGeneratingStudyNotes && !studyNotesError && !studyNotes && (
           <p className="text-gray-500 dark:text-gray-400 p-2">
            No study notes to display.
          </p>
        )}
      </Modal>
      {/* --- End New Modal --- */}

    </div>
  );
}