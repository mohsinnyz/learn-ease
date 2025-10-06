//learn-ease-fyp\frontend\src/app/books/[bookId]/page.tsx
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
import ReactMarkdown from 'react-markdown';
import jsPDF from "jspdf";
import useSWR from 'swr'; 


import {
  Book,
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
  GlossaryEntry,
  fetchGlossaryForPage,
} from "@/services/bookService";

// <<< 1. IMPORT THE NEW CHAT COMPONENT >>>
import { BookMentorChat } from "@/components/BookMentorChat";

// --- PDF.js Worker Configuration ---
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `/js/pdf.worker.min.mjs`;
}

// --- Icons ---
const ChevronLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);
const SpinnerIcon = ({className = "h-5 w-5 text-white"} : {className?: string}) => ( <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>);
const DocumentTextIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V17.25zm0 2.25h.008v.008H8.25v-.008zm3.75-6h.008v.008H12v-.008zm0 2.25h.008v.008H12v-.008zm0 2.25h.008v.008H12v-.008zm3.75-6h.008v.008H15.75v-.008zm0 2.25h.008v.008H15.75v-.008zm0 2.25h.008v.008H15.75v-.008zM5.625 3.75H4.75A2.25 2.25 0 002.5 6v12.75c0 1.242.984 2.25 2.25 2.25h10.5A2.25 2.25 0 0017.5 18.75V6.75c0-1.242-.984-2.25-2.25-2.25H13.5m-7.875 0h1.25m-1.25 0a2.25 2.25 0 012.25-2.25h1.5a2.25 2.25 0 012.25 2.25h1.25m-7.5 0h7.5m-7.5 0H5.625M5.625 3.75h.008v.008H5.625V3.75z" />
  </svg>
);
const LayersIcon = (props: React.SVGProps<SVGSVGElement>) => ( 
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.115 5.19l.319 1.913A6 6 0 0012 12h0a6 6 0 005.566-4.897l.319-1.913A2.25 2.25 0 0015.385 3H8.615a2.25 2.25 0 00-2.5 2.19zM12 12v3.75A2.25 2.25 0 019.75 18h-3.375a2.25 2.25 0 01-2.25-2.25V12h10.5zM12 12h3.75a2.25 2.25 0 012.25 2.25V18h-3.375a2.25 2.25 0 01-2.25-2.25V12z" />
  </svg>
);
const LightBulbIcon = (props: React.SVGProps<SVGSVGElement>) => ( 
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.354a15.054 15.054 0 01-4.5 0M12 3v2.25m0 0c-1.406 0-2.731.46-3.75 1.244S6.75 8.219 6.75 9.75V12m10.5-2.25V9.75c0-1.531-.75-2.756-1.75-3.506S13.406 5.25 12 5.25M12 3c2.975 0 5.625 1.244 7.5 3.219" />
    </svg>
);
const BookOpenHeroIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
  </svg>
);
const QuestionMarkCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
    </svg>
);

// --- MODIFICATION: ADDED NEW ICON FOR QUIZ FEATURE ---
const BeakerIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5v-5.714m0 0a24.298 24.298 0 00-4.5 0m4.5 0a24.298 24.298 0 01-4.5 0M9 17.25v2.25a2.25 2.25 0 002.25 2.25h1.5a2.25 2.25 0 002.25-2.25v-2.25M15 17.25h-6M9 17.25H5.625a1.125 1.125 0 01-1.125-1.125v-1.5c0-.517.21-1.01.562-1.375L9 11.25m6 0l3.188-2.812a1.125 1.125 0 011.625 1.375v1.5c0 .621-.504 1.125-1.125 1.125H15m-6 0h6" />
  </svg>
);

// <<< 2. ADD NEW ICON FOR CHAT MENTOR >>>
const ChatBubbleOvalLeftEllipsisIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>);


// --- Standardized Dot Patterns ---
const lightModeDotPatternUrl = "url(\"data:image/svg+xml,%3Csvg width='15' height='15' viewBox='0 0 15 15' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='15' height='15' fill='none'/%3E%3Ccircle cx='7.5' cy='7.5' r='0.8' fill='%23A0AEC0' fill-opacity='0.3'/%3E%3C/svg%3E\")";
const darkModeDotPatternUrl = "url(\"data:image/svg+xml,%3Csvg width='15' height='15' viewBox='0 0 15 15' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='15' height='15' fill='none'/%3E%3Ccircle cx='7.5' cy='7.5' r='0.8' fill='%23CBD5E0' fill-opacity='0.15'/%3E%3C/svg%3E\")";

// --- GlobalStyles Component (Module Level) ---
const GlobalStyles = () => (
  <style jsx global>{`
    :root {
      --dot-pattern-url: ${lightModeDotPatternUrl};
    }
    html.dark {
      --dot-pattern-url: ${darkModeDotPatternUrl};
    }

    .learn-ease-card {
      background-color: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(6px);
      border-radius: 0.75rem;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.07),
        0 4px 6px -2px rgba(0, 0, 0, 0.05);
      transition: box-shadow 0.3s ease-out, transform 0.3s ease-out;
      border-width: 1px;
      border-color: rgba(203, 213, 225, 0.5);
    }

    html.dark .learn-ease-card {
      background-color: rgba(30, 41, 59, 0.85);
      border-color: rgba(51, 65, 85, 0.8);
    }

    @keyframes bookViewModalShowAnimation {
      to {
        transform: scale(1);
        opacity: 1;
      }
    }
    .animate-bookViewModalShow {
      transform: scale(0.95);
      opacity: 0;
      animation: bookViewModalShowAnimation 0.3s forwards;
    }

    .react-pdf__Page__canvas {
      border-radius: 0.375rem;
    }
    .react-pdf__Page__textContent {
      border-radius: 0.375rem;
    }
    /* Flip Animation Styles */
    .flip-container {
      perspective: 1000px;
    }
    .flip-inner {
      position: relative;
      width: 100%;
      height: 100%;
      transition: transform 0.6s;
      transform-style: preserve-3d;
      will-change: transform;
    }
    .flip-inner.flipped {
      transform: rotateY(180deg);
    }
    .flip-front,
    .flip-back {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden; /* Safari */
      border-radius: 0.75rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between; /* Changed to space-between */
      align-items: flex-start; /* Align items to start (top for front, bottom for button) */
      z-index: 1;
    }
    .flip-front {
      z-index: 2; /* Ensure front is on top initially */
    }
    .flip-back {
      transform: rotateY(180deg);
    }
  `}</style>
);

// --- Modal component (Styled for Learn-Ease) ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out">
      <div className="learn-ease-card p-6 sm:p-8 w-full max-w-lg transform transition-all duration-300 ease-in-out">
        <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-300 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-orange-500 dark:text-slate-500 dark:hover:text-orange-400 text-3xl transition-colors rounded-full p-1 leading-none flex items-center justify-center hover:bg-slate-200/70 dark:hover:bg-slate-700/70"
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  selectedTextContent: string;
}

export default function BookViewPage() {
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});
  const markdownRef = useRef<HTMLDivElement>(null); 

  const toggleFlip = (index: number) => {
    setFlippedCards((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };
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
  const [qnaPairs, setQnaPairs] = useState<QuestionAnswerPair[] | null>(null);
  const [isGeneratingQnA, setIsGeneratingQnA] = useState(false);
  const [qnaError, setQnaError] = useState<string | null>(null);
  const [showQnAModal, setShowQnAModal] = useState(false);

  const [currentPageInView, setCurrentPageInView] = useState<number>(1);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { 
    data: glossaryData, 
    error: glossaryError, 
    isLoading: isGlossaryLoading 
  } = useSWR(
    bookId ? [bookId, currentPageInView] : null,
    ([id, pageNum]: [string, number]) => fetchGlossaryForPage(id, pageNum)
  );

  const handleIntersect = useCallback((entries: IntersectionObserverEntry[]) => {
    const visiblePages = entries
      .filter(entry => entry.isIntersecting)
      .map(entry => parseInt((entry.target as HTMLElement).dataset.pageNumber || '0', 10))
      .filter(pageNum => pageNum > 0);

    if (visiblePages.length > 0) {
      const newPageNumber = Math.min(...visiblePages);
      setCurrentPageInView(prevPage => prevPage !== newPageNumber ? newPageNumber : prevPage);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("authToken")) {
      router.push("/login?message=Please log in to view books");
      return;
    }

    if (bookId) {
      setIsLoading(true);
      setError(null);
      setNumPages(null); 
      let objectUrl: string | null = null; 

      const loadBookData = async () => {
        try {
          const details = await fetchBookDetails(bookId);
          setBookDetails(details);
          const blob = await fetchBookPdfAsBlob(bookId);
          objectUrl = URL.createObjectURL(blob); 
          setPdfFileUrl(objectUrl);
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
          setError(`Failed to load book data: ${errorMessage}`);
          setPdfFileUrl(null);
        } finally {
          setIsLoading(false);
        }
      };
      loadBookData();
    
      return () => {
        if (objectUrl) { 
          URL.revokeObjectURL(objectUrl);
        }
      };
    }
  }, [bookId, router]);

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
      const result: SummarizeResponse = await summarizeTextService(textToSummarize);
      setSummary(result.summary);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to get summary.";
      setSummarizeError(msg);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleExportNotesAsPDF = () => {
    if (!studyNotes || !markdownRef.current) {
        alert("No study notes content available to export or content not rendered.");
        return;
    }

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });

    const title = bookDetails?.title ? `Study Notes - ${bookDetails.title}` : "Study Notes";
    const margin = 40;
    const pageHeight = doc.internal.pageSize.height - (2 * margin);
    const pageWidth = doc.internal.pageSize.width - (2 * margin);
    let yPosition = margin;

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin, yPosition);
    yPosition += 30;

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    
    const elements = Array.from(markdownRef.current.children);
    let currentText = "";

    elements.forEach(el => {
        let text = el.textContent || "";
        let fontSize = 12;
        let fontStyle = "normal";

        if (el.tagName === "H1") { fontSize = 16; fontStyle = "bold"; yPosition += 5; }
        else if (el.tagName === "H2") { fontSize = 14; fontStyle = "bold"; yPosition += 4;}
        else if (el.tagName === "H3") { fontSize = 13; fontStyle = "bold"; yPosition += 3;}
        else if (el.tagName === "P") { yPosition += 2; }
        else if (el.tagName === "UL" || el.tagName === "OL") { yPosition += 5; }
        
        if (el.tagName.match(/^H[1-6]$/)) {
            doc.setFontSize(fontSize);
            doc.setFont("helvetica", fontStyle);
            currentText = text;
        } else if (el.tagName === "LI") {
            currentText = `- ${text}`;
        } else {
            doc.setFontSize(12);
            doc.setFont("helvetica", "normal");
            currentText = text;
        }

        const splitText = doc.splitTextToSize(currentText, pageWidth);

        splitText.forEach((line: string) => {
            if (yPosition > pageHeight) {
                doc.addPage();
                yPosition = margin;
            }
            doc.text(line, margin, yPosition);
            yPosition += (fontSize * 1.2);
        });
        if (el.tagName.match(/^H[1-6]$/)) yPosition += 5;
    });
    
    doc.save(`${bookDetails?.title || "StudyNotes"}.pdf`);
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
    setFlippedCards({});
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
      const result: StudyNotesApiResponse = await generateStudyNotesService(textToGenerateFrom);
      setStudyNotes(result.study_notes);
      if (!result.study_notes) { 
        setStudyNotesError("The AI could not generate study notes from the selected text.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate study notes.";
      setStudyNotesError(msg);
    } finally {
      setIsGeneratingStudyNotes(false);
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
      const result: QnAApiResponse = await generateQnAService(textToGenerateFrom);
      setQnaPairs(result.qna_pairs);
      if (!result.qna_pairs || result.qna_pairs.length === 0) {
        setQnaError("No Q&A pairs could be generated from the selected text.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate Q&A pairs.";
      setQnaError(msg);
    } finally {
      setIsGeneratingQnA(false);
    }
  };

  const handleContextMenuAction = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const currentSelectedText = window.getSelection()?.toString().trim() || "";
    if (currentSelectedText) {
      setContextMenu({ visible: true, x: event.clientX, y: event.clientY, selectedTextContent: currentSelectedText });
    } else {
      setContextMenu((prev) => ({ ...prev, visible: false }));
    }
  }, []);

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

  const onDocumentLoadSuccess = useCallback(({ numPages: nextNumPages }: { numPages: number }) => {
    setNumPages(nextNumPages);
  }, []);

  const calculatedPageWidth = Math.min(typeof window !== "undefined" ? window.innerWidth * 0.92 : 800, 800); 
  const pagePlaceholderHeight = calculatedPageWidth * 1.41; 

  const pageLoadingIndicator = useMemo(() => (
    <div style={{ width: calculatedPageWidth, height: pagePlaceholderHeight }} className="flex items-center justify-center bg-slate-200/70 dark:bg-slate-700/70 text-slate-500 dark:text-slate-400 rounded-md animate-pulse">
      Loading page...
    </div>
  ), [calculatedPageWidth, pagePlaceholderHeight]);   

  if (isLoading) return (
    <div 
        className="flex min-h-screen flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 transition-colors duration-500" 
        style={{ backgroundImage: `var(--dot-pattern-url, ${lightModeDotPatternUrl})` }}
    >
        <GlobalStyles />
        <SpinnerIcon className="h-12 w-12 text-orange-500" />
        <p className="text-lg text-slate-600 dark:text-slate-300 mt-4">Loading book...</p>
    </div>
  );
  if (error) return (
    <div 
        className="flex min-h-screen flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 transition-colors duration-500 p-6" 
        style={{ backgroundImage: `var(--dot-pattern-url, ${lightModeDotPatternUrl})` }}
    >
        <GlobalStyles />
        <p className="text-lg text-red-500 dark:text-red-400 mb-6 text-center">{error}</p>
        <Link href="/dashboard" className="flex items-center px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-medium rounded-lg shadow-md hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-2 ring-offset-2 dark:ring-offset-slate-900 ring-red-500 transition-all">
            <ChevronLeftIcon className="w-5 h-5 mr-1.5" /> Back to Dashboard
        </Link>
    </div>
);
  if (!bookDetails || !pdfFileUrl) return (
    <div 
        className="flex min-h-screen flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 transition-colors duration-500 p-6" 
        style={{ backgroundImage: `var(--dot-pattern-url, ${lightModeDotPatternUrl})` }}
    >
        <GlobalStyles />
        <p className="text-lg text-slate-600 dark:text-slate-400 mb-6 text-center">Book data could not be loaded or PDF is unavailable.</p>
        <Link href="/dashboard" className="flex items-center px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-medium rounded-lg shadow-md hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-2 ring-offset-2 dark:ring-offset-slate-900 ring-red-500 transition-all">
            <ChevronLeftIcon className="w-5 h-5 mr-1.5" /> Back to Dashboard
        </Link>
    </div>
);

  return (
    <div 
      className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col items-center p-3 sm:p-4 lg:p-6" 
      onClick={closeContextMenu}
      style={{ backgroundImage: `var(--dot-pattern-url, ${lightModeDotPatternUrl})` }}
    >
      <GlobalStyles />
      <div className="w-full max-w-7xl mx-auto flex flex-row gap-6">
        
        {/* <<< 3. UPDATE THE LEFT PANEL WIDTH AND ADD CHAT COMPONENT >>> */}
        <aside className="w-96 min-w-[22rem] max-w-sm h-fit sticky top-6 self-start space-y-6">
            
            {/* AI Mentor Panel */}
            <BookMentorChat bookId={bookId} ChatIcon={ChatBubbleOvalLeftEllipsisIcon} />

            {/* Glossary Panel */}
            <div className="bg-white/80 dark:bg-slate-800/80 rounded-xl shadow-md p-4 border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-3 pb-3 border-b border-slate-300 dark:border-slate-700 flex items-center gap-2">
                    <BookOpenHeroIcon className="w-6 h-6 text-orange-500" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
                        Glossary
                    </span>
                    <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-auto">
                        Page {currentPageInView}
                    </span>
                </h3>
                {/* Glossary Height reduced to accommodate Chat Mentor */}
                <div className="max-h-[25vh] overflow-y-auto pr-2">
                    {isGlossaryLoading && ( <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-sm"><SpinnerIcon className="w-5 h-5 text-orange-500" /> Loading...</div> )}
                    {glossaryError && ( <p className="text-red-500 dark:text-red-400 text-sm">Error: {glossaryError.message}</p> )}
                    {!isGlossaryLoading && glossaryData && glossaryData.length > 0 && (
                        <ul className="space-y-4">
                        {glossaryData.map((entry, idx) => (
                            <li key={idx}>
                            <p className="font-semibold text-slate-700 dark:text-slate-200">{entry.term}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{entry.definition}</p>
                            <p className="text-right text-xs text-slate-400 dark:text-slate-500 mt-1 capitalize">({entry.source})</p>
                            </li>
                        ))}
                        </ul>
                    )}
                    {!isGlossaryLoading && !glossaryError && (!glossaryData || glossaryData.length === 0) && ( <p className="text-slate-500 dark:text-slate-400 text-sm">No key terms found on this page.</p> )}
                </div>
            </div>

            {/* --- MODIFICATION: QUIZ PANEL --- */}
            <div className="bg-white/80 dark:bg-slate-800/80 rounded-xl shadow-md p-4 border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-3 pb-3 border-b border-slate-300 dark:border-slate-700 flex items-center gap-2">
                    <BeakerIcon className="w-6 h-6 text-orange-500" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
                        Test Your Knowledge
                    </span>
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Generate a quiz from the book's content to check your understanding.
                </p>
                <Link 
                    href={`/books/${bookId}/quiz`}
                    className="w-full flex items-center justify-center px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-medium rounded-lg shadow-md hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-2 ring-offset-2 dark:ring-offset-slate-900 ring-red-500 transition-all"
                >
                    Start Quiz
                </Link>
            </div>
        </aside>

        {/* Book Viewer (Right) */}
        <div className="flex-1 min-w-0">
          <div className="mb-4">
            <Link href="/dashboard" className="inline-flex items-center text-orange-600 dark:text-orange-400 hover:text-red-600 dark:hover:text-red-500 transition-colors group text-sm font-medium">
              <ChevronLeftIcon className="w-5 h-5 mr-1 transition-transform group-hover:-translate-x-0.5" />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-2 truncate" title={bookDetails.title}>
              {bookDetails.title}
            </h1>
          </div>
          <div ref={scrollContainerRef} className="rounded-lg shadow-xl overflow-y-auto max-h-[calc(100vh-10rem)] border border-slate-300 dark:border-slate-700" onContextMenu={handleContextMenuAction} onClick={(e) => e.stopPropagation()}>
            <Document 
                file={pdfFileUrl} 
                onLoadSuccess={onDocumentLoadSuccess} 
                onLoadError={(pdfError) => { console.error("PDF Load Error object:", pdfError); setError(`Failed to load PDF: ${pdfError.message || "Unknown PDF loading error"}`); }} 
                loading={<div className="text-center p-10">Loading document...</div>}
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
                    <div key={`page_wrapper_${index + 1}`} className="flex justify-center py-1.5 my-0.5">
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
          {contextMenu.visible && (
            <div
              style={{ top: contextMenu.y, left: contextMenu.x, position: 'fixed' }}
              className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-slate-300 dark:border-slate-600 rounded-lg shadow-2xl py-1.5 z-[100] w-72" 
              onClick={(e) => e.stopPropagation()}
            >
              {[
                { label: "Summarize", icon: DocumentTextIcon, action: () => handleRequestSummary(contextMenu.selectedTextContent), shortTextLength: 30 },
                { label: "Generate Flashcards", icon: LayersIcon, action: () => handleRequestFlashcards(contextMenu.selectedTextContent), shortTextLength: 25 },
                { label: "Generate Study Notes", icon: LightBulbIcon, action: () => handleRequestStudyNotes(contextMenu.selectedTextContent), shortTextLength: 22 },
                { label: "Generate Q&A", icon: QuestionMarkCircleIcon, action: () => handleRequestQnA(contextMenu.selectedTextContent), shortTextLength: 28 },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={() => { item.action(); closeContextMenu(); }}
                  className="w-full text-left px-3.5 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-orange-100 dark:hover:bg-orange-700/30 hover:text-orange-700 dark:hover:text-orange-300 flex items-center space-x-3 transition-colors rounded-md"
                >
                  <item.icon className="w-5 h-5 flex-shrink-0 text-orange-500 dark:text-orange-400 opacity-90" />
                  <span className="truncate">
                    {item.label}: &quot;{contextMenu.selectedTextContent.substring(0, item.shortTextLength)}
                    {contextMenu.selectedTextContent.length > item.shortTextLength ? "..." : ""}&quot;
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Modals */}
          <Modal
            isOpen={showSummaryModal}
            onClose={() => setShowSummaryModal(false)}
            title={summarizeError ? "Summarization Error" : isSummarizing ? "Generating Summary..." : summary ? "Generated Summary" : "Summary"}
          >
            {isSummarizing && <div className="text-center py-4"><SpinnerIcon className="w-8 h-8 text-orange-500 mx-auto mb-2" /><p className="text-slate-600 dark:text-slate-300">Please wait, AI is processing...</p></div>}
            {summarizeError && <p className="text-red-500 dark:text-red-400 p-2 text-sm">{summarizeError}</p>}
            {summary && !isSummarizing && <div className="max-h-[60vh] overflow-y-auto p-1 text-sm"><p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap font-sans">{summary}</p></div>}
            {!isSummarizing && !summary && !summarizeError && <p className="text-slate-500 dark:text-slate-400">No summary details to display.</p>}
          </Modal>

          <Modal
            isOpen={showFlashcardsModal}
            onClose={() => setShowFlashcardsModal(false)}
            title={
              flashcardsError
                ? "Flashcard Error"
                : isGeneratingFlashcards
                ? "Generating Flashcards..."
                : flashcards && flashcards.length > 0
                ? "Generated Flashcards"
                : "Flashcards"
            }
          >
            <div className="bg-white/80 dark:bg-slate-800/70 rounded-xl p-4 backdrop-blur-sm">
              {isGeneratingFlashcards && (
                <div className="text-center py-4">
                  <SpinnerIcon className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                  <p className="text-slate-600 dark:text-slate-300">
                    Please wait, AI is creating flashcards...
                  </p>
                </div>
              )}

              {flashcardsError && (
                <p className="text-red-500 dark:text-red-400 p-2 text-sm">
                  {flashcardsError}
                </p>
              )}

              {!isGeneratingFlashcards && flashcards && flashcards.length > 0 && (
                <div className="max-h-[70vh] overflow-y-auto p-2 space-y-4">
                  {flashcards.map((card, index) => {
                    const isFlipped = flippedCards[index];
                    return (
                      <div
                        key={index}
                        className="flip-container w-full h-40 sm:h-44 md:h-48 lg:h-52 xl:h-56"
                      >
                        <div 
                            className="learn-ease-card"
                            style={{width: "100%", height: "100%", position: "relative"}}
                        >
                            <div className={`flip-inner ${isFlipped ? "flipped" : ""}`}>
                                {/* Front */}
                                <div className="flip-front p-4 bg-white/70 dark:bg-slate-700/60 flex flex-col justify-between">
                                    <div>
                                        <p className="font-semibold text-orange-600 dark:text-orange-400 mb-1 text-xs uppercase tracking-wider">Front:</p>
                                        <p className="text-slate-800 dark:text-slate-200 text-sm sm:text-base leading-relaxed overflow-y-auto max-h-[calc(100%-2.5rem)]">{card.front}</p>
                                    </div>
                                    <button
                                        onClick={() => toggleFlip(index)}
                                        className="mt-auto self-start text-xs bg-orange-500 hover:bg-orange-600 text-white py-1.5 px-3.5 rounded-md shadow-sm transition-colors"
                                    >
                                        Flip to Back
                                    </button>
                                </div>

                                {/* Back */}
                                <div className="flip-back p-4 bg-white/70 dark:bg-slate-700/60 flex flex-col justify-between">
                                    <div>
                                        <p className="font-semibold text-orange-600 dark:text-orange-400 mb-1 text-xs uppercase tracking-wider">Back:</p>
                                        <p className="text-slate-800 dark:text-slate-200 text-sm sm:text-base leading-relaxed overflow-y-auto max-h-[calc(100%-2.5rem)]">{card.back}</p>
                                    </div>
                                    <button
                                        onClick={() => toggleFlip(index)}
                                        className="mt-auto self-start text-xs bg-orange-500 hover:bg-orange-600 text-white py-1.5 px-3.5 rounded-md shadow-sm transition-colors"
                                    >
                                        Flip to Front
                                    </button>
                                </div>
                            </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {!isGeneratingFlashcards &&
                !flashcardsError &&
                (!flashcards || flashcards.length === 0) && (
                  <p className="text-slate-500 dark:text-slate-400 p-2">
                    No flashcards to display.
                  </p>
                )}
            </div>
          </Modal>

          <Modal
            isOpen={showStudyNotesModal}
            onClose={() => setShowStudyNotesModal(false)}
            title={studyNotesError ? "Study Notes Error" : isGeneratingStudyNotes ? "Generating Study Notes..." : studyNotes ? "Generated Study Notes" : "Study Notes"}
          >
            {isGeneratingStudyNotes && (
              <div className="text-center py-4">
                <SpinnerIcon className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                <p className="text-slate-600 dark:text-slate-300">Please wait, AI is creating study notes...</p>
              </div>
            )}
            {studyNotesError && (
              <p className="text-red-500 dark:text-red-400 p-2 text-sm">{studyNotesError}</p>
            )}
            {!isGeneratingStudyNotes && studyNotes && (
              <>
                <div ref={markdownRef} className="max-h-[60vh] overflow-y-auto p-1 text-sm prose dark:prose-invert prose-headings:text-slate-800 dark:prose-headings:text-slate-100 prose-p:text-slate-700 dark:prose-p:text-slate-300 prose-ul:text-slate-700 dark:prose-ul:text-slate-300 prose-li:text-slate-700 dark:prose-li:text-slate-300 prose-strong:text-slate-800 dark:prose-strong:text-slate-200">
                  <ReactMarkdown>{studyNotes}</ReactMarkdown>
                </div>
                <div className="flex justify-end mt-4 pt-4 border-t border-slate-300 dark:border-slate-700">
                    <button
                    onClick={handleExportNotesAsPDF}
                    className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-md shadow-sm transition-colors"
                    >
                    Export Notes as PDF
                    </button>
                </div>
              </>
            )}
            {!isGeneratingStudyNotes && !studyNotesError && !studyNotes && (
               <p className="text-slate-500 dark:text-slate-400 p-2">No study notes to display.</p>
            )}
          </Modal>

          <Modal
            isOpen={showQnAModal}
            onClose={() => setShowQnAModal(false)}
            title={qnaError ? "Q&A Generation Error" : isGeneratingQnA ? "Generating Q&A..." : qnaPairs && qnaPairs.length > 0 ? "Generated Questions & Answers" : "Questions & Answers"}
          >
            {isGeneratingQnA && (
              <div className="text-center py-4">
                <SpinnerIcon className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                <p className="text-slate-600 dark:text-slate-300">Please wait, AI is generating questions and answers...</p>
              </div>
            )}
            {qnaError && (
              <p className="text-red-500 dark:text-red-400 p-2 text-sm">{qnaError}</p>
            )}
            {!isGeneratingQnA && qnaPairs && qnaPairs.length > 0 && (
              <div className="max-h-[70vh] overflow-y-auto p-1 space-y-4 text-sm">
                {qnaPairs.map((pair, index) => (
                  <div key={index} className="p-3 bg-slate-100/50 dark:bg-slate-700/50 rounded-md shadow-sm">
                    <p className="font-semibold text-orange-600 dark:text-orange-400 mb-1">Question {index + 1}:</p>
                    <p className="text-slate-800 dark:text-slate-200 mb-2">{pair.question}</p>
                    <p className="font-semibold text-sky-600 dark:text-sky-400 mb-1">Answer:</p>
                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans">{pair.answer}</p>
                  </div>
                ))}
              </div>
            )}
            {!isGeneratingQnA && !qnaError && (!qnaPairs || qnaPairs.length === 0) && (
               <p className="text-slate-500 dark:text-slate-400 p-2">No questions and answers to display.</p>
            )}
          </Modal>
        </div>
      </div>
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