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
// (Assuming these paths are correct based on your imports)
import {
  ChevronLeftIcon,
  SpinnerIcon,
  BookOpenHeroIcon,
  BeakerIcon,
  ChatBubbleOvalLeftEllipsisIcon,
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
    /* Unified Card Style: Opaque White/Slate */
    .learn-ease-card {
      background-color: #ffffff; 
      border-radius: 0.75rem; /* rounded-xl */
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      border: 1px solid rgba(226, 232, 240, 1);
      transition: box-shadow 0.3s ease-out, transform 0.3s ease-out;
    }
    html.dark .learn-ease-card {
      background-color: rgba(30, 41, 59, 0.95);
      border-color: rgba(51, 65, 85, 0.8);
    }

    /* Polka Dot Pattern */
    :root {
      --dot-pattern-url: url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1.5' cy='1.5' r='1.5' fill='%2394a3b8' fill-opacity='0.4'/%3E%3C/svg%3E");
    }
    html.dark {
      --dot-pattern-url: url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1' cy='1' r='1' fill='%23cbd5e1' fill-opacity='0.1'/%3E%3C/svg%3E");
    }

    /* PDF Canvas Tweaks */
    .react-pdf__Page__canvas {
        margin: 0 auto;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
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

  // --- Handlers ---
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

  const calculatedPageWidth = Math.min(
    typeof window !== "undefined" ? window.innerWidth * 0.92 : 800,
    800
  );
  const pagePlaceholderHeight = calculatedPageWidth * 1.41;

  const pageLoadingIndicator = useMemo(
    () => (
      <div
        style={{ width: calculatedPageWidth, height: pagePlaceholderHeight }}
        className="flex items-center justify-center bg-slate-200/70 dark:bg-slate-700/70 text-slate-500 dark:text-slate-400 rounded-md animate-pulse"
      >
        Loading page...
      </div>
    ),
    [calculatedPageWidth, pagePlaceholderHeight]
  );

  if (isDetailsLoading)
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center bg-slate-200 dark:bg-slate-950 transition-colors duration-500"
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
        className="flex min-h-screen flex-col items-center justify-center bg-slate-200 dark:bg-slate-950 transition-colors duration-500 p-6"
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
      className="min-h-screen bg-slate-200 dark:bg-slate-950 flex flex-col items-center p-3 sm:p-4 lg:p-6"
      onClick={closeContextMenu}
      style={{
        backgroundImage: 'var(--dot-pattern-url)',
      }}
    >
      <GlobalStyles />
      <div className="w-full max-w-full mx-auto flex flex-row gap-6 px-6">
        
        {/* --- COLUMN 1: GLOSSARY, QUIZ, NOTES (Left) --- */}
        <aside className="w-72 min-w-[18rem] max-w-xs h-fit sticky top-6 self-start space-y-6">
          {bookDetails?.status === "processing" ? (
            // Applied 'learn-ease-card'
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
              {/* Glossary Panel - Applied 'learn-ease-card' */}
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
                <div className="max-h-[25vh] overflow-y-auto pr-2">
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

              {/* Quiz Panel - Applied 'learn-ease-card' */}
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

              {/* Study Notes Panel - Note: You may need to ensure this component internally uses 'learn-ease-card' or wrap it here */}
              {/* If StudyNotesPanel is already refactored, this is fine. If not, wrapping it might be needed. */}
              <StudyNotesPanel
                bookId={bookId}
                generatingTopicId={generatingTopicId}
                onGenerate={handleRequestStudyNotesFromTopic}
              />
            </>
          ) : null}
        </aside>

        {/* --- COLUMN 2: BOOK VIEWER (Center) --- */}
        <div className="flex-1 min-w-0">
          <div className="mb-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center text-orange-600 dark:text-orange-400 hover:text-red-600 dark:hover:text-red-500 transition-colors group text-sm font-medium"
            >
              <ChevronLeftIcon className="w-5 h-5 mr-1 transition-transform group-hover:-translate-x-0.5" />
              Back to Dashboard
            </Link>
            <h1
              className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-2 truncate"
              title={bookDetails?.title || "Book Title"} 
            >
              {bookDetails?.title || "Loading..."}
            </h1>
          </div>
          <div
            ref={scrollContainerRef}
            className="rounded-lg shadow-xl overflow-y-auto max-h-[calc(100vh-10rem)] border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50" // Added explicit bg to pdf container
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
                  <div
                    key={`page_wrapper_${index + 1}`}
                    className="flex justify-center py-1.5 my-0.5"
                  >
                    <Page
                      key={`page_${index + 1}`}
                      pageNumber={index + 1}
                      width={calculatedPageWidth}
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

        {/* --- COLUMN 3: QUIZ & AI MENTOR (Right) --- */}
        <aside className="w-96 min-w-[22rem] max-w-sm h-fit sticky top-6 self-start space-y-6">
          {bookDetails?.status === "processing" ? (
            // Applied 'learn-ease-card'
            <div className="learn-ease-card p-4 text-center">
              <SpinnerIcon className="w-8 h-8 text-orange-500 mx-auto mb-3" />
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Preparing AI Mentor...
                <br />
                This will be available shortly.
              </p>
            </div>
          ) : bookDetails?.status === "ready" ? (
            // Note: BookMentorChat will need its internal container to use 'learn-ease-card' if it doesn't already. 
            // Or wrap it here:
            <div className="h-full">
                <BookMentorChat
                    bookId={bookId}
                    ChatIcon={ChatBubbleOvalLeftEllipsisIcon}
                />
            </div>
          ) : null}
        </aside>
      </div>

      {/* --- Overlays (Context Menu and Modals) --- */}
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

      <footer className="w-full max-w-5xl mx-auto mt-8 pt-6 border-t border-slate-300/70 dark:border-slate-700/70 text-center">
        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center">
          <BookOpenHeroIcon className="w-4 h-4 mr-1.5 opacity-70" />
          <span className="ml-1">You are on the Book Viewer page.</span>
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          &copy; {new Date().getFullYear()} Learn-Ease. All rights reserved.
        </p>
      </footer>
    </div>
  );
}