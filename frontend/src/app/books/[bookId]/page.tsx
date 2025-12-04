// frontend/src/app/books/[bookId]/page.tsx
"use client";

import {
  useEffect,
  useState,
  MouseEvent as ReactMouseEvent,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import useSWR from "swr";

// --- Services ---
import {
  fetchBookDetails,
  fetchBookPdfAsBlob,
  summarizeTextService,
  SummarizeResponse,
  generateFlashcardsService,
  FlashcardsApiResponse,
  Flashcard,
  generateStudyNotesService,
  StudyNotesApiResponse,
  generateQnAService,
  QuestionAnswerPair,
  QnAApiResponse,
  fetchGlossaryForPage,
  generateStudyNotesFromTopic,
} from "@/services/bookService";

// --- Components ---
import { BookMentorChat } from "@/components/BookMentorChat";
import { StudyNotesPanel } from "@/components/StudyNotesPanel";

// --- Icons & Child Components ---
import {
  ChevronLeftIcon,
  SpinnerIcon,
  BookOpenHeroIcon,
  BeakerIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  MinusIcon,
} from "@/components/book/Icons";
import { ContextMenu } from "@/components/book/ContextMenu";
import { SummaryModal } from "@/components/book/SummaryModal";
import { FlashcardsModal } from "@/components/book/FlashcardsModal";
import { StudyNotesModal } from "@/components/book/StudyNotesModal";
import { QnAModal } from "@/components/book/QnAModal";

// --- PDF.js Worker Configuration ---
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `/js/pdf.worker.min.mjs`;
}

// --- Global Styles (Unified Design) ---
const GlobalStyles = () => (
  <style jsx global>{`
    /* Hide Scrollbar but keep functionality */
    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .no-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }

    /* Unified Card Style */
    .learn-ease-card {
      background-color: #ffffff; 
      border-radius: 0.75rem; 
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      border: 1px solid rgba(226, 232, 240, 1);
      transition: box-shadow 0.3s ease-out, transform 0.3s ease-out;
    }
    html.dark .learn-ease-card {
      background-color: rgba(30, 41, 59, 0.95);
      border-color: rgba(51, 65, 85, 0.8);
    }

    /* Polka Dot Pattern */
    :root {
      /* UPDATED: fill-opacity='0.3' */
      --dot-pattern-url: url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1.5' cy='1.5' r='1.5' fill='%2394a3b8' fill-opacity='0.3'/%3E%3C/svg%3E");
    }
    html.dark {
      --dot-pattern-url: url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1' cy='1' r='1' fill='%23cbd5e1' fill-opacity='0.1'/%3E%3C/svg%3E");
    }

    /* PDF Canvas Tweaks - No margin/shadow inside the canvas itself now, controlled by container */
    .react-pdf__Page__canvas {
        margin: 0 auto;
        display: block;
    }
  `}</style>
);

export default function BookViewPage() {
  const router = useRouter();
  const params = useParams();
  const bookId = params.bookId as string;

  // --- PDF & Scroll State ---
  const [numPages, setNumPages] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPageInView, setCurrentPageInView] = useState<number>(1);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // --- Zoom & Search State ---
  const [scale, setScale] = useState<number>(1.0);
  const [searchQuery, setSearchQuery] = useState("");

  // --- Feature States ---
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    selectedTextContent: "",
  });

  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summarizeError, setSummarizeError] = useState<string | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  const [flashcards, setFlashcards] = useState<Flashcard[] | null>(null);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [flashcardsError, setFlashcardsError] = useState<string | null>(null);
  const [showFlashcardsModal, setShowFlashcardsModal] = useState(false);

  const [studyNotes, setStudyNotes] = useState<string | null>(null);
  const [isGeneratingStudyNotes, setIsGeneratingStudyNotes] = useState(false);
  const [studyNotesError, setStudyNotesError] = useState<string | null>(null);
  const [showStudyNotesModal, setShowStudyNotesModal] = useState(false);
  const [generatingTopicId, setGeneratingTopicId] = useState<string | null>(null);

  const [qnaPairs, setQnaPairs] = useState<QuestionAnswerPair[] | null>(null);
  const [isGeneratingQnA, setIsGeneratingQnA] = useState(false);
  const [qnaError, setQnaError] = useState<string | null>(null);
  const [showQnAModal, setShowQnAModal] = useState(false);

  // --- Data Fetching ---
  const {
    data: bookDetails,
    error: bookDetailsError,
    isLoading: isDetailsLoading,
  } = useSWR(bookId, fetchBookDetails, {
    refreshInterval: (latestData) =>
      latestData?.status === "processing" ? 5000 : 0,
  });

  const {
    data: glossaryData,
    error: glossaryError,
    isLoading: isGlossaryLoading,
  } = useSWR(
    bookId && bookDetails?.status === "ready"
      ? [bookId, currentPageInView]
      : null,
    ([id, pageNum]: [string, number]) => fetchGlossaryForPage(id, pageNum)
  );

  const { data: pdfBlob, error: pdfError } = useSWR(
    bookId ? `${bookId}-pdf` : null,
    () => fetchBookPdfAsBlob(bookId),
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  );

  const pdfFileUrl = useMemo(() => {
    if (pdfBlob) return URL.createObjectURL(pdfBlob);
    return null;
  }, [pdfBlob]);

  // --- Intersection Observer (PDF Logic) ---
  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const visiblePages = entries
        .filter((entry) => entry.isIntersecting)
        .map((entry) =>
          parseInt((entry.target as HTMLElement).dataset.pageNumber || "0", 10)
        )
        .filter((pageNum) => pageNum > 0);

      if (visiblePages.length > 0) {
        const newPageNumber = Math.min(...visiblePages);
        setCurrentPageInView((prevPage) =>
          prevPage !== newPageNumber ? newPageNumber : prevPage
        );
      }
    },
    []
  );

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("authToken")) {
      router.push("/login?message=Please log in to view books");
    }
  }, [router]);

  useEffect(() => {
    if (!numPages || !scrollContainerRef.current) return;

    const timer = setTimeout(() => {
      const options = {
        root: scrollContainerRef.current,
        rootMargin: "-50% 0px -50% 0px",
        threshold: 0,
      };
      const observer = new IntersectionObserver(handleIntersect, options);
      observerRef.current = observer;
      pageRefs.current.forEach((el) => observer.observe(el));
    }, 100);

    return () => {
      clearTimeout(timer);
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [numPages, handleIntersect]);

  useEffect(() => {
    return () => {
      if (pdfFileUrl) URL.revokeObjectURL(pdfFileUrl);
    };
  }, [pdfFileUrl]);

  // --- Zoom Handlers ---
  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.1, 2.5));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.1, 0.5));
  
  // Trackpad pinch-to-zoom simulation using Ctrl+Wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        setScale((prev) => Math.min(prev + 0.05, 2.5));
      } else {
        setScale((prev) => Math.max(prev - 0.05, 0.5));
      }
    }
  }, []);

  // --- Action Handlers ---
  const handleRequestSummary = async (textToSummarize: string) => {
    if (!textToSummarize) {
      setSummarizeError("No text selected to summarize.");
      setShowSummaryModal(true);
      return;
    }
    setIsSummarizing(true);
    setSummarizeError(null);
    setSummary(null);
    setShowSummaryModal(true);
    try {
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

  const handleRequestFlashcards = async (textToGenerateFrom: string) => {
    if (!textToGenerateFrom) {
      setFlashcardsError("No text selected to generate flashcards from.");
      setShowFlashcardsModal(true);
      return;
    }
    setIsGeneratingFlashcards(true);
    setFlashcardsError(null);
    setFlashcards(null);
    setShowFlashcardsModal(true);
    try {
      const result: FlashcardsApiResponse = await generateFlashcardsService(
        textToGenerateFrom
      );
      setFlashcards(result.flashcards);
      if (!result.flashcards || result.flashcards.length === 0) {
        setFlashcardsError("No flashcards could be generated from the text.");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to generate flashcards.";
      setFlashcardsError(msg);
    } finally {
      setIsGeneratingFlashcards(false);
    }
  };

  const handleRequestStudyNotes = async (textToGenerateFrom: string) => {
    if (!textToGenerateFrom) {
      setStudyNotesError("No text selected to generate study notes from.");
      setShowStudyNotesModal(true);
      return;
    }
    setIsGeneratingStudyNotes(true);
    setStudyNotesError(null);
    setStudyNotes(null);
    setShowStudyNotesModal(true);
    try {
      const result: StudyNotesApiResponse = await generateStudyNotesService(
        textToGenerateFrom
      );
      setStudyNotes(result.study_notes);
      if (!result.study_notes) {
        setStudyNotesError("The AI could not generate study notes.");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to generate study notes.";
      setStudyNotesError(msg);
    } finally {
      setIsGeneratingStudyNotes(false);
    }
  };

  const handleRequestStudyNotesFromTopic = async (topicId: string) => {
    setGeneratingTopicId(topicId);
    setIsGeneratingStudyNotes(true);
    setStudyNotesError(null);
    setStudyNotes(null);
    setShowStudyNotesModal(true);

    try {
      const result: StudyNotesApiResponse = await generateStudyNotesFromTopic(
        topicId
      );
      setStudyNotes(result.study_notes);
      if (!result.study_notes) {
        setStudyNotesError("The AI could not generate notes from this topic.");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to generate study notes from topic.";
      setStudyNotesError(msg);
    } finally {
      setIsGeneratingStudyNotes(false);
      setGeneratingTopicId(null);
    }
  };

  const handleRequestQnA = async (textToGenerateFrom: string) => {
    if (!textToGenerateFrom) {
      setQnaError("No text selected to generate Q&A from.");
      setShowQnAModal(true);
      return;
    }
    setIsGeneratingQnA(true);
    setQnaError(null);
    setQnaPairs(null);
    setShowQnAModal(true);
    try {
      const result: QnAApiResponse = await generateQnAService(
        textToGenerateFrom
      );
      setQnaPairs(result.qna_pairs);
      if (!result.qna_pairs || result.qna_pairs.length === 0) {
        setQnaError("No Q&A pairs could be generated.");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to generate Q&A pairs.";
      setQnaError(msg);
    } finally {
      setIsGeneratingQnA(false);
    }
  };

  const handleContextMenuAction = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      const currentSelectedText =
        window.getSelection()?.toString().trim() || "";
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
    },
    []
  );

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

  const onDocumentLoadSuccess = useCallback(
    ({ numPages: nextNumPages }: { numPages: number }) => {
      setNumPages(nextNumPages);
    },
    []
  );

  // --- Page Width Calculation ---
  // Reduced base width so initially it is zoomed out (approx 3.5/4 page visibility vertical)
  const calculatedPageWidth = useMemo(() => {
    if (typeof window === "undefined") return 800;
    const sidebarsAndGaps = 750; 
    const availableWidth = window.innerWidth - sidebarsAndGaps;
    // Reduce initial width factor to make it "zoomed out" by default
    return Math.min(Math.max(availableWidth * 0.85, 400), 800);
  }, []);
  
  const pagePlaceholderHeight = calculatedPageWidth * scale * 1.41;

  const pageLoadingIndicator = useMemo(
    () => (
      <div
        style={{ width: calculatedPageWidth * scale, height: pagePlaceholderHeight }}
        className="flex items-center justify-center bg-slate-200/70 dark:bg-slate-700/70 text-slate-500 dark:text-slate-400 rounded-md animate-pulse"
      >
        Loading page...
      </div>
    ),
    [calculatedPageWidth, scale, pagePlaceholderHeight]
  );

  if (isDetailsLoading)
    return (
      <div
        // UPDATED: bg-slate-200/50
        className="flex min-h-screen flex-col items-center justify-center bg-slate-200/50 dark:bg-slate-950 transition-colors duration-500"
        style={{
          backgroundImage: 'var(--dot-pattern-url)',
        }}
      >
        <GlobalStyles />
        <SpinnerIcon className="h-12 w-12 text-orange-500" />
        <p className="text-lg text-slate-600 dark:text-slate-300 mt-4">
          Loading book...
        </p>
      </div>
    );

  if (error || (!bookDetails && !isDetailsLoading) || !pdfFileUrl)
    return (
      <div
        // UPDATED: bg-slate-200/50
        className="flex min-h-screen flex-col items-center justify-center bg-slate-200/50 dark:bg-slate-950 transition-colors duration-500 p-6"
        style={{
          backgroundImage: 'var(--dot-pattern-url)',
        }}
      >
        <GlobalStyles />
        <p className="text-lg text-red-500 dark:text-red-400 mb-6 text-center">
          {error || "Book data could not be loaded or PDF is unavailable."}
        </p>
        <Link
          href="/dashboard"
          className="flex items-center px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-medium rounded-lg shadow-md hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-2 ring-offset-2 dark:ring-offset-slate-900 ring-red-500 transition-all"
        >
          <ChevronLeftIcon className="w-5 h-5 mr-1.5" /> Back to Dashboard
        </Link>
      </div>
    );

  return (
    <div
      // UPDATED: bg-slate-200/50
      className="min-h-screen bg-slate-200/50 dark:bg-slate-950 flex flex-col items-center p-2"
      onClick={closeContextMenu}
      style={{
        backgroundImage: 'var(--dot-pattern-url)',
      }}
    >
      <GlobalStyles />
      
      <div className="w-full max-w-full mx-auto flex flex-row gap-3 px-2">
        
        {/* --- COLUMN 1: LEFT SIDEBAR --- */}
        <aside className="w-72 min-w-[18rem] max-w-xs h-fit sticky top-4 self-start space-y-3">
          {bookDetails?.status === "processing" ? (
            <div className="learn-ease-card p-4 text-center">
              <SpinnerIcon className="w-8 h-8 text-orange-500 mx-auto mb-3" />
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Analyzing book...
                <br />
                AI features will appear here automatically when ready.
              </p>
            </div>
          ) : bookDetails?.status === "ready" ? (
            <>
              {/* Glossary Panel */}
              <div className="learn-ease-card p-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-3 pb-3 border-b border-slate-300 dark:border-slate-700 flex items-center gap-2">
                  <BookOpenHeroIcon className="w-6 h-6 text-orange-500" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
                    Glossary
                  </span>
                  <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-auto">
                    Page {currentPageInView}
                  </span>
                </h3>
                <div className="max-h-[25vh] overflow-y-auto pr-2 no-scrollbar">
                  {isGlossaryLoading && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-sm">
                      <SpinnerIcon className="w-5 h-5 text-orange-500" />
                      Loading...
                    </div>
                  )}
                  {glossaryError && (
                    <p className="text-red-500 dark:text-red-400 text-sm">
                      Error: {glossaryError.message}
                    </p>
                  )}
                  {!isGlossaryLoading &&
                    glossaryData &&
                    glossaryData.length > 0 && (
                      <ul className="space-y-4">
                        {glossaryData.map((entry, idx) => (
                          <li key={idx}>
                            <p className="font-semibold text-slate-700 dark:text-slate-200">
                              {entry.term}
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                              {entry.definition}
                            </p>
                            <p className="text-right text-xs text-slate-400 dark:text-slate-500 mt-1 capitalize">
                              ({entry.source})
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  {!isGlossaryLoading &&
                    !glossaryError &&
                    (!glossaryData || glossaryData.length === 0) && (
                      <p className="text-slate-500 dark:text-slate-400 text-sm">
                        No key terms found on this page.
                      </p>
                    )}
                </div>
              </div>

              {/* Quiz Panel */}
              <div className="learn-ease-card p-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-3 pb-3 border-b border-slate-300 dark:border-slate-700 flex items-center gap-2">
                  <BeakerIcon className="w-6 h-6 text-orange-500" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
                    Test Your Knowledge
                  </span>
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Generate a quiz from the book's content to check your
                  understanding.
                </p>
                <Link
                  href={`/books/${bookId}/quiz`}
                  className="w-full flex items-center justify-center px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-medium rounded-lg shadow-md hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-2 ring-offset-2 dark:ring-offset-slate-900 ring-red-500 transition-all"
                >
                  Start Quiz
                </Link>
              </div>

              <StudyNotesPanel
                bookId={bookId}
                generatingTopicId={generatingTopicId}
                onGenerate={handleRequestStudyNotesFromTopic}
              />
            </>
          ) : null}
        </aside>

        {/* --- COLUMN 2: BOOK VIEWER (Center) --- */}
        <div className="flex-1 min-w-0 flex flex-col h-[calc(100vh-1rem)]">
          
          {/* Header Row: Back Btn, Title, ZOOM Controls, Search */}
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <Link
                href="/dashboard"
                className="inline-flex items-center text-orange-600 dark:text-orange-400 hover:text-red-600 dark:hover:text-red-500 transition-colors group text-sm font-medium whitespace-nowrap"
              >
                <ChevronLeftIcon className="w-5 h-5 mr-1 transition-transform group-hover:-translate-x-0.5" />
                Back to Dashboard
              </Link>
              
              <span className="text-slate-300 dark:text-slate-700 text-xl font-light">|</span>
              
              <h1
                className="text-xl font-bold text-slate-800 dark:text-slate-100 truncate max-w-md"
                title={bookDetails?.title || "Book Title"} 
              >
                {bookDetails?.title || "Loading..."}
              </h1>
            </div>

            {/* CONTROLS: Search & Zoom */}
            <div className="flex items-center gap-2">
               {/* Search Input */}
               <div className="relative group">
                  <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 w-32 focus:w-48 transition-all placeholder-slate-400 text-slate-700 dark:text-slate-200"
                  />
               </div>

               {/* Zoom Buttons */}
               <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md overflow-hidden">
                 <button 
                   onClick={handleZoomOut}
                   className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors border-r border-slate-300 dark:border-slate-700"
                   title="Zoom Out"
                 >
                   <MinusIcon className="w-4 h-4" />
                 </button>
                 <span className="px-2 text-xs text-slate-500 dark:text-slate-400 min-w-[3rem] text-center font-mono">
                   {Math.round(scale * 100)}%
                 </span>
                 <button 
                   onClick={handleZoomIn}
                   className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                   title="Zoom In"
                 >
                   <PlusIcon className="w-4 h-4" />
                 </button>
               </div>
            </div>
          </div>

          {/* PDF Container */}
          <div
            ref={scrollContainerRef}
            onWheel={handleWheel}
            className="flex-1 rounded-lg shadow-xl overflow-y-auto overflow-x-hidden border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 no-scrollbar p-0"
            onContextMenu={handleContextMenuAction}
            onClick={(e) => e.stopPropagation()}
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
              loading={
                <div className="text-center p-10 text-slate-600 dark:text-slate-400">Loading document...</div>
              }
            >
              {Array.from(new Array(numPages || 0), (el, index) => (
                <div
                  key={`page_observer_${index + 1}`}
                  ref={(el) => {
                    if (el) {
                      pageRefs.current.set(index + 1, el);
                    } else {
                      pageRefs.current.delete(index + 1);
                    }
                  }}
                  data-page-number={index + 1}
                >
                  {/* CHANGED: Removed vertical padding completely (py-0) */}
                  <div
                    key={`page_wrapper_${index + 1}`}
                    className="flex justify-center py-0 my-1"
                  >
                    <Page
                      key={`page_${index + 1}`}
                      pageNumber={index + 1}
                      width={calculatedPageWidth}
                      scale={scale}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      className="react-pdf__Page__canvas"
                      loading={pageLoadingIndicator}
                    />
                  </div>
                </div>
              ))}
            </Document>
          </div>
        </div>

        {/* --- COLUMN 3: RIGHT SIDEBAR --- */}
        <aside className="w-96 min-w-[22rem] max-w-sm h-fit sticky top-4 self-start space-y-3">
          {bookDetails?.status === "processing" ? (
            <div className="learn-ease-card p-4 text-center">
              <SpinnerIcon className="w-8 h-8 text-orange-500 mx-auto mb-3" />
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Preparing AI Mentor...
                <br />
                This will be available shortly.
              </p>
            </div>
          ) : bookDetails?.status === "ready" ? (
            <div className="h-full">
                <BookMentorChat
                    bookId={bookId}
                    ChatIcon={ChatBubbleOvalLeftEllipsisIcon}
                />
            </div>
          ) : null}
        </aside>
      </div>

      {/* --- Overlays --- */}
      <ContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        selectedText={contextMenu.selectedTextContent}
        onClose={closeContextMenu}
        onSummarize={() =>
          handleRequestSummary(contextMenu.selectedTextContent)
        }
        onGenerateFlashcards={() =>
          handleRequestFlashcards(contextMenu.selectedTextContent)
        }
        onGenerateStudyNotes={() =>
          handleRequestStudyNotes(contextMenu.selectedTextContent)
        }
        onGenerateQnA={() => handleRequestQnA(contextMenu.selectedTextContent)}
      />

      <SummaryModal
        isOpen={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        isSummarizing={isSummarizing}
        summary={summary}
        error={summarizeError}
      />

      <FlashcardsModal
        isOpen={showFlashcardsModal}
        onClose={() => setShowFlashcardsModal(false)}
        isGenerating={isGeneratingFlashcards}
        flashcards={flashcards}
        error={flashcardsError}
      />

      <StudyNotesModal
        isOpen={showStudyNotesModal}
        onClose={() => setShowStudyNotesModal(false)}
        isGenerating={isGeneratingStudyNotes}
        studyNotes={studyNotes}
        error={studyNotesError}
        bookTitle={bookDetails?.title}
      />

      <QnAModal
        isOpen={showQnAModal}
        onClose={() => setShowQnAModal(false)}
        isGenerating={isGeneratingQnA}
        qnaPairs={qnaPairs}
        error={qnaError}
      />
    </div>
  );
}